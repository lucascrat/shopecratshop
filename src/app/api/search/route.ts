import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q") || "";
        const category = searchParams.get("category") || "";

        // If no search query, return featured content
        if (!q) {
            const [storesRes, productsRes] = await Promise.all([
                query(
                    `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
                     FROM stores s
                     JOIN profiles p ON s.merchant_id = p.id
                     LIMIT 6`
                ),
                query(
                    `SELECT id, name, price, images, category
                     FROM products
                     ORDER BY created_at DESC
                     LIMIT 8`
                ),
            ]);

            return NextResponse.json({
                stores: storesRes.rows,
                products: productsRes.rows,
            });
        }

        // Search with query
        let productsSql = `SELECT id, name, price, images, category FROM products WHERE name ILIKE $1`;
        const productsParams: any[] = [`%${q}%`];

        if (category && category !== "Todos") {
            productsSql += ` AND category = $2`;
            productsParams.push(category);
        }

        productsSql += " ORDER BY created_at DESC LIMIT 20";

        const [productsRes, storesRes] = await Promise.all([
            query(productsSql, productsParams),
            query(
                `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
                 FROM stores s
                 JOIN profiles p ON s.merchant_id = p.id
                 WHERE s.name ILIKE $1
                 LIMIT 10`,
                [`%${q}%`]
            ),
        ]);

        return NextResponse.json({
            stores: storesRes.rows,
            products: productsRes.rows,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Search error:", message);
        return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
    }
}
