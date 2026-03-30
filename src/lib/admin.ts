import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "./auth";
import { query } from "./db";

export interface AdminUser {
    id: string;
    email: string;
    role: string;
}

export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
    const user = getUserFromRequest(request);
    if (!user) {
        throw new Error("Não autorizado");
    }
    if (user.role !== "admin") {
        throw new Error("Acesso negado: apenas administradores");
    }
    return user;
}

export function adminError(message: string, status: number = 400) {
    return NextResponse.json({ error: message }, { status });
}

export function formatBRL(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

// Ensure wallet exists for merchant
export async function ensureWallet(merchantId: string) {
    const existing = await query(
        "SELECT id FROM wallets WHERE merchant_id = $1",
        [merchantId]
    );
    if (existing.rows.length === 0) {
        await query(
            "INSERT INTO wallets (merchant_id) VALUES ($1)",
            [merchantId]
        );
    }
    const wallet = await query(
        "SELECT * FROM wallets WHERE merchant_id = $1",
        [merchantId]
    );
    return wallet.rows[0];
}

// Get platform setting value
export async function getPlatformSetting(key: string): Promise<string | null> {
    const result = await query(
        "SELECT value FROM platform_settings WHERE key = $1",
        [key]
    );
    return result.rows[0]?.value || null;
}

// Credit wallet when payment is confirmed (deducts platform fee)
// Idempotent: safe to call multiple times for the same order — only credits once.
export async function creditWallet(merchantId: string, orderId: string, amount: number) {
    const wallet = await ensureWallet(merchantId);

    // Idempotency guard: bail out if this order was already credited
    const existing = await query(
        `SELECT id FROM wallet_transactions WHERE order_id = $1 AND type = 'credit'`,
        [orderId]
    );
    if (existing.rows.length > 0) {
        // Already credited — return without doing anything
        return null;
    }

    // Get platform fee percentage
    const feePercent = parseFloat(await getPlatformSetting("platform_fee_percent") || "3.00");
    const platformFee = Math.round(amount * (feePercent / 100) * 100) / 100;
    const merchantAmount = Math.round((amount - platformFee) * 100) / 100;

    await query("BEGIN", []);
    try {
        // Double-check inside the transaction (race condition guard)
        const existingInTx = await query(
            `SELECT id FROM wallet_transactions WHERE order_id = $1 AND type = 'credit'`,
            [orderId]
        );
        if (existingInTx.rows.length > 0) {
            await query("ROLLBACK", []);
            return null;
        }

        // Update wallet balance (merchant receives amount minus platform fee)
        await query(
            `UPDATE wallets SET
                balance = balance + $1,
                total_received = total_received + $1,
                updated_at = NOW()
            WHERE id = $2`,
            [merchantAmount, wallet.id]
        );

        // Create transaction record
        await query(
            `INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description, status)
            VALUES ($1, $2, 'credit', $3, $4, 'completed')`,
            [wallet.id, orderId, merchantAmount,
                `Pedido #${orderId.substring(0, 8)} — R$ ${amount.toFixed(2)} - taxa ${feePercent}% (R$ ${platformFee.toFixed(2)})`]
        );

        await query("COMMIT", []);

        return { merchantAmount, platformFee, feePercent };
    } catch (err) {
        await query("ROLLBACK", []);
        throw err;
    }
}

// Calculate card installment fees
export async function getCardFees(): Promise<Record<string, number>> {
    const result = await query(
        "SELECT key, value FROM platform_settings WHERE key LIKE 'card_fee_%' ORDER BY key"
    );
    const fees: Record<string, number> = {};
    for (const row of result.rows) {
        const installment = row.key.replace("card_fee_", "");
        fees[installment] = parseFloat(row.value);
    }
    return fees;
}
