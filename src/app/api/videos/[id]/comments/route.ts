import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest, requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: videoId } = await params;

        const { rows } = await query(
            `SELECT c.id, c.content, c.created_at, c.user_id,
                    p.username, p.avatar_url
             FROM comments c
             JOIN profiles p ON c.user_id = p.id
             WHERE c.video_id = $1
             ORDER BY c.created_at DESC
             LIMIT 50`,
            [videoId]
        );

        const comments = rows.map((r: any) => ({
            id: r.id,
            video_id: videoId,
            user_id: r.user_id,
            content: r.content,
            created_at: r.created_at,
            profile: {
                username: r.username,
                avatar_url: r.avatar_url,
            },
        }));

        return NextResponse.json({ comments });
    } catch (error: unknown) {
        console.error("Get comments error:", error);
        return NextResponse.json({ comments: [] });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = requireAuth(request);
        const { id: videoId } = await params;
        const { content } = await request.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "Comentário não pode estar vazio" }, { status: 400 });
        }

        const { rows } = await query(
            `INSERT INTO comments (video_id, user_id, content) VALUES ($1, $2, $3)
             RETURNING id, video_id, user_id, content, created_at`,
            [videoId, user.id, content.trim()]
        );

        // Get profile info
        const { rows: profileRows } = await query(
            "SELECT username, avatar_url FROM profiles WHERE id = $1",
            [user.id]
        );

        const comment = {
            ...rows[0],
            profile: profileRows[0] || { username: "unknown", avatar_url: null },
        };

        return NextResponse.json({ comment });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Add comment error:", message);
        return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
    }
}
