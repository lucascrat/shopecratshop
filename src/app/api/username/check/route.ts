import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const RESERVED = ["admin", "shopcrat", "shop", "loja", "store", "api", "feed", "login",
    "register", "checkout", "profile", "settings", "search", "merchant", "product"];

function isValidUsername(u: string) {
    return /^[a-z0-9_]{3,30}$/.test(u);
}

// GET /api/username/check?username=xxx&type=profile|store&currentId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username  = (searchParams.get("username") || "").toLowerCase().trim();
    const type      = searchParams.get("type") || "profile";   // "profile" | "store"
    const currentId = searchParams.get("currentId") || "";     // skip self when editing

    if (!username) {
        return NextResponse.json({ available: false, error: "Username vazio" });
    }
    if (!isValidUsername(username)) {
        return NextResponse.json({
            available: false,
            error: "Use apenas letras minúsculas, números e _ (3–30 caracteres)"
        });
    }
    if (RESERVED.includes(username)) {
        return NextResponse.json({ available: false, error: "Este username é reservado" });
    }

    try {
        let taken = false;

        if (type === "store") {
            const r = await query(
                "SELECT id FROM stores WHERE username = $1 AND id != $2",
                [username, currentId || "00000000-0000-0000-0000-000000000000"]
            );
            taken = r.rows.length > 0;
        } else {
            const r = await query(
                "SELECT id FROM profiles WHERE username = $1 AND id != $2",
                [username, currentId || "00000000-0000-0000-0000-000000000000"]
            );
            taken = r.rows.length > 0;
        }

        return NextResponse.json({ available: !taken });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ available: false, error: "Erro interno" }, { status: 500 });
    }
}
