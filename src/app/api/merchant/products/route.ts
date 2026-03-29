import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - list merchant's own products
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        // Get merchant's store
        const storeResult = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        if (storeResult.rows.length === 0) {
            return NextResponse.json({ products: [] });
        }

        const storeId = storeResult.rows[0].id;

        const { rows } = await query(
            `SELECT p.*,
                (SELECT COUNT(*) FROM orders WHERE product_id = p.id AND status != 'cancelled') as sales_count
            FROM products p
            WHERE p.store_id = $1
            ORDER BY p.created_at DESC`,
            [storeId]
        );

        return NextResponse.json({ products: rows, storeId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

// PATCH - update product (price, stock, old_price, payment options)
export async function PATCH(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const body = await request.json();
        const { productId, price, oldPrice, stock, name, description, acceptPix, acceptCard, acceptPayOnDelivery, acceptStorePickup } = body;

        if (!productId) {
            return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
        }

        // Ensure the product belongs to this merchant
        const ownerCheck = await query(
            `SELECT p.id FROM products p
            JOIN stores s ON p.store_id = s.id
            WHERE p.id = $1 AND s.merchant_id = $2`,
            [productId, user.id]
        );

        if (ownerCheck.rows.length === 0) {
            return NextResponse.json({ error: "Produto não encontrado ou sem permissão" }, { status: 403 });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (price !== undefined) {
            params.push(parseFloat(price));
            updates.push(`price = $${params.length}`);
        }
        if (oldPrice !== undefined) {
            params.push(oldPrice === null ? null : parseFloat(oldPrice));
            updates.push(`old_price = $${params.length}`);
        }
        if (stock !== undefined) {
            params.push(parseInt(stock));
            updates.push(`stock = $${params.length}`);
        }
        if (name !== undefined) {
            params.push(name);
            updates.push(`name = $${params.length}`);
        }
        if (description !== undefined) {
            params.push(description);
            updates.push(`description = $${params.length}`);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        params.push(productId);
        const { rows } = await query(
            `UPDATE products SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
            params
        );

        // Update store_settings if payment options were passed
        if (acceptPix !== undefined || acceptCard !== undefined || acceptPayOnDelivery !== undefined || acceptStorePickup !== undefined) {
            const storeResult = await query(
                "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
                [user.id]
            );
            if (storeResult.rows.length > 0) {
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
            }
        }

        return NextResponse.json({ product: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

// DELETE - remove product
export async function DELETE(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("id");

        if (!productId) {
            return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
        }

        const ownerCheck = await query(
            `SELECT p.id FROM products p
            JOIN stores s ON p.store_id = s.id
            WHERE p.id = $1 AND s.merchant_id = $2`,
            [productId, user.id]
        );

        if (ownerCheck.rows.length === 0) {
            return NextResponse.json({ error: "Produto não encontrado ou sem permissão" }, { status: 403 });
        }

        await query("DELETE FROM products WHERE id = $1", [productId]);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
