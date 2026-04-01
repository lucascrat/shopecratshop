import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "all";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = 20;
        const offset = (page - 1) * limit;

        let whereClause = "";
        const params: any[] = [];

        if (status !== "all") {
            params.push(status);
            whereClause = `WHERE wr.status = $${params.length}`;
        }

        const [withdrawalsResult, countResult, statsResult] = await Promise.all([
            query(`
                SELECT wr.*,
                    p.full_name as merchant_name,
                    p.username as merchant_username,
                    p.avatar_url as merchant_avatar,
                    s.name as store_name,
                    w.balance as wallet_balance
                FROM withdrawal_requests wr
                LEFT JOIN profiles p ON wr.merchant_id = p.id
                LEFT JOIN stores s ON s.merchant_id = wr.merchant_id
                LEFT JOIN wallets w ON wr.wallet_id = w.id
                ${whereClause}
                ORDER BY wr.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `, [...params, limit, offset]),
            query(`SELECT COUNT(*) as count FROM withdrawal_requests wr ${whereClause}`, params),
            query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as completed_amount
                FROM withdrawal_requests
            `),
        ]);

        return NextResponse.json({
            withdrawals: withdrawalsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
            stats: statsResult.rows[0],
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

// Process withdrawal (approve/reject)
export async function PATCH(request: NextRequest) {
    try {
        const admin = await requireAdmin(request);

        const body = await request.json();
        const { withdrawalId, action, adminNotes } = body;

        if (!withdrawalId || !action) {
            return NextResponse.json({ error: "withdrawalId e action são obrigatórios" }, { status: 400 });
        }

        if (!["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "action deve ser 'approve' ou 'reject'" }, { status: 400 });
        }

        // Get withdrawal details
        const wr = await query(
            "SELECT * FROM withdrawal_requests WHERE id = $1",
            [withdrawalId]
        );

        if (wr.rows.length === 0) {
            return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
        }

        const withdrawal = wr.rows[0];

        if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
            return NextResponse.json({ error: "Solicitação já foi processada" }, { status: 400 });
        }

        // Check if admin.id is a valid UUID; if not, use NULL for processed_by
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admin.id);
        const processedBy = isValidUuid ? admin.id : null;
        const adminLabel = isValidUuid ? "" : ` [por ${admin.id}]`;

        await query("BEGIN", []);

        try {
            if (action === "approve") {
                // Mark as completed
                await query(
                    `UPDATE withdrawal_requests SET
                        status = 'completed',
                        admin_notes = $1,
                        processed_at = NOW(),
                        processed_by = $2
                    WHERE id = $3`,
                    [(adminNotes || "Pagamento aprovado pelo admin") + adminLabel, processedBy, withdrawalId]
                );

                // Update wallet totals
                await query(
                    `UPDATE wallets SET
                        total_withdrawn = total_withdrawn + $1,
                        updated_at = NOW()
                    WHERE id = $2`,
                    [withdrawal.amount, withdrawal.wallet_id]
                );

                // Create wallet transaction
                await query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
                    VALUES ($1, 'withdrawal', $2, $3, 'completed')`,
                    [withdrawal.wallet_id, withdrawal.amount, `Saque via PIX aprovado - ${adminNotes || ""}${adminLabel}`]
                );
            } else {
                // Reject - return balance to wallet
                await query(
                    `UPDATE withdrawal_requests SET
                        status = 'cancelled',
                        admin_notes = $1,
                        processed_at = NOW(),
                        processed_by = $2
                    WHERE id = $3`,
                    [(adminNotes || "Solicitação rejeitada") + adminLabel, processedBy, withdrawalId]
                );

                // Return balance
                await query(
                    `UPDATE wallets SET
                        balance = balance + $1,
                        updated_at = NOW()
                    WHERE id = $2`,
                    [withdrawal.amount, withdrawal.wallet_id]
                );
            }

            await query("COMMIT", []);
            return NextResponse.json({ success: true });
        } catch (err) {
            await query("ROLLBACK", []);
            throw err;
        }
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
