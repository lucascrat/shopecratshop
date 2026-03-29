import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - fetch merchant's store info
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        const { rows } = await query(
            "SELECT id, name, description, logo_url FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        return NextResponse.json({ store: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

// PATCH - update store info (name, description, logo_url)
export async function PATCH(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { name, description, logoUrl } = body;

        const storeCheck = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (storeCheck.rows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined && name.trim()) {
            params.push(name.trim());
            updates.push(`name = $${params.length}`);
        }
        if (description !== undefined) {
            params.push(description);
            updates.push(`description = $${params.length}`);
        }
        if (logoUrl !== undefined) {
            params.push(logoUrl);
            updates.push(`logo_url = $${params.length}`);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        params.push(user.id);
        const { rows } = await query(
            `UPDATE stores SET ${updates.join(", ")} WHERE merchant_id = $${params.length} RETURNING id, name, description, logo_url`,
            params
        );

        return NextResponse.json({ store: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
