import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = 20;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE p.role = 'merchant'";
        const params: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (p.full_name ILIKE $${params.length} OR p.username ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
        }

        const [merchantsResult, countResult] = await Promise.all([
            query(`
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.created_at,
                    s.id as store_id, s.name as store_name, s.logo_url as store_logo,
                    COALESCE(w.balance, 0) as wallet_balance,
                    COALESCE(w.total_received, 0) as total_received,
                    COALESCE(w.total_withdrawn, 0) as total_withdrawn,
                    (SELECT COUNT(*) FROM products WHERE store_id = s.id) as total_products,
                    (SELECT COUNT(*) FROM orders WHERE store_id = s.id) as total_orders,
                    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE store_id = s.id AND status != 'cancelled') as total_sales
                FROM profiles p
                LEFT JOIN stores s ON s.merchant_id = p.id
                LEFT JOIN wallets w ON w.merchant_id = p.id
                ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `, [...params, limit, offset]),
            query(`
                SELECT COUNT(*) as count FROM profiles p
                LEFT JOIN stores s ON s.merchant_id = p.id
                ${whereClause}
            `, params),
        ]);

        return NextResponse.json({
            merchants: merchantsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
