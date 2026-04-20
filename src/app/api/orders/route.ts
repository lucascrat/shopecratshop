import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");

        if (storeId) {
            // Merchant: get orders for their store
            const { rows } = await query(
                `SELECT o.id, o.total, o.status, o.created_at, o.quantity,
                        p.name as product_name, p.images as product_images
                 FROM orders o
                 JOIN products p ON o.product_id = p.id
                 WHERE o.store_id = $1
                 ORDER BY o.created_at DESC`,
                [storeId]
            );
            return NextResponse.json({ orders: rows });
        }

        // Customer: get their orders
        const { rows } = await query(
            `SELECT o.id, o.total, o.status, o.created_at, o.quantity,
                    p.name as product_name, p.images as product_images
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC
             LIMIT 10`,
            [user.id]
        );

        return NextResponse.json({ orders: rows });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Orders GET error:", message);
        return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
    }
}

const ALLOWED_PAYMENT_METHODS = ["pix", "card", "pay_on_delivery", "store_pickup"] as const;
type PaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const {
            productId,
            quantity: qtyIn,
            paymentMethod,
            installments: instIn,
            shippingAddress,
            clientRef,
        } = await request.json();

        if (!productId || !paymentMethod) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }
        if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
            return NextResponse.json({ error: "Método de pagamento inválido" }, { status: 400 });
        }

        const quantity = Math.max(1, parseInt(String(qtyIn || 1)));
        const installments = Math.max(1, Math.min(12, parseInt(String(instIn || 1))));

        // Idempotency: if the client provided a ref and we already have an order
        // for this user with it, return the existing order.
        if (clientRef) {
            const existing = await query(
                `SELECT * FROM orders WHERE user_id = $1 AND client_ref = $2 LIMIT 1`,
                [user.id, clientRef]
            );
            if (existing.rows.length > 0) {
                return NextResponse.json({ order: existing.rows[0] });
            }
        }

        // Load authoritative product + store data
        const productResult = await query(
            `SELECT p.id, p.store_id, p.price, p.promo_price, p.promo_start, p.promo_end, p.stock,
                    ss.delivery_fee AS store_delivery_fee, ss.free_delivery_above
             FROM products p
             LEFT JOIN store_settings ss ON ss.store_id = p.store_id
             WHERE p.id = $1`,
            [productId]
        );

        if (productResult.rows.length === 0) {
            return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
        }
        const product = productResult.rows[0];

        if (product.stock < quantity) {
            return NextResponse.json({ error: "Estoque insuficiente" }, { status: 400 });
        }

        // Compute unit price: honour active promo window
        const now = new Date();
        const promoActive = !!(
            product.promo_price &&
            (!product.promo_start || new Date(product.promo_start) <= now) &&
            (!product.promo_end || new Date(product.promo_end) >= now)
        );
        const unitPrice = promoActive ? parseFloat(product.promo_price) : parseFloat(product.price);
        const subtotal = Math.round(unitPrice * quantity * 100) / 100;

        // Delivery fee (per-store if configured, else R$5.00). Store_pickup is always free.
        let deliveryFee = 0;
        if (paymentMethod !== "store_pickup") {
            const storeFee = product.store_delivery_fee != null ? parseFloat(product.store_delivery_fee) : 5.0;
            const freeAbove = product.free_delivery_above != null ? parseFloat(product.free_delivery_above) : null;
            deliveryFee = freeAbove != null && subtotal >= freeAbove ? 0 : storeFee;
        }

        // Card installment fee, computed server-side from platform_settings
        let cardFee = 0;
        if (paymentMethod === "card" && installments > 1) {
            const feeRow = await query(
                `SELECT value FROM platform_settings WHERE key = $1`,
                [`card_fee_${installments}x`]
            );
            const feePct = feeRow.rows[0] ? parseFloat(feeRow.rows[0].value) : 0;
            cardFee = Math.round((subtotal + deliveryFee) * (feePct / 100) * 100) / 100;
        }

        const total = Math.round((subtotal + deliveryFee + cardFee) * 100) / 100;

        const { rows } = await query(
            `INSERT INTO orders
                (user_id, product_id, store_id, quantity, subtotal, delivery_fee, total,
                 status, payment_status, payment_method, shipping_address, client_ref)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending', $8, $9, $10)
             RETURNING *`,
            [
                user.id, product.id, product.store_id, quantity,
                subtotal, deliveryFee, total,
                paymentMethod, shippingAddress || null, clientRef || null,
            ]
        );

        return NextResponse.json({
            order: {
                ...rows[0],
                subtotal,
                delivery_fee: deliveryFee,
                card_fee: cardFee,
                total,
                installments,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        // Duplicate client_ref race
        if (message.includes("duplicate key") && message.includes("client_ref")) {
            return NextResponse.json({ error: "Pedido duplicado" }, { status: 409 });
        }
        console.error("Orders POST error:", message);
        return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
    }
}
