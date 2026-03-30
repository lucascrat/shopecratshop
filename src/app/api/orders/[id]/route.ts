import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
        const { id } = await params;

        const { rows } = await query(
            `SELECT o.id, o.total, o.status, o.created_at, o.quantity,
                    o.payment_method, o.shipping_address,
                    p.name as product_name, p.images as product_images, p.price as product_price,
                    s.name as store_name
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN stores s ON o.store_id = s.id
             WHERE o.id = $1 AND o.user_id = $2`,
            [id, user.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
        }

        const row = rows[0];
        return NextResponse.json({
            order: {
                id:               row.id,
                total:            parseFloat(row.total),
                status:           row.status,
                created_at:       row.created_at,
                quantity:         row.quantity,
                payment_method:   row.payment_method,
                shipping_address: row.shipping_address,
                store_name:       row.store_name,
                product: {
                    name:   row.product_name,
                    images: row.product_images || [],
                    price:  parseFloat(row.product_price),
                },
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Order GET error:", message);
        return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 });
    }
}
