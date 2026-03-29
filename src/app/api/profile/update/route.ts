import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const RESERVED = ["admin", "shopcrat", "shop", "loja", "store", "api", "feed", "login",
    "register", "checkout", "profile", "settings", "search", "merchant", "product"];

function isValidUsername(u: string) {
    return /^[a-z0-9_]{3,30}$/.test(u);
}

// PATCH /api/profile/update — update name, username, avatar_url
export async function PATCH(req: NextRequest) {
    try {
        const user    = await requireAuth(req);
        const body    = await req.json();
        const { full_name, username, avatar_url } = body;

        const updates: string[] = [];
        const params: any[]     = [];

        if (full_name !== undefined) {
            if (!full_name.trim()) return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
            params.push(full_name.trim());
            updates.push(`full_name = $${params.length}`);
        }

        if (username !== undefined) {
            const u = username.toLowerCase().trim();
            if (!isValidUsername(u)) {
                return NextResponse.json({
                    error: "Username inválido. Use apenas letras minúsculas, números e _ (3–30 caracteres)"
                }, { status: 400 });
            }
            if (RESERVED.includes(u)) {
                return NextResponse.json({ error: "Este username é reservado" }, { status: 400 });
            }
            // Check uniqueness
            const existing = await query(
                "SELECT id FROM profiles WHERE username = $1 AND id != $2",
                [u, user.id]
            );
            if (existing.rows.length > 0) {
                return NextResponse.json({ error: "Username já está em uso" }, { status: 409 });
            }
            params.push(u);
            updates.push(`username = $${params.length}`);
            updates.push(`username_updated_at = NOW()`);
        }

        if (avatar_url !== undefined) {
            params.push(avatar_url);
            updates.push(`avatar_url = $${params.length}`);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        params.push(user.id);
        const result = await query(
            `UPDATE profiles SET ${updates.join(", ")}, updated_at = NOW()
             WHERE id = $${params.length}
             RETURNING id, username, full_name, avatar_url, role`,
            params
        );

        return NextResponse.json({ profile: result.rows[0] });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        console.error("PATCH /api/profile/update:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
