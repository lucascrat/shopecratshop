import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        // Parallel queries to see what's actually in the DB
        const [
            orders,
            withdrawals,
            wallets,
            transactions,
            paymentTx,
            profiles
        ] = await Promise.all([
            query(`SELECT id, status, payment_status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5`),
            query(`SELECT id, merchant_id, amount, status, created_at FROM withdrawal_requests ORDER BY created_at DESC LIMIT 5`),
            query(`SELECT id, merchant_id, balance, total_received FROM wallets ORDER BY total_received DESC LIMIT 5`),
            query(`SELECT id, wallet_id, type, amount, status FROM wallet_transactions ORDER BY created_at DESC LIMIT 5`),
            query(`SELECT id, order_id, status, amount, efi_txid FROM payment_transactions ORDER BY created_at DESC LIMIT 5`),
            query(`SELECT id, username, email, role FROM profiles WHERE username = 'holanda' OR role = 'admin'`),
        ]);

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            orders: orders.rows,
            withdrawals: withdrawals.rows,
            wallets: wallets.rows,
            transactions: transactions.rows,
            payment_transactions: paymentTx.rows,
            profiles: profiles.rows,
            summary: {
                totalOrders: orders.rowCount,
                anyConfirmed: orders.rows.some(o => o.status === 'confirmed'),
                anyPaid: orders.rows.some(o => o.payment_status === 'paid'),
                hasAdmin: profiles.rows.length > 0
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
