import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { email, password, loginType } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
        }

        // Join profiles + auth to get all fields
        const { rows } = await query(
            `SELECT p.id, p.username, p.full_name, p.avatar_url, p.role,
                    a.email, a.password_hash, a.login_type
             FROM auth a
             JOIN profiles p ON p.id = a.profile_id
             WHERE a.email = $1`,
            [email.toLowerCase().trim()]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        const user = rows[0];

        if (!user.password_hash) {
            return NextResponse.json({ error: "Conta sem senha configurada" }, { status: 401 });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        // Admin can login from any type
        if (user.role !== "admin") {
            if (loginType === "merchant" && user.role !== "merchant") {
                return NextResponse.json({ error: "Esta conta não possui perfil de vendedor." }, { status: 403 });
            }
            if (loginType === "user" && user.role === "merchant") {
                return NextResponse.json({ error: "Use a opção 'Sou Vendedor' para entrar." }, { status: 403 });
            }
        }

        const token = signToken({ id: user.id, email: user.email, role: user.role });

        const { password_hash, login_type, ...safeProfile } = user;

        return NextResponse.json({ token, profile: safeProfile });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Login error:", message);
        return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
    }
}
