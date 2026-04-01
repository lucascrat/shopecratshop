"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, getToken, clearToken, setToken } from "@/lib/api";
import type { Profile } from "@/lib/types";

export interface AppUser {
    id: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: AppUser | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => void;
    refreshProfile: () => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: () => { },
    refreshProfile: async () => { },
    loginWithToken: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            fetchMe();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchMe = async () => {
        try {
            const data = await apiFetch<{ profile: Profile }>("/api/auth/me");
            const p = data.profile;
            setUser({ id: p.id, email: (p as any).email || "", role: p.role });
            setProfile(p);
        } catch {
            // Token invalid or expired
            clearToken();
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const loginWithToken = async (token: string) => {
        setToken(token);
        await fetchMe();
    };

    const refreshProfile = async () => {
        if (getToken()) await fetchMe();
    };

    const signOut = () => {
        clearToken();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, loginWithToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
