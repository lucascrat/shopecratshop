import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureWallet } from "@/lib/admin";

// GET - Get merchant wallet info
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        const wallet = await ensureWallet(user.id);

        // Get recent transactions
        const transactions = await query(
            `SELECT * FROM wallet_transactions
            WHERE wallet_id = $1
            ORDER BY created_at DESC
            LIMIT 20`,
            [wallet.id]
        );

        // Get pending withdrawals
        const pendingWithdrawals = await query(
            `SELECT * FROM withdrawal_requests
            WHERE merchant_id = $1 AND status IN ('pending', 'processing')
            ORDER BY created_at DESC`,
            [user.id]
        );

        return NextResponse.json({
            wallet,
            transactions: transactions.rows,
            pendingWithdrawals: pendingWithdrawals.rows,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

// PUT - Update PIX key
export async function PUT(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { pixKey, pixKeyType } = body;

        if (!pixKey || !pixKeyType) {
            return NextResponse.json({ error: "Chave PIX e tipo são obrigatórios" }, { status: 400 });
        }

        const wallet = await ensureWallet(user.id);

        await query(
            `UPDATE wallets SET pix_key = $1, pix_key_type = $2, updated_at = NOW() WHERE id = $3`,
            [pixKey, pixKeyType, wallet.id]
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}
