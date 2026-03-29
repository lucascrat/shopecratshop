import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createPixCharge } from "@/lib/efi";

// POST - Create PIX charge for an order
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
        }

        // Get order details
        const orderResult = await query(
            `SELECT o.*, p.name as product_name, pr.full_name as customer_name
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN profiles pr ON o.user_id = pr.id
            WHERE o.id = $1 AND o.user_id = $2`,
            [orderId, user.id]
        );

        if (orderResult.rows.length === 0) {
            return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
        }

        const order = orderResult.rows[0];

        if (order.payment_status === "paid") {
            return NextResponse.json({ error: "Pedido já está pago" }, { status: 400 });
        }

        // Check if there's already a pending PIX charge
        const existingTx = await query(
            `SELECT * FROM payment_transactions
            WHERE order_id = $1 AND method = 'pix' AND status IN ('pending', 'processing')
            AND pix_expiration > NOW()`,
            [orderId]
        );

        if (existingTx.rows.length > 0) {
            // Return existing charge
            const tx = existingTx.rows[0];
            return NextResponse.json({
                txid: tx.efi_txid,
                chargeId: tx.efi_charge_id,
                qrcode: tx.pix_qrcode,
                copyPaste: tx.pix_copy_paste,
                expiresAt: tx.pix_expiration,
                amount: parseFloat(tx.amount),
            });
        }

        // Create new PIX charge
        const amount = parseFloat(order.total);
        const description = `Pedido #${orderId.substring(0, 8)} - ${order.product_name}`;

        const pixResult = await createPixCharge(
            orderId,
            amount,
            description,
            order.customer_name
        );

        // Save payment transaction
        await query(
            `INSERT INTO payment_transactions
            (order_id, method, amount, status, efi_charge_id, efi_txid, pix_qrcode, pix_copy_paste, pix_expiration)
            VALUES ($1, 'pix', $2, 'pending', $3, $4, $5, $6, $7)`,
            [
                orderId,
                amount,
                pixResult.chargeId,
                pixResult.txid,
                pixResult.qrcodePng,
                pixResult.copyPaste,
                pixResult.expiresAt,
            ]
        );

        // Update order payment method
        await query(
            "UPDATE orders SET payment_method = 'pix', payment_status = 'pending' WHERE id = $1",
            [orderId]
        );

        return NextResponse.json(pixResult);
    } catch (err: any) {
        console.error("PIX charge error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
