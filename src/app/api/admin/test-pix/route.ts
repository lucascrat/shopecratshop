import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendPixTransfer } from "@/lib/efi";

/**
 * POST /api/admin/test-pix
 * Endpoint temporário para testar transferência PIX real.
 * Requer autenticação de admin.
 *
 * Body: { pixKey: string, amount: number, description?: string }
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);

        const body = await request.json();
        const { pixKey, amount, description } = body;

        if (!pixKey) {
            return NextResponse.json({ error: "pixKey é obrigatório" }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "amount inválido" }, { status: 400 });
        }

        const idEnvio = `teste${Date.now()}`;
        const desc = description || `Teste PIX Shopcrat`;

        console.log(`[TEST PIX] Enviando R$ ${amount} para chave: ${pixKey}`);

        const result = await sendPixTransfer(pixKey, "cpf", amount, desc);

        console.log(`[TEST PIX] Sucesso! transferId: ${result.transferId}`);

        return NextResponse.json({
            success: true,
            message: `PIX de R$ ${amount.toFixed(2)} enviado!`,
            transferId: result.transferId,
            status: result.status,
            pixKey,
            amount,
        });
    } catch (err: any) {
        console.error("[TEST PIX] Erro:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
