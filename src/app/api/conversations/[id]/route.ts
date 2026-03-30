import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// Helper: verify user can access this conversation
async function verifyAccess(conversationId: string, userId: string) {
    // Check if user is the conversation owner or the store merchant
    const { rows } = await query(
        `SELECT c.id, c.user_id, c.store_id,
                s.merchant_id
         FROM conversations c
         JOIN stores s ON c.store_id = s.id
         WHERE c.id = $1`,
        [conversationId]
    );

    if (rows.length === 0) return null;
    const conv = rows[0];

    const isUser     = conv.user_id === userId;
    const isMerchant = conv.merchant_id === userId;

    if (!isUser && !isMerchant) return null;
    return { ...conv, isUser, isMerchant };
}

// GET /api/conversations/[id] — get conversation + messages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
        const { id } = await params;

        const conv = await verifyAccess(id, user.id);
        if (!conv) {
            return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
        }

        // Mark messages as read
        if (conv.isUser) {
            await query(
                "UPDATE conversations SET unread_user = 0 WHERE id = $1",
                [id]
            );
        } else {
            await query(
                "UPDATE conversations SET unread_store = 0 WHERE id = $1",
                [id]
            );
        }

        // Get messages
        const { rows: messages } = await query(
            `SELECT m.id, m.content, m.created_at, m.sender_id,
                    p.username as sender_username, p.full_name as sender_name, p.avatar_url as sender_avatar
             FROM messages m
             JOIN profiles p ON m.sender_id = p.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT 100`,
            [id]
        );

        // Get store info
        const { rows: storeRows } = await query(
            "SELECT id, name, logo_url, username FROM stores WHERE id = $1",
            [conv.store_id]
        );

        // Get user info
        const { rows: userRows } = await query(
            "SELECT id, username, full_name, avatar_url FROM profiles WHERE id = $1",
            [conv.user_id]
        );

        return NextResponse.json({
            conversation: {
                id:          conv.id,
                user_id:     conv.user_id,
                store_id:    conv.store_id,
                is_user:     conv.isUser,
                is_merchant: conv.isMerchant,
            },
            store:    storeRows[0] || null,
            customer: userRows[0] || null,
            messages,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Conversation GET error:", message);
        return NextResponse.json({ error: "Erro ao buscar conversa" }, { status: 500 });
    }
}

// POST /api/conversations/[id] — send a message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
        const { id } = await params;
        const { content } = await request.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
        }

        const conv = await verifyAccess(id, user.id);
        if (!conv) {
            return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
        }

        // Insert message
        const { rows: msgRows } = await query(
            `INSERT INTO messages (conversation_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, created_at, sender_id`,
            [id, user.id, content.trim()]
        );

        const newMsg = msgRows[0];

        // Update conversation last_message + unread for the OTHER party
        if (conv.isUser) {
            // User sent → increment merchant's unread
            await query(
                `UPDATE conversations
                 SET last_message = $1, last_message_at = NOW(), unread_store = unread_store + 1
                 WHERE id = $2`,
                [content.trim().substring(0, 100), id]
            );
        } else {
            // Merchant sent → increment user's unread
            await query(
                `UPDATE conversations
                 SET last_message = $1, last_message_at = NOW(), unread_user = unread_user + 1
                 WHERE id = $2`,
                [content.trim().substring(0, 100), id]
            );
        }

        return NextResponse.json({ message: newMsg });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("Send message error:", message);
        return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }
}
