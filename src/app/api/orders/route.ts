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

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { productId, storeId, quantity, total, paymentMethod, shippingAddress } = await request.json();

        if (!productId || !storeId || !quantity || !total) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const { rows } = await query(
            `INSERT INTO orders (user_id, product_id, store_id, quantity, total, status, payment_method, shipping_address)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
             RETURNING *`,
            [user.id, productId, storeId, quantity, total, paymentMethod, shippingAddress]
        );

        return NextResponse.json({ order: rows[0] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Orders POST error:", message);
        return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
    }
}
