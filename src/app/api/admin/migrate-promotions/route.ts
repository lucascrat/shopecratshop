import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);

        await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2) DEFAULT NULL`, []);
        await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_start TIMESTAMPTZ DEFAULT NULL`, []);
        await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_end TIMESTAMPTZ DEFAULT NULL`, []);
        await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_label VARCHAR(50) DEFAULT NULL`, []);

        return NextResponse.json({ success: true, message: "Colunas de promoção adicionadas com sucesso." });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
