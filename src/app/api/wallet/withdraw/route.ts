import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureWallet } from "@/lib/admin";

// POST - Request withdrawal
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { amount } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
        }

        const wallet = await ensureWallet(user.id);

        if (!wallet.pix_key) {
            return NextResponse.json(
                { error: "Configure sua chave PIX antes de solicitar saque" },
                { status: 400 }
            );
        }

        if (parseFloat(wallet.balance) < amount) {
            return NextResponse.json(
                { error: "Saldo insuficiente" },
                { status: 400 }
            );
        }

        // Check for pending withdrawals
        const pending = await query(
            `SELECT COUNT(*) as count FROM withdrawal_requests
            WHERE merchant_id = $1 AND status IN ('pending', 'processing')`,
            [user.id]
        );

        if (parseInt(pending.rows[0].count) > 0) {
            return NextResponse.json(
                { error: "Você já possui uma solicitação de saque pendente" },
                { status: 400 }
            );
        }

        // Determine method: automatic if >= R$100, manual otherwise
        const method = amount >= 100 ? "automatic" : "manual";

        await query("BEGIN", []);

        try {
            // Debit wallet
            await query(
                `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
                [amount, wallet.id]
            );

            // Create withdrawal request
            await query(
                `INSERT INTO withdrawal_requests (wallet_id, merchant_id, amount, pix_key, pix_key_type, method, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                [wallet.id, user.id, amount, wallet.pix_key, wallet.pix_key_type, method]
            );

            // Create wallet transaction
            await query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
                VALUES ($1, 'withdrawal', $2, $3, 'pending')`,
                [wallet.id, amount, `Solicitação de saque via PIX (${method === "automatic" ? "automático" : "manual"})`]
            );

            await query("COMMIT", []);

            return NextResponse.json({
                success: true,
                method,
                message: method === "automatic"
                    ? "Saque automático via API Efi em processamento"
                    : "Saque manual solicitado. O admin processará em até 24h",
            });
        } catch (err) {
            await query("ROLLBACK", []);
            throw err;
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
