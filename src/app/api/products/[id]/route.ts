import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const result = await query(`
            SELECT
                p.*,
                s.name        AS store_name,
                s.logo_url    AS store_logo,
                s.description AS store_description,
                pr.username   AS store_username,
                COALESCE(
                    (SELECT ROUND(AVG(r.rating)::numeric, 1)
                     FROM product_reviews r WHERE r.product_id = p.id),
                0) AS avg_rating,
                COALESCE(
                    (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id),
                0) AS reviews_count,
                COALESCE(
                    (SELECT COUNT(*) FROM orders o
                     WHERE o.product_id = p.id AND o.status != 'cancelled'),
                0) AS sales_count
            FROM products p
            JOIN stores s ON s.id = p.store_id
            JOIN profiles pr ON pr.id = s.owner_id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
        }

        const row = result.rows[0];
        const product = {
            id:               row.id,
            name:             row.name,
            description:      row.description,
            price:            parseFloat(String(row.price || 0)),
            old_price:        row.old_price ? parseFloat(String(row.old_price)) : null,
            stock:            row.stock ?? 0,
            category:         row.category,
            images:           row.images || [],
            variants:         row.variants || null,
            colors:           row.colors || null,
            sizes:            row.sizes || null,
            avg_rating:       parseFloat(String(row.avg_rating || 0)),
            reviews_count:    parseInt(String(row.reviews_count || 0)),
            sales_count:      parseInt(String(row.sales_count || 0)),
            created_at:       row.created_at,
            store: {
                id:          row.store_id,
                name:        row.store_name,
                logo_url:    row.store_logo,
                description: row.store_description,
                username:    row.store_username,
            },
        };

        return NextResponse.json({ product });
    } catch (error) {
        console.error("GET /api/products/[id]:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
