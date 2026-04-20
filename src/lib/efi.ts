import fs from "fs";
import path from "path";
import os from "os";
import { query } from "./db";
import { getPlatformSetting } from "./admin";

// ==========================================
// Efi Bank API Integration
// ==========================================

interface EfiCredentials {
    clientId: string;
    clientSecret: string;
    sandbox: boolean;
    pixKey: string;
}

// Get credentials from platform_settings (with env var fallback)
async function getCredentials(): Promise<EfiCredentials> {
    // Try DB first; fall back to env vars gracefully if DB is unavailable
    let clientId: string | null = null;
    let clientSecret: string | null = null;
    let sandbox: string | null = null;
    let pixKey: string | null = null;
    try {
        [clientId, clientSecret, sandbox, pixKey] = await Promise.all([
            getPlatformSetting("efi_client_id"),
            getPlatformSetting("efi_client_secret"),
            getPlatformSetting("efi_sandbox"),
            getPlatformSetting("efi_pix_key"),
        ]);
    } catch {
        // DB unavailable — use env vars only
    }

    const finalClientId     = clientId     || process.env.EFI_CLIENT_ID     || "";
    const finalClientSecret = clientSecret || process.env.EFI_CLIENT_SECRET || "";
    const finalSandbox      = sandbox !== null ? sandbox === "true" : process.env.EFI_SANDBOX === "true";
    const finalPixKey       = pixKey       || process.env.EFI_PIX_KEY       || "";

    if (!finalClientId || !finalClientSecret) {
        throw new Error("Credenciais Efi Bank não configuradas. Configure no painel Admin → Configurações.");
    }

    return {
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        sandbox: finalSandbox,
        pixKey: finalPixKey,
    };
}

// Write certificate to temp file (from env var base64 or local file)
function getCertificatePath(): string | undefined {
    // Option 1: Base64-encoded cert in env var (for Coolify/Docker)
    const certBase64 = process.env.EFI_CERTIFICATE_BASE64;
    if (certBase64) {
        const tmpPath = path.join(os.tmpdir(), "efi_cert.p12");
        // Always rewrite — ensures env var changes take effect without restart
        fs.writeFileSync(tmpPath, Buffer.from(certBase64, "base64"));
        return tmpPath;
    }

    // Option 2: Local file path from env var
    const certPath = process.env.EFI_CERTIFICATE_PATH;
    if (certPath && fs.existsSync(certPath)) {
        return certPath;
    }

    // Option 3: Default local path for development
    const localPaths = [
        path.join(process.cwd(), "certs", "efi_cert.p12"),
        path.join(process.cwd(), "efi_cert.p12"),
    ];
    for (const p of localPaths) {
        if (fs.existsSync(p)) return p;
    }

    return undefined;
}

// Get Efi SDK instance
async function getEfiInstance() {
    const creds = await getCredentials();
    const EfiPay = (await import("sdk-node-apis-efi")).default;

    const certPath = getCertificatePath();

    // Validate certificate before passing to SDK
    if (certPath) {
        const fs2 = await import("fs");
        const tls  = await import("tls");
        if (!fs2.existsSync(certPath)) {
            throw new Error(`Certificado Efi não encontrado em: ${certPath}`);
        }
        try {
            const certBuf = fs2.readFileSync(certPath);
            tls.createSecureContext({ pfx: certBuf, passphrase: "" });
        } catch (tlsErr: any) {
            // Certificate is invalid — remove cached temp file so it gets rewritten next time
            const os2 = await import("os");
            const path2 = await import("path");
            const tmpPath = path2.join(os2.tmpdir(), "efi_cert.p12");
            if (fs2.existsSync(tmpPath)) fs2.unlinkSync(tmpPath);
            throw new Error(
                `Certificado Efi inválido (${tlsErr.message}). Reenvie o arquivo .p12 correto via EFI_CERTIFICATE_BASE64.`
            );
        }
    }

    const options: any = {
        client_id:     creds.clientId,
        client_secret: creds.clientSecret,
        sandbox:       creds.sandbox,
    };

    if (certPath) {
        options.certificate = certPath;
    }

    return { efipay: new EfiPay(options), creds };
}

// ==========================================
// PIX Functions
// ==========================================

export interface PixChargeResult {
    txid: string;
    chargeId: string;
    qrcode: string;
    qrcodePng: string;
    copyPaste: string;
    expiresAt: string;
    amount: number;
}

// Create PIX charge with QR Code
export async function createPixCharge(
    orderId: string,
    amount: number,
    description: string,
    customerName: string,
    customerCpf?: string
): Promise<PixChargeResult> {
    const { efipay, creds } = await getEfiInstance();

    if (!creds.pixKey) {
        throw new Error("Chave PIX da plataforma não configurada. Configure no painel Admin → Configurações.");
    }

    // Generate unique txid (max 35 chars, alphanumeric only)
    const txid = `shopcrat${orderId.replace(/-/g, "").substring(0, 27)}`;

    try {
        const chargeBody: any = {
            calendario: { expiracao: 3600 },
            valor: { original: amount.toFixed(2) },
            chave: creds.pixKey,
            infoAdicionais: [
                { nome: "Pedido",     valor: `#${orderId.substring(0, 8)}` },
                { nome: "Plataforma", valor: "Shopcrat" },
            ],
        };

        // Only include devedor when BOTH name AND CPF/CNPJ are available.
        // The Efi API requires cpf or cnpj when devedor is present — sending
        // only nome causes "not enough data" error.
        const cpfClean = customerCpf ? customerCpf.replace(/\D/g, "") : "";
        if (customerName && cpfClean.length >= 11) {
            chargeBody.devedor = {
                nome: customerName,
                cpf: cpfClean.substring(0, 11),
            };
        }

        console.log("[Efi PIX] txid:", txid, "| chave:", creds.pixKey, "| valor:", amount.toFixed(2));

        const charge = await efipay.pixCreateImmediateCharge({ txid }, chargeBody);

        console.log("[Efi PIX] charge criado:", charge.txid, "| loc.id:", charge.loc?.id);

        const qrcode = await efipay.pixGenerateQRCode({ id: charge.loc.id });

        return {
            txid:       charge.txid,
            chargeId:   String(charge.loc.id),
            qrcode:     qrcode.imagemQrcode || "",
            qrcodePng:  qrcode.imagemQrcode || "",
            copyPaste:  qrcode.qrcode || charge.pixCopiaECola || "",
            expiresAt:  new Date(Date.now() + 3600 * 1000).toISOString(),
            amount,
        };
    } catch (error: any) {
        const efiError = error?.response?.data;
        console.error("[Efi PIX] Erro completo:", JSON.stringify(efiError || error.message));
        // Build a clear message: prefer Efi API mensagem, fallback to raw error
        const msg = efiError?.mensagem
            || efiError?.message
            || (typeof efiError === "string" ? efiError : null)
            || error.message;
        throw new Error(`Erro ao criar cobrança PIX: ${msg}`);
    }
}

// Check PIX payment status
export async function checkPixPayment(txid: string): Promise<{
    paid: boolean;
    status: string;
    paidAt?: string;
}> {
    const { efipay } = await getEfiInstance();
    try {
        const charge = await efipay.pixDetailCharge({ txid });
        const paid   = charge.status === "CONCLUIDA";
        return {
            paid,
            status: charge.status,
            paidAt: paid ? charge.pix?.[0]?.horario : undefined,
        };
    } catch (error: any) {
        console.error("Efi check PIX error:", error?.response?.data || error.message);
        return { paid: false, status: "ERROR" };
    }
}

// ==========================================
// Card Functions
// ==========================================

export interface CardChargeResult {
    chargeId: string;
    status: string;
    installments: number;
    total: number;
}

export async function createCardCharge(
    orderId: string,
    amount: number,
    installments: number,
    paymentToken: string,
    customer: {
        name: string; cpf: string; email: string; phone: string; birth: string;
    },
    billingAddress: {
        street: string; number: string; neighborhood: string;
        city: string; state: string; zipcode: string;
    }
): Promise<CardChargeResult> {
    const { efipay } = await getEfiInstance();
    try {
        const chargeResponse = await efipay.createOneStepCharge([], {
            items: [{
                name:   `Pedido Shopcrat #${orderId.substring(0, 8)}`,
                value:  Math.round(amount * 100),
                amount: 1,
            }],
            payment: {
                credit_card: {
                    installments,
                    payment_token: paymentToken,
                    billing_address: {
                        street:       billingAddress.street,
                        number:       billingAddress.number,
                        neighborhood: billingAddress.neighborhood,
                        zipcode:      billingAddress.zipcode.replace(/\D/g, ""),
                        city:         billingAddress.city,
                        state:        billingAddress.state,
                    },
                    customer: {
                        name:         customer.name,
                        cpf:          customer.cpf.replace(/\D/g, ""),
                        email:        customer.email,
                        phone_number: customer.phone.replace(/\D/g, ""),
                        birth:        customer.birth,
                    },
                },
            },
        });

        const resData = chargeResponse as any;
        return {
            chargeId:     String(resData.data?.charge_id || resData.charge_id || ""),
            status:       resData.data?.status || resData.status || "waiting",
            installments,
            total:        amount,
        };
    } catch (error: any) {
        console.error("Efi Card charge error:", error?.response?.data || error.message);
        throw new Error(
            `Erro ao processar cartão: ${error?.response?.data?.mensagem || error.message}`
        );
    }
}

// ==========================================
// Withdrawal (PIX Transfer)
// ==========================================

// Send a PIX transfer and confirm its final status.
//
// pixSend accepts the request and usually returns status=EM_PROCESSAMENTO —
// that only means "queued", not "paid". We then poll pixSendDetail to get
// the real outcome: REALIZADO (success), NAO_REALIZADO (failed, throws so
// the caller can refund) or a terminal EM_PROCESSAMENTO (rare, returned as
// "processing" so the admin can reconcile later).
export async function sendPixTransfer(
    pixKey: string,
    _pixKeyType: string,
    amount: number,
    description: string
): Promise<{ transferId: string; status: "completed" | "processing"; rawStatus: string }> {
    const { efipay, creds } = await getEfiInstance();

    const idEnvio = `saque${Date.now()}`;
    const pixSendBody: any = {
        valor: amount.toFixed(2),
        pagador: {
            chave:       creds.pixKey,
            infoPagador: description,
        },
        favorecido: { chave: pixKey },
    };

    let e2eId: string | undefined;
    try {
        const response = await efipay.pixSend({ idEnvio }, pixSendBody);
        e2eId = response.e2eId;
    } catch (error: any) {
        console.error("Efi pixSend error:", error?.response?.data || error.message);
        throw new Error(
            `Erro na transferência PIX: ${error?.response?.data?.mensagem || error.message}`
        );
    }

    if (!e2eId) {
        throw new Error("Erro na transferência PIX: Efi não retornou e2eId");
    }

    // Poll for final status. Efi usually resolves within a couple of seconds.
    // Total budget ≈ 8s (4 attempts × ~2s spacing) — well inside the webhook's
    // HTTP timeout envelope but long enough to catch the common case.
    const attempts = [500, 1500, 3000, 3000];
    let lastStatus = "EM_PROCESSAMENTO";

    for (const delay of attempts) {
        await new Promise((r) => setTimeout(r, delay));
        try {
            const detail = await efipay.pixSendDetail({ e2eid: e2eId });
            lastStatus = detail.status;
            if (detail.status === "REALIZADO") {
                return { transferId: e2eId, status: "completed", rawStatus: detail.status };
            }
            if (detail.status === "NAO_REALIZADO") {
                console.error("[Efi] PIX envio NAO_REALIZADO:", JSON.stringify(detail));
                throw new Error("PIX recusado pelo banco (NAO_REALIZADO). Verifique a chave PIX do favorecido.");
            }
            // else EM_PROCESSAMENTO — keep polling
        } catch (err: any) {
            // If pixSendDetail itself errors (network/timeout), break out —
            // we'll return processing and the admin can reconcile.
            console.warn("[Efi] pixSendDetail erro (continuando polling):", err?.response?.data || err.message);
            if (err?.message?.startsWith("PIX recusado")) throw err;
        }
    }

    console.warn(`[Efi] PIX envio ${e2eId} ainda EM_PROCESSAMENTO após polling — retornando processing`);
    return { transferId: e2eId, status: "processing", rawStatus: lastStatus };
}

// ==========================================
// Installment options for checkout
// ==========================================

export async function getInstallmentOptions(amount: number) {
    const result = await query(
        "SELECT key, value FROM platform_settings WHERE key LIKE 'card_fee_%' ORDER BY key"
    );

    return result.rows.map((row: any) => {
        const n           = parseInt(row.key.replace("card_fee_", "").replace("x", ""));
        const feePercent  = parseFloat(row.value);
        const total       = amount * (1 + feePercent / 100);
        const installmentValue = total / n;
        return {
            installments:      n,
            fee:               feePercent,
            installmentValue:  Math.round(installmentValue * 100) / 100,
            total:             Math.round(total * 100) / 100,
        };
    });
}
