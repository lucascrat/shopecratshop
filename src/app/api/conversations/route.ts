import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/conversations — list conversations for current user (or merchant's store)
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);

        // Check if user is a merchant
        const { rows: merchantRows } = await query(
            "SELECT id FROM stores WHERE merchant_id = $1 LIMIT 1",
            [user.id]
        );

        let rows: any[];

        if (merchantRows.length > 0) {
            const storeId = merchantRows[0].id;
            // Merchant sees conversations from customers to their store
            const res = await query(
                `SELECT c.id, c.user_id, c.store_id, c.last_message, c.last_message_at,
                        c.unread_user, c.unread_store, c.created_at,
                        p.username as user_username, p.full_name as user_name, p.avatar_url as user_avatar,
                        s.name as store_name, s.logo_url as store_logo, s.username as store_username
                 FROM conversations c
                 JOIN profiles p ON c.user_id = p.id
                 JOIN stores s ON c.store_id = s.id
                 WHERE c.store_id = $1
                 ORDER BY c.last_message_at DESC NULLS LAST`,
                [storeId]
            );
            rows = res.rows;
        } else {
            // Regular user sees their conversations
            const res = await query(
                `SELECT c.id, c.user_id, c.store_id, c.last_message, c.last_message_at,
                        c.unread_user, c.unread_store, c.created_at,
                        p.username as user_username, p.full_name as user_name, p.avatar_url as user_avatar,
                        s.name as store_name, s.logo_url as store_logo, s.username as store_username
                 FROM conversations c
                 JOIN profiles p ON c.user_id = p.id
                 JOIN stores s ON c.store_id = s.id
                 WHERE c.user_id = $1
                 ORDER BY c.last_message_at DESC NULLS LAST`,
                [user.id]
            );
            rows = res.rows;
        }

        return NextResponse.json({ conversations: rows, isMerchant: merchantRows.length > 0 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Conversations GET error:", message);
        return NextResponse.json({ error: "Erro ao buscar conversas" }, { status: 500 });
    }
}

// POST /api/conversations — start or get existing conversation with a store
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        const { storeId } = await request.json();

        if (!storeId) {
            return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
        }

        // Verify store exists
        const { rows: storeRows } = await query(
            "SELECT id, name, logo_url FROM stores WHERE id = $1",
            [storeId]
        );
        if (storeRows.length === 0) {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        // Get or create conversation
        const { rows } = await query(
            `INSERT INTO conversations (user_id, store_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, store_id) DO NOTHING
             RETURNING *`,
            [user.id, storeId]
        );

        // If already existed, fetch it
        if (rows.length === 0) {
            const { rows: existing } = await query(
                "SELECT * FROM conversations WHERE user_id = $1 AND store_id = $2",
                [user.id, storeId]
            );
            return NextResponse.json({ conversation: existing[0] });
        }

        return NextResponse.json({ conversation: rows[0] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Conversations POST error:", message);
        return NextResponse.json({ error: "Erro ao criar conversa" }, { status: 500 });
    }
}
