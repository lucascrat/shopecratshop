import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, creditWallet } from "@/lib/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = 20;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: any[] = [];

        if (status && status !== "all") {
            params.push(status);
            conditions.push(`o.status = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(pr.full_name ILIKE $${params.length} OR pr.username ILIKE $${params.length} OR p.name ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [ordersResult, countResult] = await Promise.all([
            query(`
                SELECT o.*,
                    p.name as product_name,
                    p.images as product_images,
                    pr.full_name as customer_name,
                    pr.username as customer_username,
                    pr.avatar_url as customer_avatar,
                    s.name as store_name,
                    spr.full_name as merchant_name
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN profiles pr ON o.user_id = pr.id
                LEFT JOIN stores s ON o.store_id = s.id
                LEFT JOIN profiles spr ON s.merchant_id = spr.id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `, [...params, limit, offset]),
            query(`
                SELECT COUNT(*) as count FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN profiles pr ON o.user_id = pr.id
                LEFT JOIN stores s ON o.store_id = s.id
                ${whereClause}
            `, params),
        ]);

        return NextResponse.json({
            orders: ordersResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

// Update order status
export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin(request);

        const body = await request.json();
        const { orderId, status, paymentStatus } = body;

        if (!orderId) {
            return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (status) {
            params.push(status);
            updates.push(`status = $${params.length}`);
        }

        if (paymentStatus) {
            params.push(paymentStatus);
            updates.push(`payment_status = $${params.length}`);

            // If payment confirmed, credit merchant wallet (only if not already paid)
            if (paymentStatus === "paid") {
                const orderData = await query(
                    `SELECT o.*, s.merchant_id FROM orders o
                    JOIN stores s ON o.store_id = s.id
                    WHERE o.id = $1`,
                    [orderId]
                );
                if (orderData.rows[0]) {
                    const order = orderData.rows[0];
                    // Guard: skip if already paid to prevent double-crediting
                    if (order.payment_status !== "paid") {
                        await creditWallet(order.merchant_id, orderId, parseFloat(order.total));
                    }
                }
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        params.push(orderId);
        await query(
            `UPDATE orders SET ${updates.join(", ")} WHERE id = $${params.length}`,
            params
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
