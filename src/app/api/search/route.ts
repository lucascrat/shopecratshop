import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q") || "";
        const category = searchParams.get("category") || "";
        const sort = searchParams.get("sort") || "";
        const minPrice = searchParams.get("minPrice");
        const maxPrice = searchParams.get("maxPrice");

        // Build ORDER BY clause based on sort param
        function getOrderClause(alias: string = ""): string {
            const prefix = alias ? `${alias}.` : "";
            switch (sort) {
                case "price_asc":
                    return `ORDER BY ${prefix}price ASC`;
                case "price_desc":
                    return `ORDER BY ${prefix}price DESC`;
                case "popular":
                    return `ORDER BY popularity DESC`;
                case "recent":
                default:
                    return `ORDER BY ${prefix}created_at DESC`;
            }
        }

        // If no search query, return featured/trending content
        if (!q) {
            const [storesRes, productsRes] = await Promise.all([
                query(
                    `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
                     FROM stores s
                     JOIN profiles p ON s.merchant_id = p.id
                     LIMIT 6`
                ),
                // Trending products: ordered by popularity (likes + orders)
                (() => {
                    const conditions: string[] = [];
                    const params: any[] = [];
                    let paramIdx = 1;

                    if (category && category !== "Todos") {
                        conditions.push(`pr.category = $${paramIdx}`);
                        params.push(category);
                        paramIdx++;
                    }
                    if (minPrice) {
                        conditions.push(`pr.price >= $${paramIdx}`);
                        params.push(parseFloat(minPrice));
                        paramIdx++;
                    }
                    if (maxPrice) {
                        conditions.push(`pr.price <= $${paramIdx}`);
                        params.push(parseFloat(maxPrice));
                        paramIdx++;
                    }

                    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

                    const orderClause = sort === "price_asc"
                        ? "ORDER BY pr.price ASC"
                        : sort === "price_desc"
                            ? "ORDER BY pr.price DESC"
                            : sort === "recent"
                                ? "ORDER BY pr.created_at DESC"
                                : "ORDER BY popularity DESC";

                    return query(
                        `SELECT
                            pr.id, pr.name, pr.price, pr.images, pr.category,
                            COALESCE(vc.video_count, 0)::int AS video_count,
                            (COALESCE(lc.like_count, 0) + COALESCE(oc.order_count, 0))::int AS popularity
                         FROM products pr
                         LEFT JOIN (
                             SELECT product_id, COUNT(*)::int AS video_count
                             FROM videos
                             WHERE product_id IS NOT NULL
                             GROUP BY product_id
                         ) vc ON vc.product_id = pr.id
                         LEFT JOIN (
                             SELECT v.product_id, COUNT(*)::int AS like_count
                             FROM likes l
                             JOIN videos v ON v.id = l.video_id
                             WHERE v.product_id IS NOT NULL
                             GROUP BY v.product_id
                         ) lc ON lc.product_id = pr.id
                         LEFT JOIN (
                             SELECT product_id, COUNT(*)::int AS order_count
                             FROM orders
                             GROUP BY product_id
                         ) oc ON oc.product_id = pr.id
                         ${whereClause}
                         ${orderClause}
                         LIMIT 12`,
                        params
                    );
                })(),
            ]);

            return NextResponse.json({
                stores: storesRes.rows,
                products: productsRes.rows,
                videos: [],
            });
        }

        // Search with query
        // --- Products search ---
        const productConditions: string[] = [`pr.name ILIKE $1`];
        const productsParams: any[] = [`%${q}%`];
        let paramIdx = 2;

        if (category && category !== "Todos") {
            productConditions.push(`pr.category = $${paramIdx}`);
            productsParams.push(category);
            paramIdx++;
        }
        if (minPrice) {
            productConditions.push(`pr.price >= $${paramIdx}`);
            productsParams.push(parseFloat(minPrice));
            paramIdx++;
        }
        if (maxPrice) {
            productConditions.push(`pr.price <= $${paramIdx}`);
            productsParams.push(parseFloat(maxPrice));
            paramIdx++;
        }

        const productWhere = productConditions.join(" AND ");

        const productOrderClause = sort === "price_asc"
            ? "ORDER BY pr.price ASC"
            : sort === "price_desc"
                ? "ORDER BY pr.price DESC"
                : sort === "popular"
                    ? "ORDER BY popularity DESC"
                    : "ORDER BY pr.created_at DESC";

        const productsSql = `
            SELECT
                pr.id, pr.name, pr.price, pr.images, pr.category,
                COALESCE(vc.video_count, 0)::int AS video_count,
                (COALESCE(lc.like_count, 0) + COALESCE(oc.order_count, 0))::int AS popularity
            FROM products pr
            LEFT JOIN (
                SELECT product_id, COUNT(*)::int AS video_count
                FROM videos
                WHERE product_id IS NOT NULL
                GROUP BY product_id
            ) vc ON vc.product_id = pr.id
            LEFT JOIN (
                SELECT v.product_id, COUNT(*)::int AS like_count
                FROM likes l
                JOIN videos v ON v.id = l.video_id
                WHERE v.product_id IS NOT NULL
                GROUP BY v.product_id
            ) lc ON lc.product_id = pr.id
            LEFT JOIN (
                SELECT product_id, COUNT(*)::int AS order_count
                FROM orders
                GROUP BY product_id
            ) oc ON oc.product_id = pr.id
            WHERE ${productWhere}
            ${productOrderClause}
            LIMIT 20`;

        // --- Videos search (by description) ---
        const videosSql = `
            SELECT
                v.id, v.video_url, v.description, v.product_id, v.created_at,
                pr.name AS product_name, pr.price AS product_price, pr.images AS product_images,
                COALESCE(lc.like_count, 0)::int AS like_count
            FROM videos v
            LEFT JOIN products pr ON pr.id = v.product_id
            LEFT JOIN (
                SELECT video_id, COUNT(*)::int AS like_count
                FROM likes
                GROUP BY video_id
            ) lc ON lc.video_id = v.id
            WHERE v.description ILIKE $1
            ORDER BY lc.like_count DESC, v.created_at DESC
            LIMIT 10`;

        const [productsRes, storesRes, videosRes] = await Promise.all([
            query(productsSql, productsParams),
            query(
                `SELECT s.id, s.name, s.logo_url, p.username, p.avatar_url
                 FROM stores s
                 JOIN profiles p ON s.merchant_id = p.id
                 WHERE s.name ILIKE $1
                 LIMIT 10`,
                [`%${q}%`]
            ),
            query(videosSql, [`%${q}%`]),
        ]);

        return NextResponse.json({
            stores: storesRes.rows,
            products: productsRes.rows,
            videos: videosRes.rows,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Search error:", message);
        return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
    }
}
