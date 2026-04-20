import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPlatformSetting } from "@/lib/admin";

// GET - returns the Efi payee_code + sandbox flag needed by the client-side
// CardPaymentModal to load Efi's tokenization SDK. Auth is required so the
// identifier isn't exposed publicly (it's not a secret, but we keep it gated).
export async function GET(request: NextRequest) {
    try {
        requireAuth(request);

        const payeeCode = (await getPlatformSetting("efi_card_payee_code")) || "";
        const sandboxSetting = (await getPlatformSetting("efi_sandbox")) ?? "true";
        const sandbox = sandboxSetting === "true" || sandboxSetting === "1";

        return NextResponse.json({ payeeCode, sandbox });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        console.error("card config error:", message);
        return NextResponse.json({ error: "Erro ao carregar configuração" }, { status: 500 });
    }
}
