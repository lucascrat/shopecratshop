import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET - Get all platform settings
export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const result = await query(
            "SELECT key, value, description, updated_at FROM platform_settings ORDER BY key"
        );

        // Group settings
        const settings: Record<string, any> = {};
        const cardFees: Record<string, string> = {};

        for (const row of result.rows) {
            if (row.key.startsWith("card_fee_")) {
                const installment = row.key.replace("card_fee_", "");
                cardFees[installment] = row.value;
            } else {
                settings[row.key] = row.value;
            }
        }

        return NextResponse.json({ settings, cardFees });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

// PUT - Update platform settings
export async function PUT(request: NextRequest) {
    try {
        const admin = await requireAdmin(request);
        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== "object") {
            return NextResponse.json({ error: "settings é obrigatório" }, { status: 400 });
        }

        for (const [key, value] of Object.entries(settings)) {
            await query(
                `INSERT INTO platform_settings (key, value, updated_at, updated_by)
                VALUES ($1, $2, NOW(), $3)
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3`,
                [key, String(value), admin.id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
