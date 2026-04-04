import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * POST /api/admin/test-pix
 * Teste detalhado de transferência PIX via EFI Bank.
 * Logs completos da resposta e status.
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);

        const body = await request.json();
        const { pixKey, amount, description, action } = body;

        // Lazy-load EFI SDK
        const EfiPay = (await import("sdk-node-apis-efi")).default;

        // Get credentials from env vars directly (bypass DB for reliability)
        const clientId = process.env.EFI_CLIENT_ID || "";
        const clientSecret = process.env.EFI_CLIENT_SECRET || "";
        const sandbox = process.env.EFI_SANDBOX === "true";
        const platformPixKey = process.env.EFI_PIX_KEY || "";

        // Certificate
        const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
        let certPath: string | undefined;
        if (certBase64) {
            certPath = path.join(os.tmpdir(), "efi_cert_test.p12");
            fs.writeFileSync(certPath, Buffer.from(certBase64, "base64"));
        }

        const info = {
            clientId: clientId ? `${clientId.substring(0, 30)}...` : "MISSING",
            sandbox,
            platformPixKey,
            certPath: certPath || "MISSING",
            certSize: certPath && fs.existsSync(certPath) ? fs.statSync(certPath).size : 0,
        };

        console.log("[TEST PIX] Config:", JSON.stringify(info));

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Credenciais EFI não configuradas", info }, { status: 500 });
        }

        const efipay = new EfiPay({
            client_id: clientId,
            client_secret: clientSecret,
            sandbox,
            ...(certPath ? { certificate: certPath } : {}),
        });

        // Action: check - verificar status de uma transferência anterior
        if (action === "check") {
            const { idEnvio: checkId, e2eId: checkE2e } = body;
            try {
                let result;
                if (checkE2e) {
                    result = await efipay.pixSendDetail({ e2eId: checkE2e });
                } else if (checkId) {
                    result = await efipay.pixSendDetailId({ idEnvio: checkId });
                }
                return NextResponse.json({ action: "check", result });
            } catch (err: any) {
                return NextResponse.json({
                    action: "check",
                    error: err.message,
                    efiError: err?.response?.data || null,
                });
            }
        }

        // Action: list - listar envios recentes
        if (action === "list") {
            try {
                const now = new Date();
                const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
                const result = await efipay.pixSendList({
                    inicio: oneHourAgo.toISOString(),
                    fim: now.toISOString(),
                });
                return NextResponse.json({ action: "list", result });
            } catch (err: any) {
                return NextResponse.json({
                    action: "list",
                    error: err.message,
                    efiError: err?.response?.data || null,
                });
            }
        }

        // Action: send (default) - enviar PIX
        if (!pixKey) {
            return NextResponse.json({ error: "pixKey é obrigatório" }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "amount inválido" }, { status: 400 });
        }
        if (!platformPixKey) {
            return NextResponse.json({ error: "EFI_PIX_KEY não configurado" }, { status: 500 });
        }

        const idEnvio = `teste${Date.now()}`;
        const desc = description || "Teste PIX Shopcrat";

        const pixSendBody = {
            valor: amount.toFixed(2),
            pagador: {
                chave: platformPixKey,
                infoPagador: desc,
            },
            favorecido: {
                chave: pixKey,
            },
        };

        console.log("[TEST PIX] Sending:", JSON.stringify({ idEnvio, ...pixSendBody }));

        try {
            const response = await efipay.pixSend({ idEnvio }, pixSendBody);

            console.log("[TEST PIX] Full response:", JSON.stringify(response));

            return NextResponse.json({
                success: true,
                info,
                request: { idEnvio, pixKey, amount: amount.toFixed(2), platformPixKey },
                response,
            });
        } catch (err: any) {
            const efiError = err?.response?.data;
            console.error("[TEST PIX] Full error:", JSON.stringify({
                message: err.message,
                status: err?.response?.status,
                data: efiError,
                headers: err?.response?.headers,
            }));

            return NextResponse.json({
                success: false,
                info,
                request: { idEnvio, pixKey, amount: amount.toFixed(2), platformPixKey },
                error: err.message,
                efiStatus: err?.response?.status,
                efiError,
            }, { status: 500 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
