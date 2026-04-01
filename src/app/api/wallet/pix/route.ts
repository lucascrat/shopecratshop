import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureWallet } from "@/lib/admin";

// PATCH - Update PIX key for merchant wallet
export async function PATCH(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { pixKey, pixKeyType } = body;

        if (!pixKey || !pixKeyType) {
            return NextResponse.json({ error: "Chave PIX e tipo são obrigatórios" }, { status: 400 });
        }

        const validTypes = ["cpf", "cnpj", "email", "phone", "random"];
        if (!validTypes.includes(pixKeyType)) {
            return NextResponse.json({ error: "Tipo de chave PIX inválido" }, { status: 400 });
        }

        const wallet = await ensureWallet(user.id);

        await query(
            `UPDATE wallets SET pix_key = $1, pix_key_type = $2, updated_at = NOW() WHERE id = $3`,
            [pixKey, pixKeyType, wallet.id]
        );

        return NextResponse.json({
            success: true,
            pixKey,
            pixKeyType,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
