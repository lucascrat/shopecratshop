import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkPixPayment } from "@/lib/efi";
import { creditWallet } from "@/lib/admin";

// GET - Check PIX payment status
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");

        if (!orderId) {
            return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
        }

        // Get payment transaction
        const txResult = await query(
            `SELECT pt.*, o.store_id, o.total, o.payment_status,
                s.merchant_id
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            JOIN stores s ON o.store_id = s.id
            WHERE pt.order_id = $1 AND pt.method = 'pix'
            ORDER BY pt.created_at DESC LIMIT 1`,
            [orderId]
        );

        if (txResult.rows.length === 0) {
            return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
        }

        const tx = txResult.rows[0];

        // If already paid, return immediately
        if (tx.status === "paid" || tx.payment_status === "paid") {
            return NextResponse.json({ paid: true, status: "paid" });
        }

        // Check with Efi API
        if (!tx.efi_txid) {
            return NextResponse.json({ paid: false, status: tx.status });
        }

        const pixStatus = await checkPixPayment(tx.efi_txid);

        if (pixStatus.paid && tx.status !== "paid") {
            // Update payment transaction
            await query(
                `UPDATE payment_transactions SET status = 'paid', paid_at = NOW(), updated_at = NOW()
                WHERE id = $1`,
                [tx.id]
            );

            // Update order
            await query(
                "UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1",
                [orderId]
            );

            // Credit merchant wallet
            await creditWallet(tx.merchant_id, orderId, parseFloat(tx.total));

            return NextResponse.json({ paid: true, status: "paid" });
        }

        return NextResponse.json({
            paid: false,
            status: pixStatus.status,
        });
    } catch (err: any) {
        console.error("PIX status check error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
