"use client";

import { Home, Search, Plus, MessageCircle, User, LayoutDashboard, Package, Video, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function BottomNav() {
    const pathname = usePathname();
    const { profile } = useAuth();

    // Hide global nav on merchant pages (they have their own nav)
    if (pathname.startsWith("/merchant")) return null;

    // Hide on admin pages (admin has its own nav)
    if (pathname.startsWith("/admin")) return null;

    // Hide on checkout, login, register pages
    if (["/checkout", "/login", "/register", "/forgot-password"].some(p => pathname.startsWith(p))) return null;

    const isMerchant = profile?.role === "merchant";

    // Merchant nav items
    const merchantItems = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/merchant/dashboard" },
        { label: "Estoque", icon: Package, href: "/merchant/stock" },
        { label: "Criar", icon: Plus, href: "/merchant/add-product", isCenter: true },
        { label: "Feed", icon: Video, href: "/" },
        { label: "Analítico", icon: BarChart3, href: "/merchant/analytics" },
    ];

    // Customer nav items (no "Criar" button)
    const customerItems = [
        { label: "Início", icon: Home, href: "/" },
        { label: "Explorar", icon: Search, href: "/search" },
        { label: "Mensagens", icon: MessageCircle, href: "/messages" },
        { label: "Perfil", icon: User, href: "/profile" },
    ];

    const navItems = isMerchant ? merchantItems : customerItems;

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 pt-3 pb-8 flex justify-between items-center z-50">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                if ("isCenter" in item && item.isCenter) {
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="bg-primary hover:bg-primary/90 p-3 rounded-2xl -mt-10 shadow-lg shadow-primary/20 transform active:scale-95 transition-all outline outline-4 outline-black"
                        >
                            <Icon className="w-7 h-7 text-white stroke-[3px]" />
                        </Link>
                    );
                }

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-white/50 hover:text-white'}`}
                    >
                        <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
