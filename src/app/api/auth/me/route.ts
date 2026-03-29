import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const authUser = requireAuth(request);

        // Join profiles + auth to get email too
        const { rows } = await query(
            `SELECT p.id, p.username, p.full_name, p.avatar_url, p.role, p.created_at,
                    a.email
             FROM profiles p
             JOIN auth a ON a.profile_id = p.id
             WHERE p.id = $1`,
            [authUser.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
        }

        return NextResponse.json({ profile: rows[0] });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Me error:", message);
        return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
    }
}
