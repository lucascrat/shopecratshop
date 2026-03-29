import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";
const JWT_EXPIRY = "7d";

export interface AuthUser {
    id: string;
    email: string;
    role: string;
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthUser): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthUser {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function getUserFromRequest(request: NextRequest): AuthUser | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split(" ")[1];
    try {
        return verifyToken(token);
    } catch {
        return null;
    }
}

export function requireAuth(request: NextRequest): AuthUser {
    const user = getUserFromRequest(request);
    if (!user) throw new Error("Não autorizado");
    return user;
}
