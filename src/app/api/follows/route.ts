import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/follows — list stores the user follows
// GET /api/follows?storeId=xxx — check if following a specific store
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");

        if (storeId) {
            const { rows } = await query(
                "SELECT id FROM store_follows WHERE user_id = $1 AND store_id = $2",
                [user.id, storeId]
            );
            return NextResponse.json({ following: rows.length > 0 });
        }

        // Return all followed stores with store info
        const { rows } = await query(
            `SELECT sf.id, sf.store_id, sf.created_at,
                    s.name as store_name, s.logo_url, s.username as store_username,
                    s.description as store_description
             FROM store_follows sf
             JOIN stores s ON sf.store_id = s.id
             WHERE sf.user_id = $1
             ORDER BY sf.created_at DESC`,
            [user.id]
        );

        return NextResponse.json({ follows: rows });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: "Erro ao buscar seguidos" }, { status: 500 });
    }
}

// POST /api/follows — follow a store
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { storeId } = await request.json();

        if (!storeId) {
            return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
        }

        // Upsert (ignore if already following)
        await query(
            "INSERT INTO store_follows (user_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [user.id, storeId]
        );

        return NextResponse.json({ following: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: "Erro ao seguir loja" }, { status: 500 });
    }
}

// DELETE /api/follows?storeId=xxx — unfollow a store
export async function DELETE(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");

        if (!storeId) {
            return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
        }

        await query(
            "DELETE FROM store_follows WHERE user_id = $1 AND store_id = $2",
            [user.id, storeId]
        );

        return NextResponse.json({ following: false });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: "Erro ao deixar de seguir" }, { status: 500 });
    }
}
