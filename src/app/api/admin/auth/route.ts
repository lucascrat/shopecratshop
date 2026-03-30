import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

// In-memory rate limiter: maps IP -> { count, windowStart }
const attempts = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

const ADMIN_USERNAME = "holanda";
const ADMIN_PASSWORD = "12345678";

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = attempts.get(ip);

    if (!entry) return false;

    // Reset window if expired
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        attempts.delete(ip);
        return false;
    }

    return entry.count >= RATE_LIMIT_MAX;
}

function recordAttempt(ip: string): void {
    const now = Date.now();
    const entry = attempts.get(ip);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        attempts.set(ip, { count: 1, windowStart: now });
    } else {
        entry.count += 1;
    }
}

function clearAttempts(ip: string): void {
    attempts.delete(ip);
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: "Muitas tentativas. Aguarde um momento." },
            { status: 429 }
        );
    }

    let body: { username?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }

    const { username, password } = body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        clearAttempts(ip);

        const token = signToken({
            id: "admin-holanda",
            email: "admin@shopcrat.com",
            role: "admin",
        });

        return NextResponse.json({ token }, { status: 200 });
    }

    // Wrong credentials — record attempt and add artificial delay
    recordAttempt(ip);
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
    );
}
