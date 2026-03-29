import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { rows } = await query(
            `SELECT r.*, p.username, p.name as user_name, p.avatar_url
             FROM product_reviews r
             JOIN profiles p ON r.user_id = p.id
             WHERE r.product_id = $1
             ORDER BY r.created_at DESC`,
            [id]
        );

        const total = rows.length;
        const avg = total > 0
            ? rows.reduce((s: number, r: any) => s + r.rating, 0) / total
            : 0;

        const dist = [5, 4, 3, 2, 1].map(star => ({
            star,
            count: rows.filter((r: any) => r.rating === star).length,
        }));

        return NextResponse.json({
            reviews: rows,
            stats: { total, avg: Math.round(avg * 10) / 10, distribution: dist },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { rating, text, images, video_url, order_id } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Nota inválida (1-5)" }, { status: 400 });
        }

        // Check duplicate
        const { rows: exists } = await query(
            "SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2",
            [id, user.id]
        );
        if (exists.length > 0) {
            return NextResponse.json({ error: "Você já avaliou este produto" }, { status: 409 });
        }

        const { rows } = await query(
            `INSERT INTO product_reviews (product_id, user_id, order_id, rating, text, images, video_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, user.id, order_id || null, rating, text || null,
             JSON.stringify(images || []), video_url || null]
        );

        return NextResponse.json({ review: rows[0] }, { status: 201 });
    } catch (e: any) {
        if (e.code === "23505") {
            return NextResponse.json({ error: "Você já avaliou este produto" }, { status: 409 });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
