import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const merchantId = searchParams.get("merchantId");
        const username = searchParams.get("username");
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "20");

        // Get store by merchant ID
        if (merchantId) {
            const { rows } = await query(
                "SELECT * FROM stores WHERE merchant_id = $1",
                [merchantId]
            );
            if (rows.length === 0) {
                return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
            }
            return NextResponse.json({ store: rows[0] });
        }

        // Get store by username (store's own username OR profile username fallback)
        if (username) {
            // Try store's own username first
            let storeRows = (await query(
                `SELECT s.*, p.username as profile_username
                 FROM stores s JOIN profiles p ON s.merchant_id = p.id
                 WHERE s.username = $1`,
                [username]
            )).rows;

            // Fallback: look up by profile username
            if (storeRows.length === 0) {
                const profileRows = (await query(
                    "SELECT id, username FROM profiles WHERE username = $1",
                    [username]
                )).rows;
                if (profileRows.length > 0) {
                    storeRows = (await query(
                        "SELECT * FROM stores WHERE merchant_id = $1",
                        [profileRows[0].id]
                    )).rows;
                }
            }

            if (storeRows.length === 0) {
                return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
            }

            const store = storeRows[0];
            const storeUsername = store.username || username;

            const [productsRes, videosRes] = await Promise.all([
                query(
                    `SELECT id, name, price, old_price, images, description, stock,
                            avg_rating, reviews_count
                     FROM products WHERE store_id = $1 ORDER BY created_at DESC`,
                    [store.id]
                ),
                query("SELECT * FROM videos WHERE store_id = $1 ORDER BY created_at DESC", [store.id]),
            ]);

            return NextResponse.json({
                store: { ...store, username: storeUsername },
                products: productsRes.rows,
                videos: videosRes.rows,
            });
        }

        // Search stores
        if (search) {
            const { rows } = await query(
                `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
                 FROM stores s
                 JOIN profiles p ON s.merchant_id = p.id
                 WHERE s.name ILIKE $1
                 LIMIT $2`,
                [`%${search}%`, limit]
            );
            return NextResponse.json({ stores: rows });
        }

        // Default: list stores
        const { rows } = await query(
            `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
             FROM stores s
             JOIN profiles p ON s.merchant_id = p.id
             LIMIT $1`,
            [limit]
        );

        return NextResponse.json({ stores: rows });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Stores error:", message);
        return NextResponse.json({ error: "Erro ao buscar lojas" }, { status: 500 });
    }
}
