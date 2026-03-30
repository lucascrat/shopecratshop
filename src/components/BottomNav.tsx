"use client";

import { Home, Search, Plus, MessageCircle, User, LayoutDashboard, Package, Video, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRef, useState, useEffect } from "react";

const LONG_PRESS_DURATION_MS = 3000;
const INTERVAL_MS = 300;
const INCREMENT = (INTERVAL_MS / LONG_PRESS_DURATION_MS) * 100; // ~10 per tick

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { profile } = useAuth();

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [progress, setProgress] = useState(0);
    const completedRef = useRef(false);

    // Fire admin navigation once progress hits 100
    useEffect(() => {
        if (progress >= 100 && !completedRef.current) {
            completedRef.current = true;
            setProgress(0);
            navigator.vibrate?.(60);
            router.push("/admin/login");
        }
    }, [progress, router]);

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

    function startLongPress() {
        if (intervalRef.current) return;
        completedRef.current = false;

        intervalRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + INCREMENT;
                if (next >= 100) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    return 100;
                }
                return next;
            });
        }, INTERVAL_MS);
    }

    function stopLongPress() {
        // Only cancel if the interval is still running (user released early).
        // If intervalRef is null the interval already completed — let the
        // useEffect handle navigation, don't reset progress.
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setProgress(0);
        }
    }

    // SVG circular progress indicator
    const RADIUS = 6;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100);

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

            {/* Hidden long-press admin trigger */}
            <div
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] flex items-center justify-center cursor-pointer select-none"
                onMouseDown={startLongPress}
                onMouseUp={() => stopLongPress()}
                onMouseLeave={() => stopLongPress()}
                onTouchStart={(e) => { e.preventDefault(); startLongPress(); }}
                onTouchEnd={() => stopLongPress()}
            >
                {/* SVG progress ring */}
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    className={`absolute transition-opacity duration-300 ${progress > 0 ? "opacity-100" : "opacity-0"}`}
                    style={{ transform: "rotate(-90deg)" }}
                >
                    {/* Track */}
                    <circle
                        cx="11"
                        cy="11"
                        r={RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="2"
                    />
                    {/* Progress */}
                    <circle
                        cx="11"
                        cy="11"
                        r={RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: "stroke-dashoffset 0.1s linear" }}
                    />
                </svg>

                {/* Dot */}
                <div
                    className={`w-2.5 h-2.5 rounded-full bg-white/10 transition-opacity duration-300 ${
                        progress > 0 ? "opacity-60" : "opacity-20"
                    }`}
                />
            </div>
        </nav>
    );
}
