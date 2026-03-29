import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get("page")  || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    try {
        const reviews = await query(
            `SELECT r.*, p.username AS reviewer_username, p.full_name AS reviewer_name, p.avatar_url AS reviewer_avatar
             FROM product_reviews r
             JOIN profiles p ON p.id = r.user_id
             WHERE r.product_id = $1
             ORDER BY r.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );
        const total = await query(
            "SELECT COUNT(*) FROM product_reviews WHERE product_id = $1",
            [id]
        );
        const stats = await query(
            "SELECT rating, COUNT(*) as count FROM product_reviews WHERE product_id = $1 GROUP BY rating ORDER BY rating DESC",
            [id]
        );
        const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        for (const row of stats.rows) ratingDist[parseInt(row.rating)] = parseInt(row.count);
        return NextResponse.json({
            reviews: reviews.rows,
            total: parseInt(total.rows[0].count),
            page,
            ratingDistribution: ratingDist,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const user = await requireAuth(req);
        const { rating, text, images, video_url, order_id } = await req.json();
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Avaliação inválida (1-5)" }, { status: 400 });
        }
        const existing = await query(
            "SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2",
            [id, user.id]
        );
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: "Você já avaliou este produto" }, { status: 409 });
        }
        const result = await query(
            `INSERT INTO product_reviews (product_id, user_id, order_id, rating, text, images, video_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [id, user.id, order_id || null, rating, text || "", JSON.stringify(images || []), video_url || null]
        );
        await query(
            `UPDATE products SET
                avg_rating    = (SELECT ROUND(AVG(rating)::numeric,2) FROM product_reviews WHERE product_id=$1),
                reviews_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id=$1)
             WHERE id=$1`,
            [id]
        );
        return NextResponse.json({ review: result.rows[0] }, { status: 201 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        console.error(error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
