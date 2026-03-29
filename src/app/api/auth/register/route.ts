import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const { email, password, fullName, regType, storeName } = await request.json();

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
        }

        if (regType === "merchant" && !storeName) {
            return NextResponse.json({ error: "Nome da loja é obrigatório para vendedores" }, { status: 400 });
        }

        // Check if email already exists
        const existing = await client.query("SELECT id FROM profiles WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: "Este email já está cadastrado" }, { status: 409 });
        }

        await client.query("BEGIN");

        const passwordHash = await hashPassword(password);
        const username = fullName.toLowerCase().replace(/\s+/g, "_") + Math.floor(Math.random() * 1000);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`;
        const role = regType === "merchant" ? "merchant" : "customer";

        const { rows: profileRows } = await client.query(
            `INSERT INTO profiles (username, full_name, avatar_url, role, email, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, avatar_url, role, email`,
            [username, fullName, avatarUrl, role, email, passwordHash]
        );

        const profile = profileRows[0];

        // Create store if merchant
        if (regType === "merchant") {
            await client.query(
                `INSERT INTO stores (merchant_id, name, description) VALUES ($1, $2, $3)`,
                [profile.id, storeName, `Bem-vindo à ${storeName}!`]
            );
        }

        await client.query("COMMIT");

        const token = signToken({ id: profile.id, email: profile.email, role: profile.role });

        return NextResponse.json({ token, profile });
    } catch (error: unknown) {
        await client.query("ROLLBACK");
        const message = error instanceof Error ? error.message : String(error);
        console.error("Register error:", message);
        return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
    } finally {
        client.release();
    }
}
