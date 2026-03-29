"use client";

import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";
import {
    Settings,
    MapPin,
    ShoppingBag,
    Heart,
    ChevronRight,
    LogOut,
    Package,
    History,
    Star,
    CheckCircle2,
    Truck,
    LayoutDashboard,
    ShieldCheck,
    Loader2,
    Clock
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface OrderItem {
    id: string;
    total: number;
    status: string;
    created_at: string;
    product: {
        name: string;
        images: string[];
    } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
    confirmed: { label: "Confirmado", color: "text-blue-400", icon: Package },
    shipped: { label: "A caminho", color: "text-primary", icon: Truck },
    delivered: { label: "Entregue", color: "text-green-400", icon: CheckCircle2 },
    cancelled: { label: "Cancelado", color: "text-red-400", icon: Clock },
};

export default function ProfilePage() {
    const { user, profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState("Pedidos");
    const router = useRouter();
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [stats, setStats] = useState({ stores: 0, likes: 0, orders: 0 });
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchProfileData() {
            setLoadingOrders(true);
            try {
                // Fetch orders and stats in parallel
                const [ordersRes, statsRes] = await Promise.all([
                    apiFetch<{ orders: OrderItem[] }>("/api/orders"),
                    apiFetch<{ likesCount: number; bookmarksCount: number }>("/api/profile"),
                ]);

                setOrders(ordersRes.orders || []);

                setStats({
                    stores: statsRes.bookmarksCount || 0,
                    likes: statsRes.likesCount || 0,
                    orders: ordersRes.orders?.length || 0,
                });
            } catch (err) {
                console.error("Failed to load profile data:", err);
            } finally {
                setLoadingOrders(false);
            }
        }

        fetchProfileData();
    }, [user]);

    const handleSignOut = () => {
        signOut();
        router.push("/login");
    };

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-32">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
                <h1 className="text-xl font-bold italic uppercase tracking-tight">Meu Perfil</h1>
                <Link href="/settings" className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                    <Settings className="w-6 h-6" />
                </Link>
            </header>

            {/* Profile Info */}
            <section className="p-8 flex flex-col items-center">
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-[40px] border-4 border-primary/20 p-1.5 rotate-6">
                        <div className="w-full h-full rounded-[32px] overflow-hidden relative -rotate-6 bg-white/5">
                            <Image
                                src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=alex"}
                                alt="Avatar"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <button className="absolute -bottom-1 -right-1 bg-primary p-2.5 rounded-2xl border-4 border-background-dark shadow-xl hover:scale-110 transition-transform">
                        <Star className="w-4 h-4 text-white fill-current" />
                    </button>
                </div>

                <h2 className="text-2xl font-black mb-1 italic">{profile?.full_name || "Usuário"}</h2>
                <p className="text-primary font-black text-xs mb-4 uppercase tracking-widest">@{profile?.username || "user"}</p>

                <p className="text-white/40 text-center text-sm max-w-[280px] leading-relaxed mb-6 font-medium">
                    Apaixonado por vídeo shopping | Explorando as melhores ofertas no Shopcrat.
                </p>

                <div className="flex items-center gap-1.5 text-white/30 text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 px-6 py-2.5 rounded-full border border-white/5">
                    <MapPin className="w-3.5 h-3.5" />
                    São Paulo, Brasil
                </div>
            </section>

            {/* Stats Summary */}
            <section className="px-6 grid grid-cols-3 gap-3 mb-8">
                {[
                    { label: "Salvos", value: stats.stores.toString(), icon: ShoppingBag },
                    { label: "Curtidas", value: stats.likes.toString(), icon: Heart },
                    { label: "Pedidos", value: stats.orders.toString(), icon: Package },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/5 rounded-[24px] p-4 flex flex-col items-center gap-1 group cursor-pointer hover:border-white/10 transition-all">
                        <span className="text-xl font-black italic text-white">{stat.value}</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-primary transition-colors">{stat.label}</span>
                    </div>
                ))}
            </section>

            {/* Merchant Shortcut */}
            {profile?.role === 'merchant' && (
                <section className="px-6 mb-8">
                    <Link
                        href="/merchant/dashboard"
                        className="w-full bg-primary/10 border border-primary/20 rounded-3xl p-5 flex items-center justify-between group hover:bg-primary/20 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight italic">Painel do Vendedor</h4>
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Gerenciar minha loja</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-primary animate-pulse" />
                    </Link>
                </section>
            )}

            {/* Tabs */}
            <div className="px-6 mb-4">
                <div className="flex bg-white/5 rounded-[20px] p-1 border border-white/5">
                    {["Pedidos", "Seguindo", "Desejos"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === tab ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-white/20 hover:text-white/40'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="px-6 space-y-3">
                {loadingOrders ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-white/20 text-sm mb-4">Nenhum pedido ainda</p>
                        <Link href="/" className="text-primary text-sm font-bold hover:underline">
                            Explorar produtos
                        </Link>
                    </div>
                ) : (
                    orders.map((order) => {
                        const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending;
                        const StatusIcon = statusInfo.icon;
                        return (
                            <Link key={order.id} href={`/order-tracking/${order.id}`} className="bg-white/5 border border-white/5 rounded-3xl p-3 flex items-center gap-4 group cursor-pointer hover:border-white/10 transition-all">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden relative border border-white/10 bg-black/40 shrink-0">
                                    {order.product?.images?.[0] ? (
                                        <Image src={order.product.images[0]} alt={order.product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10">
                                            <Package className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-black uppercase tracking-tight text-white/80 truncate mb-1">
                                        {order.product?.name || "Produto"}
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <span className="text-primary font-black text-sm italic">R$ {parseFloat(String(order.total || 0)).toFixed(2)}</span>
                                        <div className={`flex items-center gap-1.5 ${statusInfo.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{statusInfo.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/5 group-hover:text-primary transition-colors shrink-0" />
                            </Link>
                        );
                    })
                )}
            </div>

            <div className="p-8 flex flex-col gap-4">
                <button className="w-full bg-white/5 hover:bg-white/10 text-white/40 font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-white/5">
                    <History className="w-4 h-4" />
                    Ver Histórico Antigo
                </button>

                <button
                    onClick={handleSignOut}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-red-500/10"
                >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-white/5 text-[9px] font-black uppercase tracking-[0.3em]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sessão Protegida
                </div>
            </div>

            <BottomNav />
        </main>
    );
}
