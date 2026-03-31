import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "0");
        const storeId = searchParams.get("storeId");
        const offset = page * PAGE_SIZE;

        const authUser = getUserFromRequest(request);

        // Build query based on filters
        let videosQuery: string;
        let videosParams: any[];

        if (storeId) {
            videosQuery = `
                SELECT v.id, v.store_id, v.video_url, v.description, v.created_at,
                       s.name as store_name, s.logo_url as store_logo,
                       COALESCE(s.username, p.username) as store_username,
                       p.username as merchant_username, p.avatar_url as merchant_avatar,
                       pr.id as product_id, pr.name as product_name, pr.price as product_price,
                       pr.old_price as product_old_price, pr.images as product_images, pr.category as product_category,
                       v.product_id as video_product_id
                FROM videos v
                JOIN stores s ON v.store_id = s.id
                JOIN profiles p ON s.merchant_id = p.id
                LEFT JOIN products pr ON v.product_id = pr.id
                WHERE v.store_id = $1
                ORDER BY v.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            videosParams = [storeId, PAGE_SIZE + 1, offset];
        } else {
            videosQuery = `
                SELECT v.id, v.store_id, v.video_url, v.description, v.created_at,
                       s.name as store_name, s.logo_url as store_logo,
                       COALESCE(s.username, p.username) as store_username,
                       p.username as merchant_username, p.avatar_url as merchant_avatar,
                       pr.id as product_id, pr.name as product_name, pr.price as product_price,
                       pr.old_price as product_old_price, pr.images as product_images, pr.category as product_category,
                       v.product_id as video_product_id
                FROM videos v
                JOIN stores s ON v.store_id = s.id
                JOIN profiles p ON s.merchant_id = p.id
                LEFT JOIN products pr ON v.product_id = pr.id
                ORDER BY v.created_at DESC
                LIMIT $1 OFFSET $2
            `;
            videosParams = [PAGE_SIZE + 1, offset];
        }

        const { rows: rawVideos } = await query(videosQuery, videosParams);

        const hasMore = rawVideos.length > PAGE_SIZE;
        const videos = rawVideos.slice(0, PAGE_SIZE);

        if (videos.length === 0) {
            return NextResponse.json({ videos: [], hasMore: false });
        }

        const videoIds = videos.map((v: any) => v.id);

        // Get engagement counts
        const [likesRes, commentsRes, bookmarksRes] = await Promise.all([
            query("SELECT video_id, COUNT(*)::int as count FROM likes WHERE video_id = ANY($1) GROUP BY video_id", [videoIds]),
            query("SELECT video_id, COUNT(*)::int as count FROM comments WHERE video_id = ANY($1) GROUP BY video_id", [videoIds]),
            query("SELECT video_id, COUNT(*)::int as count FROM bookmarks WHERE video_id = ANY($1) GROUP BY video_id", [videoIds]),
        ]);

        const likesMap = Object.fromEntries(likesRes.rows.map((r: any) => [r.video_id, r.count]));
        const commentsMap = Object.fromEntries(commentsRes.rows.map((r: any) => [r.video_id, r.count]));
        const bookmarksMap = Object.fromEntries(bookmarksRes.rows.map((r: any) => [r.video_id, r.count]));

        // Get user's likes and bookmarks
        let userLikes = new Set<string>();
        let userBookmarks = new Set<string>();

        if (authUser) {
            const [userLikesRes, userBookmarksRes] = await Promise.all([
                query("SELECT video_id FROM likes WHERE user_id = $1 AND video_id = ANY($2)", [authUser.id, videoIds]),
                query("SELECT video_id FROM bookmarks WHERE user_id = $1 AND video_id = ANY($2)", [authUser.id, videoIds]),
            ]);
            userLikes = new Set(userLikesRes.rows.map((r: any) => r.video_id));
            userBookmarks = new Set(userBookmarksRes.rows.map((r: any) => r.video_id));
        }

        const feedItems = videos.map((v: any) => ({
            id: v.id,
            video_url: v.video_url,
            description: v.description,
            created_at: v.created_at,
            store: {
                id: v.store_id,
                name: v.store_name,
                logo_url: v.store_logo,
                username: v.store_username,
                profiles: {
                    username: v.merchant_username,
                    avatar_url: v.merchant_avatar,
                },
            },
            products: v.video_product_id && v.product_id ? {
                id: v.product_id,
                name: v.product_name,
                price: v.product_price,
                old_price: v.product_old_price,
                images: Array.isArray(v.product_images) ? v.product_images : (v.product_images ? JSON.parse(v.product_images) : []),
                category: v.product_category,
            } : null,
            likes_count: likesMap[v.id] || 0,
            comments_count: commentsMap[v.id] || 0,
            bookmarks_count: bookmarksMap[v.id] || 0,
            is_liked: userLikes.has(v.id),
            is_bookmarked: userBookmarks.has(v.id),
        }));

        return NextResponse.json({ videos: feedItems, hasMore });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Videos error:", message);
        return NextResponse.json({ error: "Erro ao buscar vídeos" }, { status: 500 });
    }
}
