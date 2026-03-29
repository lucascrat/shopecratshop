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

// Get credentials from platform_settings
async function getCredentials(): Promise<EfiCredentials> {
    const [clientId, clientSecret, sandbox, pixKey] = await Promise.all([
        getPlatformSetting("efi_client_id"),
        getPlatformSetting("efi_client_secret"),
        getPlatformSetting("efi_sandbox"),
        getPlatformSetting("efi_pix_key"),
    ]);

    if (!clientId || !clientSecret) {
        throw new Error("Credenciais Efi Bank não configuradas");
    }

    return {
        clientId,
        clientSecret,
        sandbox: sandbox === "true",
        pixKey: pixKey || "",
    };
}

// Get Efi SDK instance
async function getEfiInstance() {
    const creds = await getCredentials();

    const EfiPay = (await import("sdk-node-apis-efi")).default;

    const options = {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        sandbox: creds.sandbox,
    };

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

    // Generate unique txid (max 35 chars, alphanumeric only)
    const txid = `shopcrat${orderId.replace(/-/g, "").substring(0, 27)}`;

    try {
        // Step 1: Create immediate charge (cobrança imediata)
        const chargeBody: any = {
            calendario: {
                expiracao: 3600, // 1 hour
            },
            valor: {
                original: amount.toFixed(2),
            },
            chave: creds.pixKey,
            infoAdicionais: [
                { nome: "Pedido", valor: `#${orderId.substring(0, 8)}` },
                { nome: "Plataforma", valor: "Shopcrat" },
            ],
        };

        // Add payer info if available
        if (customerName) {
            chargeBody.devedor = {
                nome: customerName,
                ...(customerCpf ? { cpf: customerCpf.replace(/\D/g, "") } : {}),
            };
        }

        const charge = await efipay.pixCreateImmediateCharge(
            { txid },
            chargeBody
        );

        // Step 2: Generate QR Code
        const qrcode = await efipay.pixGenerateQRCode({
            id: charge.loc.id,
        });

        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

        return {
            txid: charge.txid,
            chargeId: String(charge.loc.id),
            qrcode: qrcode.imagemQrcode || "",
            qrcodePng: qrcode.imagemQrcode || "",
            copyPaste: qrcode.qrcode || charge.pixCopiaECola || "",
            expiresAt,
            amount,
        };
    } catch (error: any) {
        console.error("Efi PIX charge error:", error?.response?.data || error.message);
        throw new Error(
            `Erro ao criar cobrança PIX: ${error?.response?.data?.mensagem || error.message}`
        );
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

        const paid = charge.status === "CONCLUIDA";
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

// Create card payment
export async function createCardCharge(
    orderId: string,
    amount: number,
    installments: number,
    paymentToken: string,
    customer: {
        name: string;
        cpf: string;
        email: string;
        phone: string;
        birth: string;
    },
    billingAddress: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        state: string;
        zipcode: string;
    }
): Promise<CardChargeResult> {
    const { efipay } = await getEfiInstance();

    try {
        // Step 1: Create charge
        const chargeResponse = await efipay.createOneStepCharge([], {
            items: [
                {
                    name: `Pedido Shopcrat #${orderId.substring(0, 8)}`,
                    value: Math.round(amount * 100), // cents
                    amount: 1,
                },
            ],
            payment: {
                credit_card: {
                    installments,
                    payment_token: paymentToken,
                    billing_address: {
                        street: billingAddress.street,
                        number: billingAddress.number,
                        neighborhood: billingAddress.neighborhood,
                        zipcode: billingAddress.zipcode.replace(/\D/g, ""),
                        city: billingAddress.city,
                        state: billingAddress.state,
                    },
                    customer: {
                        name: customer.name,
                        cpf: customer.cpf.replace(/\D/g, ""),
                        email: customer.email,
                        phone_number: customer.phone.replace(/\D/g, ""),
                        birth: customer.birth,
                    },
                },
            },
        });

        const resData = chargeResponse as any;
        return {
            chargeId: String(resData.data?.charge_id || resData.charge_id || ""),
            status: resData.data?.status || resData.status || "waiting",
            installments,
            total: amount,
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

export async function sendPixTransfer(
    pixKey: string,
    pixKeyType: string,
    amount: number,
    description: string
): Promise<{ transferId: string; status: string }> {
    const { efipay } = await getEfiInstance();

    // Map key types
    const keyTypeMap: Record<string, string> = {
        cpf: "cpf",
        cnpj: "cnpj",
        email: "email",
        phone: "telefone",
        random: "chave",
    };

    try {
        const idEnvio = `saque${Date.now()}`;

        const pixSendBody: any = {
            valor: amount.toFixed(2),
            pagador: {
                chave: (await getCredentials()).pixKey,
                infoPagador: description,
            },
            favorecido: {
                chave: pixKey,
            },
        };

        const response = await efipay.pixSend(
            { idEnvio },
            pixSendBody
        );

        return {
            transferId: response.e2eId || idEnvio,
            status: "completed",
        };
    } catch (error: any) {
        console.error("Efi PIX transfer error:", error?.response?.data || error.message);
        throw new Error(
            `Erro na transferência PIX: ${error?.response?.data?.mensagem || error.message}`
        );
    }
}

// ==========================================
// Get card fees for checkout display
// ==========================================

export async function getInstallmentOptions(amount: number): Promise<
    Array<{
        installments: number;
        fee: number;
        installmentValue: number;
        total: number;
    }>
> {
    const result = await query(
        "SELECT key, value FROM platform_settings WHERE key LIKE 'card_fee_%' ORDER BY key"
    );

    const options = [];

    for (const row of result.rows) {
        const n = parseInt(row.key.replace("card_fee_", "").replace("x", ""));
        const feePercent = parseFloat(row.value);
        const total = amount * (1 + feePercent / 100);
        const installmentValue = total / n;

        options.push({
            installments: n,
            fee: feePercent,
            installmentValue: Math.round(installmentValue * 100) / 100,
            total: Math.round(total * 100) / 100,
        });
    }

    return options;
}
