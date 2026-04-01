import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        // Get merchant's store
        const { rows: storeRows } = await query(
            "SELECT id, name, description, logo_url FROM stores WHERE merchant_id = $1",
            [user.id]
        );

        if (storeRows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        const store = storeRows[0];

        // Get all dashboard data in parallel
        const [productsRes, ordersRes, videosRes] = await Promise.all([
            query(
                "SELECT * FROM products WHERE store_id = $1 ORDER BY created_at DESC LIMIT 5",
                [store.id]
            ),
            query(
                "SELECT id, total FROM orders WHERE store_id = $1",
                [store.id]
            ),
            query(
                "SELECT id FROM videos WHERE store_id = $1",
                [store.id]
            ),
        ]);

        const totalSales = ordersRes.rows.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
        const totalOrders = ordersRes.rows.length;
        const totalVideos = videosRes.rows.length;

        return NextResponse.json({
            store,
            products: productsRes.rows,
            totalSales,
            totalOrders,
            totalVideos,
            estimatedViews: totalVideos * 150,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Dashboard error:", message);
        return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 });
    }
}
