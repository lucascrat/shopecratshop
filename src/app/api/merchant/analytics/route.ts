import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        // Get merchant's store
        const { rows: storeRows } = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (storeRows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        const storeId = storeRows[0].id;

        // Run all analytics queries in parallel
        const [dailyRes, topProductsRes, statusRes, totalsRes] = await Promise.all([
            // Daily revenue for last 30 days
            query(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*)::int as orders,
                    COALESCE(SUM(total), 0)::float as revenue
                 FROM orders
                 WHERE store_id = $1
                   AND created_at >= NOW() - INTERVAL '30 days'
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC`,
                [storeId]
            ),

            // Top 5 products by sales count
            query(
                `SELECT p.id, p.name, p.images, p.price,
                        COUNT(o.id)::int as sales_count,
                        COALESCE(SUM(o.total), 0)::float as revenue
                 FROM products p
                 LEFT JOIN orders o ON o.product_id = p.id AND o.store_id = $1
                 WHERE p.store_id = $1
                 GROUP BY p.id, p.name, p.images, p.price
                 ORDER BY sales_count DESC
                 LIMIT 5`,
                [storeId]
            ),

            // Orders by status
            query(
                `SELECT status, COUNT(*)::int as count
                 FROM orders
                 WHERE store_id = $1
                 GROUP BY status`,
                [storeId]
            ),

            // Totals
            query(
                `SELECT
                    COUNT(*)::int as total_orders,
                    COALESCE(SUM(total), 0)::float as total_revenue,
                    COALESCE(AVG(total), 0)::float as avg_order_value
                 FROM orders
                 WHERE store_id = $1`,
                [storeId]
            ),
        ]);

        // Build status breakdown map
        const statusBreakdown: Record<string, number> = {
            pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
        };
        for (const row of statusRes.rows) {
            statusBreakdown[row.status] = row.count;
        }

        const totals = totalsRes.rows[0] || { total_orders: 0, total_revenue: 0, avg_order_value: 0 };

        return NextResponse.json({
            dailySales:      dailyRes.rows,
            topProducts:     topProductsRes.rows,
            statusBreakdown,
            totalRevenue:    totals.total_revenue,
            totalOrders:     totals.total_orders,
            avgOrderValue:   totals.avg_order_value,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Analytics error:", message);
        return NextResponse.json({ error: "Erro ao carregar analytics" }, { status: 500 });
    }
}
