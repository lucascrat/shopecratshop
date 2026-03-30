import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { creditWallet } from "@/lib/admin";

// POST - Efi Bank webhook for PIX payment confirmation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Efi sends webhook with pix array
        const pixArray = body.pix || [];

        for (const pix of pixArray) {
            const txid = pix.txid;
            if (!txid) continue;

            // Find payment transaction by txid
            const txResult = await query(
                `SELECT pt.*, o.store_id, o.total,
                    s.merchant_id
                FROM payment_transactions pt
                JOIN orders o ON pt.order_id = o.id
                JOIN stores s ON o.store_id = s.id
                WHERE pt.efi_txid = $1 AND pt.status != 'paid'`,
                [txid]
            );

            if (txResult.rows.length === 0) continue;

            const tx = txResult.rows[0];

            // Atomic update — only one handler (webhook or status poll) can win this transition
            const updateResult = await query(
                `UPDATE payment_transactions
                 SET status = 'paid', paid_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status != 'paid'
                 RETURNING id`,
                [tx.id]
            );

            if (updateResult.rows.length === 0) {
                // Already processed by a concurrent status poll — skip
                continue;
            }

            // Update order
            await query(
                "UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1",
                [tx.order_id]
            );

            // creditWallet is idempotent — safe even if status poll fires at same moment
            await creditWallet(tx.merchant_id, tx.order_id, parseFloat(tx.total));

            console.log(`[Webhook] PIX payment confirmed: txid=${txid}, order=${tx.order_id}`);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Webhook error:", err);
        // Always return 200 to Efi so it doesn't retry
        return NextResponse.json({ success: false, error: err.message });
    }
}
