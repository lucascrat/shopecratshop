import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createCardCharge } from "@/lib/efi";
import { creditWallet } from "@/lib/admin";

// POST - Process card payment
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const {
            orderId,
            installments,
            paymentToken,
            customer,
            billingAddress,
        } = body;

        if (!orderId || !paymentToken || !customer) {
            return NextResponse.json(
                { error: "orderId, paymentToken e customer são obrigatórios" },
                { status: 400 }
            );
        }

        // Get order
        const orderResult = await query(
            `SELECT o.*, s.merchant_id
            FROM orders o
            JOIN stores s ON o.store_id = s.id
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

        const amount = parseFloat(order.total);
        const numInstallments = installments || 1;

        // Get card fee for this installment
        const feeResult = await query(
            "SELECT value FROM platform_settings WHERE key = $1",
            [`card_fee_${numInstallments}x`]
        );
        const feePercent = feeResult.rows[0]
            ? parseFloat(feeResult.rows[0].value)
            : 0;
        const totalWithFee = amount * (1 + feePercent / 100);

        // Process card payment via Efi
        const cardResult = await createCardCharge(
            orderId,
            totalWithFee,
            numInstallments,
            paymentToken,
            customer,
            billingAddress || {
                street: "Rua Padrão",
                number: "0",
                neighborhood: "Centro",
                city: "São Paulo",
                state: "SP",
                zipcode: "01001000",
            }
        );

        // Save payment transaction
        await query(
            `INSERT INTO payment_transactions
            (order_id, method, amount, status, efi_charge_id, metadata, paid_at)
            VALUES ($1, 'card', $2, $3, $4, $5, $6)`,
            [
                orderId,
                totalWithFee,
                cardResult.status === "approved" ? "paid" : "processing",
                cardResult.chargeId,
                JSON.stringify({
                    installments: numInstallments,
                    fee_percent: feePercent,
                    original_amount: amount,
                }),
                cardResult.status === "approved" ? new Date().toISOString() : null,
            ]
        );

        // Update order
        const isPaid = cardResult.status === "approved";
        await query(
            `UPDATE orders SET
                payment_method = 'card',
                payment_status = $1,
                status = $2
            WHERE id = $3`,
            [
                isPaid ? "paid" : "pending",
                isPaid ? "confirmed" : "pending",
                orderId,
            ]
        );

        // If approved, credit merchant wallet
        if (isPaid) {
            await creditWallet(order.merchant_id, orderId, amount);
        }

        return NextResponse.json({
            success: true,
            chargeId: cardResult.chargeId,
            status: cardResult.status,
            paid: isPaid,
            installments: numInstallments,
            total: totalWithFee,
        });
    } catch (err: any) {
        console.error("Card charge error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
