"use client";

import { decodeToken } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    ShoppingBag,
    Store,
    ArrowDownToLine,
    Settings,
    DollarSign,
    LogOut,
    Shield,
    Loader2,
    Users,
    Video,
} from "lucide-react";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { label: "Pedidos", icon: ShoppingBag, href: "/admin/orders" },
    { label: "Lojistas", icon: Store, href: "/admin/merchants" },
    { label: "Saques", icon: ArrowDownToLine, href: "/admin/withdrawals" },
    { label: "Usuários", icon: Users, href: "/admin/users" },
    { label: "Vídeos", icon: Video, href: "/admin/videos" },
    { label: "Finanças", icon: DollarSign, href: "/admin/finances" },
    { label: "Config.", icon: Settings, href: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuthed, setIsAuthed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [adminName, setAdminName] = useState("Holanda");
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            router.push("/admin/login");
            setChecking(false);
            return;
        }

        try {
            const decoded = decodeToken(token);
            if (decoded?.role === "admin") {
                // Extract a display name from email or id
                if (decoded.email) {
                    const name = decoded.email.split("@")[0];
                    setAdminName(name.charAt(0).toUpperCase() + name.slice(1));
                }
                setIsAuthed(true);
            } else {
                router.push("/admin/login");
            }
        } catch {
            router.push("/admin/login");
        }

        setChecking(false);
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!isAuthed) {
        return null;
    }

    function handleLogout() {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("token");
        router.push("/admin/login");
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white max-w-[430px] mx-auto flex flex-col">
            {/* Admin Header */}
            <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight">Admin Panel</h1>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                {adminName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-white/30 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 pb-28">
                {children}
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-slate-950/95 backdrop-blur-xl border-t border-white/5 pt-2 pb-7 z-50">
                <div className="flex items-center overflow-x-auto no-scrollbar px-2 gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== "/admin" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all shrink-0 ${
                                    isActive ? "text-primary" : "text-white/30 hover:text-white/60"
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                                <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
                                {isActive && <div className="w-1 h-1 bg-primary rounded-full" />}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
