import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureWallet, getPlatformSetting } from "@/lib/admin";
import { sendPixTransfer } from "@/lib/efi";

// POST - Request withdrawal (automatic PIX transfer via Efi)
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

        // Get withdrawal fee from platform settings
        const withdrawalFeeFixed = parseFloat(await getPlatformSetting("withdrawal_fee_fixed") || "0");
        const netAmount = Math.round((amount - withdrawalFeeFixed) * 100) / 100;

        if (netAmount <= 0) {
            return NextResponse.json(
                { error: `Valor muito baixo. Taxa de saque é R$ ${withdrawalFeeFixed.toFixed(2)}` },
                { status: 400 }
            );
        }

        // ── Step 1: Debit wallet and create records (transaction) ──
        await query("BEGIN", []);

        let withdrawalId: string;

        try {
            // Debit full amount from wallet (includes fee)
            await query(
                `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
                [amount, wallet.id]
            );

            // Create withdrawal request as 'processing'
            const wrResult = await query(
                `INSERT INTO withdrawal_requests (wallet_id, merchant_id, amount, pix_key, pix_key_type, method, status)
                VALUES ($1, $2, $3, $4, $5, 'automatic', 'processing')
                RETURNING id`,
                [wallet.id, user.id, amount, wallet.pix_key, wallet.pix_key_type]
            );
            withdrawalId = wrResult.rows[0].id;

            // Create wallet transaction as 'processing'
            const feeNote = withdrawalFeeFixed > 0
                ? ` (taxa R$ ${withdrawalFeeFixed.toFixed(2)}, enviado R$ ${netAmount.toFixed(2)})`
                : "";
            await query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
                VALUES ($1, 'withdrawal', $2, $3, 'processing')`,
                [wallet.id, amount, `Saque automático via PIX${feeNote}`]
            );

            await query("COMMIT", []);
        } catch (err) {
            await query("ROLLBACK", []);
            throw err;
        }

        // ── Step 2: Send PIX via Efi API (net amount after fee) ──
        try {
            const pixResult = await sendPixTransfer(
                wallet.pix_key,
                wallet.pix_key_type,
                netAmount,
                `Saque Shopcrat #${withdrawalId.substring(0, 8)}`
            );

            // PIX sent successfully — mark as completed
            const feeInfo = withdrawalFeeFixed > 0
                ? ` | Taxa: R$ ${withdrawalFeeFixed.toFixed(2)}`
                : "";
            await query(
                `UPDATE withdrawal_requests SET
                    status = 'completed',
                    admin_notes = $1,
                    processed_at = NOW()
                WHERE id = $2`,
                [`PIX automático enviado R$ ${netAmount.toFixed(2)}. e2eId: ${pixResult.transferId}${feeInfo}`, withdrawalId]
            );

            await query(
                `UPDATE wallets SET total_withdrawn = total_withdrawn + $1, updated_at = NOW()
                WHERE id = $2`,
                [amount, wallet.id]
            );

            await query(
                `UPDATE wallet_transactions SET status = 'completed'
                WHERE wallet_id = $1 AND type = 'withdrawal' AND status = 'processing'
                AND amount = $2`,
                [wallet.id, amount]
            );

            console.log(`[Withdraw] PIX automático: R$ ${amount} (líquido R$ ${netAmount}) → ${wallet.pix_key} (e2eId: ${pixResult.transferId})`);

            const feeMsg = withdrawalFeeFixed > 0
                ? ` (taxa R$ ${withdrawalFeeFixed.toFixed(2)}, líquido R$ ${netAmount.toFixed(2)})`
                : "";

            return NextResponse.json({
                success: true,
                method: "automatic",
                message: `PIX de R$ ${netAmount.toFixed(2)} enviado automaticamente!${feeMsg} O valor cairá na sua conta em instantes.`,
                transferId: pixResult.transferId,
                grossAmount: amount,
                fee: withdrawalFeeFixed,
                netAmount,
            });
        } catch (pixError: any) {
            // PIX failed — refund wallet and mark as failed
            console.error("[Withdraw] Erro no PIX automático:", pixError.message);

            await query(
                `UPDATE withdrawal_requests SET
                    status = 'failed',
                    admin_notes = $1,
                    processed_at = NOW()
                WHERE id = $2`,
                [`Erro no PIX automático: ${pixError.message}`, withdrawalId]
            );

            // Refund full balance
            await query(
                `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
                [amount, wallet.id]
            );

            // Mark transaction as failed
            await query(
                `UPDATE wallet_transactions SET status = 'failed', description = $1
                WHERE wallet_id = $2 AND type = 'withdrawal' AND status = 'processing'
                AND amount = $3`,
                [`Saque falhou: ${pixError.message}`, wallet.id, amount]
            );

            return NextResponse.json({
                success: false,
                error: `Erro ao enviar PIX: ${pixError.message}. Seu saldo foi restaurado.`,
            }, { status: 500 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
