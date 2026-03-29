import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const storeId = searchParams.get("storeId");
        const search = searchParams.get("search");
        const category = searchParams.get("category");
        const limit = parseInt(searchParams.get("limit") || "20");

        if (id) {
            const { rows } = await query(
                `SELECT p.*,
                        s.name as store_name, s.logo_url as store_logo, s.description as store_description,
                        pr_owner.username as store_username,
                        COALESCE(AVG(r.rating), 0)::numeric(3,1) as avg_rating,
                        COUNT(r.id)::int as reviews_count
                 FROM products p
                 JOIN stores s ON p.store_id = s.id
                 JOIN profiles pr_owner ON s.merchant_id = pr_owner.id
                 LEFT JOIN product_reviews r ON r.product_id = p.id
                 WHERE p.id = $1
                 GROUP BY p.id, s.name, s.logo_url, s.description, pr_owner.username`,
                [id]
            );
            if (rows.length === 0) {
                return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
            }
            return NextResponse.json({ product: rows[0] });
        }

        let sql = `SELECT p.*,
                   COALESCE(AVG(r.rating), 0)::numeric(3,1) as avg_rating,
                   COUNT(r.id)::int as reviews_count
                   FROM products p
                   LEFT JOIN product_reviews r ON r.product_id = p.id`;
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (storeId) {
            conditions.push(`p.store_id = $${paramIdx++}`);
            params.push(storeId);
        }

        if (search) {
            conditions.push(`p.name ILIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }

        if (category && category !== "Todos") {
            conditions.push(`p.category = $${paramIdx++}`);
            params.push(category);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT $${paramIdx}`;
        params.push(limit);

        const { rows } = await query(sql, params);
        return NextResponse.json({ products: rows });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Products error:", message);
        return NextResponse.json({ error: "Erro ao buscar produtos" }, { status: 500 });
    }
}
