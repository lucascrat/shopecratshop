import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = requireAuth(request);
        const { id: videoId } = await params;

        const { rows: existing } = await query(
            "SELECT id FROM bookmarks WHERE video_id = $1 AND user_id = $2",
            [videoId, user.id]
        );

        if (existing.length > 0) {
            await query("DELETE FROM bookmarks WHERE id = $1", [existing[0].id]);
            return NextResponse.json({ bookmarked: false });
        } else {
            await query("INSERT INTO bookmarks (video_id, user_id) VALUES ($1, $2)", [videoId, user.id]);
            return NextResponse.json({ bookmarked: true });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Bookmark error:", message);
        return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
    }
}
