import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { email, password, loginType } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
        }

        const { rows } = await query(
            "SELECT id, email, password_hash, username, full_name, avatar_url, role FROM profiles WHERE email = $1",
            [email]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        const profile = rows[0];

        if (!profile.password_hash) {
            return NextResponse.json({ error: "Conta sem senha configurada" }, { status: 401 });
        }

        const valid = await verifyPassword(password, profile.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        // Admin can login from any type; merchants must match
        if (profile.role !== "admin") {
            if (loginType === "merchant" && profile.role !== "merchant") {
                return NextResponse.json({ error: "Esta conta não possui perfil de vendedor." }, { status: 403 });
            }
        }

        const token = signToken({ id: profile.id, email: profile.email, role: profile.role });

        const { password_hash, ...safeProfile } = profile;

        return NextResponse.json({ token, profile: safeProfile });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Login error:", message);
        return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
    }
}
