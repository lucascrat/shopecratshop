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

        const conditions: string[] = [];
        const params: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(v.description ILIKE $${params.length} OR s.name ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [videosResult, countResult] = await Promise.all([
            query(`
                SELECT v.id, v.video_url, v.description, v.created_at,
                    s.id as store_id, s.name as store_name, s.username as store_username, s.logo_url as store_logo,
                    p.id as product_id, p.name as product_name, p.price as product_price,
                    p.images as product_images,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT b.id) as bookmark_count
                FROM videos v
                LEFT JOIN stores s ON v.store_id = s.id
                LEFT JOIN products p ON v.product_id = p.id
                LEFT JOIN likes l ON l.video_id = v.id
                LEFT JOIN bookmarks b ON b.video_id = v.id
                ${whereClause}
                GROUP BY v.id, s.id, p.id
                ORDER BY v.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `, [...params, limit, offset]),
            query(
                `SELECT COUNT(*) as count FROM videos v
                 LEFT JOIN stores s ON v.store_id = s.id
                 LEFT JOIN products p ON v.product_id = p.id
                 ${whereClause}`,
                params
            ),
        ]);

        return NextResponse.json({
            videos: videosResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get("id");

        if (!videoId) {
            return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
        }

        await query(`DELETE FROM videos WHERE id = $1`, [videoId]);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
