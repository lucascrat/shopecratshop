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
                `SELECT p.*, s.name as store_name
                 FROM products p
                 JOIN stores s ON p.store_id = s.id
                 WHERE p.id = $1`,
                [id]
            );
            if (rows.length === 0) {
                return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
            }
            return NextResponse.json({ product: rows[0] });
        }

        let sql = "SELECT * FROM products";
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (storeId) {
            conditions.push(`store_id = $${paramIdx++}`);
            params.push(storeId);
        }

        if (search) {
            conditions.push(`name ILIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }

        if (category && category !== "Todos") {
            conditions.push(`category = $${paramIdx++}`);
            params.push(category);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
        params.push(limit);

        const { rows } = await query(sql, params);
        return NextResponse.json({ products: rows });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Products error:", message);
        return NextResponse.json({ error: "Erro ao buscar produtos" }, { status: 500 });
    }
}
