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

        const conditions = ["p.role = 'customer'"];
        const params: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(p.full_name ILIKE $${params.length} OR p.username ILIKE $${params.length})`);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const [usersResult, countResult] = await Promise.all([
            query(`
                SELECT p.id, p.username, p.full_name, p.avatar_url, p.created_at,
                    COUNT(DISTINCT o.id) as total_orders,
                    COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0) as total_spent
                FROM profiles p
                LEFT JOIN orders o ON o.user_id = p.id
                ${whereClause}
                GROUP BY p.id
                ORDER BY p.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `, [...params, limit, offset]),
            query(
                `SELECT COUNT(*) as count FROM profiles p ${whereClause}`,
                params
            ),
        ]);

        return NextResponse.json({
            users: usersResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
