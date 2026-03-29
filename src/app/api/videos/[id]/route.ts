import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// DELETE /api/videos/[id] — merchant deletes their own video
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
        const { id } = await params;

        // Verify the video belongs to a store owned by this merchant
        const { rows } = await query(
            `SELECT v.id FROM videos v
             JOIN stores s ON v.store_id = s.id
             WHERE v.id = $1 AND s.merchant_id = $2`,
            [id, user.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Vídeo não encontrado ou sem permissão" }, { status: 404 });
        }

        // Delete related records first (likes, comments, bookmarks)
        await query("DELETE FROM likes WHERE video_id = $1", [id]);
        await query("DELETE FROM comments WHERE video_id = $1", [id]);
        await query("DELETE FROM bookmarks WHERE video_id = $1", [id]);
        await query("DELETE FROM videos WHERE id = $1", [id]);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}
