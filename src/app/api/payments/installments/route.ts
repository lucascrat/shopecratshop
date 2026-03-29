import { NextRequest, NextResponse } from "next/server";
import { getInstallmentOptions } from "@/lib/efi";

// GET - Get installment options with fees
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const amount = parseFloat(searchParams.get("amount") || "0");

        if (amount <= 0) {
            return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
        }

        const options = await getInstallmentOptions(amount);

        return NextResponse.json({ installments: options });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
