import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - fetch merchant's store payment settings
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        const storeResult = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (storeResult.rows.length === 0) {
            return NextResponse.json({
                settings: {
                    accept_pix: true,
                    accept_card: true,
                    accept_pay_on_delivery: false,
                    accept_store_pickup: false,
                },
            });
        }

        const storeId = storeResult.rows[0].id;

        const { rows } = await query(
            "SELECT accept_pix, accept_card, accept_pay_on_delivery, accept_store_pickup FROM store_settings WHERE store_id = $1",
            [storeId]
        );

        if (rows.length === 0) {
            return NextResponse.json({
                settings: {
                    accept_pix: true,
                    accept_card: true,
                    accept_pay_on_delivery: false,
                    accept_store_pickup: false,
                },
            });
        }

        return NextResponse.json({ settings: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

// PUT - update merchant's store payment settings
export async function PUT(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { acceptPix, acceptCard, acceptPayOnDelivery, acceptStorePickup } = body;

        const storeResult = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (storeResult.rows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        const storeId = storeResult.rows[0].id;

        await query(
            `INSERT INTO store_settings (store_id, accept_pix, accept_card, accept_pay_on_delivery, accept_store_pickup)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (store_id) DO UPDATE SET
                accept_pix = COALESCE($2, store_settings.accept_pix),
                accept_card = COALESCE($3, store_settings.accept_card),
                accept_pay_on_delivery = COALESCE($4, store_settings.accept_pay_on_delivery),
                accept_store_pickup = COALESCE($5, store_settings.accept_store_pickup),
                updated_at = NOW()`,
            [
                storeId,
                acceptPix ?? null,
                acceptCard ?? null,
                acceptPayOnDelivery ?? null,
                acceptStorePickup ?? null,
            ]
        );

        const { rows } = await query(
            "SELECT accept_pix, accept_card, accept_pay_on_delivery, accept_store_pickup FROM store_settings WHERE store_id = $1",
            [storeId]
        );

        return NextResponse.json({ settings: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
