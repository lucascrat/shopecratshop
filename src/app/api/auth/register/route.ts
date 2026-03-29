import { NextRequest, NextResponse } from "next/server";
import { hashPassword, signToken } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const { email, password, fullName, regType, storeName } = await request.json();

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
        }

        if (regType === "merchant" && !storeName) {
            return NextResponse.json({ error: "Nome da loja é obrigatório para vendedores" }, { status: 400 });
        }

        // Check if email already exists in auth table
        const existing = await client.query("SELECT id FROM auth WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: "Este email já está cadastrado" }, { status: 409 });
        }

        await client.query("BEGIN");

        const passwordHash = await hashPassword(password);
        const username = fullName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Math.floor(Math.random() * 9999);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
        const role = regType === "merchant" ? "merchant" : "customer";
        const loginType = regType === "merchant" ? "merchant" : "customer";

        // Insert into profiles (no email/password here)
        const { rows: profileRows } = await client.query(
            `INSERT INTO profiles (username, full_name, avatar_url, role)
             VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, avatar_url, role`,
            [username, fullName, avatarUrl, role]
        );

        const profile = profileRows[0];

        // Insert into auth table
        await client.query(
            `INSERT INTO auth (profile_id, email, password_hash, login_type)
             VALUES ($1, $2, $3, $4)`,
            [profile.id, email.toLowerCase().trim(), passwordHash, loginType]
        );

        // Create store if merchant
        let storeId: string | null = null;
        if (regType === "merchant") {
            const { rows: storeRows } = await client.query(
                `INSERT INTO stores (merchant_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
                [profile.id, storeName, `Bem-vindo à ${storeName}!`]
            );
            storeId = storeRows[0].id;

            // Create wallet for merchant
            await client.query(
                `INSERT INTO wallets (merchant_id) VALUES ($1) ON CONFLICT (merchant_id) DO NOTHING`,
                [profile.id]
            );

            // Create store settings
            if (storeId) {
                await client.query(
                    `INSERT INTO store_settings (store_id) VALUES ($1) ON CONFLICT (store_id) DO NOTHING`,
                    [storeId]
                );
            }
        }

        await client.query("COMMIT");

        const token = signToken({ id: profile.id, email: email.toLowerCase().trim(), role: profile.role });

        return NextResponse.json({
            token,
            profile: { ...profile, email: email.toLowerCase().trim() }
        });

    } catch (error: unknown) {
        await client.query("ROLLBACK").catch(() => {});
        const message = error instanceof Error ? error.message : String(error);
        console.error("Register error:", message);
        return NextResponse.json({ error: "Erro ao criar conta: " + message }, { status: 500 });
    } finally {
        client.release();
    }
}
