import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { creditWallet, getPlatformSetting } from "@/lib/admin";

// POST - Efi Bank webhook for PIX payment confirmation.
//
// Authentication: Efi posts here with a shared token, either as a URL query
// param (?token=...) or in the X-Webhook-Token header. The token is stored
// in platform_settings (`efi_webhook_token`) or the EFI_WEBHOOK_TOKEN env var.
// Register the webhook URL at Efi with `?token=<secret>` appended.
//
// Additional guards per transaction:
//   - txid must exist in our payment_transactions table
//   - valor in the Efi payload must match our stored order total
//
// Note: even if the token check is bypassed (misconfiguration), the txid +
// amount guards prevent arbitrary credit injection — an attacker would have
// to guess a real txid and its exact value.
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const urlToken    = url.searchParams.get("token");
        const headerToken = request.headers.get("x-webhook-token");
        const provided    = urlToken || headerToken;

        const expected = (await getPlatformSetting("efi_webhook_token")) || process.env.EFI_WEBHOOK_TOKEN || "";
        if (!expected) {
            console.error("[Webhook] efi_webhook_token not configured — rejecting all webhooks");
            return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
        }
        if (!provided || provided !== expected) {
            console.warn("[Webhook] token inválido ou ausente — rejeitando");
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const pixArray = body.pix || [];

        for (const pix of pixArray) {
            const txid = pix.txid;
            if (!txid) continue;

            const txResult = await query(
                `SELECT pt.*, o.store_id, o.total,
                    s.merchant_id
                 FROM payment_transactions pt
                 JOIN orders o ON pt.order_id = o.id
                 JOIN stores s ON o.store_id = s.id
                 WHERE pt.efi_txid = $1 AND pt.status != 'paid'`,
                [txid]
            );

            if (txResult.rows.length === 0) continue;

            const tx = txResult.rows[0];

            // Amount-match guard: Efi sends `valor` as a string like "10.00".
            // Our stored amount is the charge amount (subtotal + fees). Reject if they diverge.
            if (pix.valor != null) {
                const paidValue     = parseFloat(String(pix.valor));
                const expectedValue = parseFloat(String(tx.amount));
                if (Math.abs(paidValue - expectedValue) > 0.01) {
                    console.warn(
                        `[Webhook] valor divergente: txid=${txid} esperado=${expectedValue} recebido=${paidValue} — ignorando`
                    );
                    continue;
                }
            }

            // Atomic transition — only one handler (webhook or status poll) wins.
            const updateResult = await query(
                `UPDATE payment_transactions
                 SET status = 'paid', paid_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status != 'paid'
                 RETURNING id`,
                [tx.id]
            );

            if (updateResult.rows.length === 0) continue;

            await query(
                "UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1",
                [tx.order_id]
            );

            await creditWallet(tx.merchant_id, tx.order_id, parseFloat(tx.total));

            console.log(`[Webhook] PIX confirmado: txid=${txid} order=${tx.order_id}`);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Webhook error:", err);
        // Return 200 to prevent Efi retries on unexpected errors
        return NextResponse.json({ success: false, error: err.message });
    }
}
