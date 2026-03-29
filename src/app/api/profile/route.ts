import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        const [likesRes, bookmarksRes] = await Promise.all([
            query("SELECT COUNT(*)::int as count FROM likes WHERE user_id = $1", [user.id]),
            query("SELECT COUNT(*)::int as count FROM bookmarks WHERE user_id = $1", [user.id]),
        ]);

        return NextResponse.json({
            likesCount: likesRes.rows[0]?.count || 0,
            bookmarksCount: bookmarksRes.rows[0]?.count || 0,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Profile stats error:", message);
        return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 });
    }
}
