import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/bookmarks — list bookmarked videos with video data
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        const { rows } = await query(
            `SELECT b.id as bookmark_id, b.created_at as bookmarked_at,
                    v.id as video_id, v.video_url, v.description,
                    pr.name as product_name, pr.price as product_price, pr.old_price as product_old_price,
                    pr.images as product_images,
                    s.id as store_id, s.name as store_name, s.logo_url as store_logo, s.username as store_username
             FROM bookmarks b
             JOIN videos v ON b.video_id = v.id
             JOIN stores s ON v.store_id = s.id
             LEFT JOIN products pr ON v.product_id = pr.id
             WHERE b.user_id = $1
             ORDER BY b.created_at DESC`,
            [user.id]
        );

        const bookmarks = rows.map((row: any) => {
            // Use first product image as thumbnail fallback
            const images = row.product_images || [];
            const thumb  = Array.isArray(images) ? images[0] : null;

            return {
                id:            row.bookmark_id,
                bookmarked_at: row.bookmarked_at,
                video: {
                    id:            row.video_id,
                    thumbnail_url: thumb,
                    video_url:     row.video_url,
                    product: {
                        name:      row.product_name,
                        price:     row.product_price != null ? parseFloat(row.product_price) : null,
                        old_price: row.product_old_price != null ? parseFloat(row.product_old_price) : null,
                    },
                },
                store: {
                    id:       row.store_id,
                    name:     row.store_name,
                    logo_url: row.store_logo,
                    username: row.store_username,
                },
            };
        });

        return NextResponse.json({ bookmarks });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Bookmarks GET error:", message);
        return NextResponse.json({ error: "Erro ao buscar desejos" }, { status: 500 });
    }
}
