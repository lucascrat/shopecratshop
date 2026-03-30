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
    Clock,
    Bookmark,
    Store,
    Play,
    Users
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
    product_name: string;
    product_images: string[];
}

interface FollowedStore {
    id: string;
    store_id: string;
    store_name: string;
    logo_url: string | null;
    store_username: string | null;
    store_description: string | null;
}

interface BookmarkItem {
    id: string;
    bookmarked_at: string;
    video: {
        id: string;
        thumbnail_url: string | null;
        video_url: string;
        likes_count: number;
        product: {
            name: string | null;
            price: number | null;
            old_price: number | null;
        };
    };
    store: {
        id: string;
        name: string;
        logo_url: string | null;
        username: string | null;
    };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    pending:   { label: "Pendente",  color: "text-yellow-400", icon: Clock },
    confirmed: { label: "Confirmado", color: "text-blue-400",   icon: Package },
    shipped:   { label: "A caminho", color: "text-primary",     icon: Truck },
    delivered: { label: "Entregue",  color: "text-green-400",   icon: CheckCircle2 },
    cancelled: { label: "Cancelado", color: "text-red-400",     icon: Clock },
};

export default function ProfilePage() {
    const { user, profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState("Pedidos");
    const router = useRouter();

    const [orders, setOrders]         = useState<OrderItem[]>([]);
    const [follows, setFollows]        = useState<FollowedStore[]>([]);
    const [bookmarks, setBookmarks]    = useState<BookmarkItem[]>([]);
    const [stats, setStats]            = useState({ follows: 0, likes: 0, orders: 0 });
    const [loadingOrders, setLoadingOrders]     = useState(false);
    const [loadingFollows, setLoadingFollows]   = useState(false);
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);
    const [ordersLoaded, setOrdersLoaded]        = useState(false);
    const [followsLoaded, setFollowsLoaded]      = useState(false);
    const [bookmarksLoaded, setBookmarksLoaded]  = useState(false);

    // Initial load: stats + first tab (orders)
    useEffect(() => {
        if (!user) return;
        loadStats();
        loadOrders();
    }, [user]);

    // Lazy-load tab data on first switch
    useEffect(() => {
        if (!user) return;
        if (activeTab === "Seguindo" && !followsLoaded) loadFollows();
        if (activeTab === "Desejos"  && !bookmarksLoaded) loadBookmarks();
    }, [activeTab, user]);

    async function loadStats() {
        try {
            const [profileRes, followsRes, ordersRes] = await Promise.all([
                apiFetch<{ likesCount: number; bookmarksCount: number }>("/api/profile"),
                apiFetch<{ follows: FollowedStore[] }>("/api/follows"),
                apiFetch<{ orders: OrderItem[] }>("/api/orders"),
            ]);
            setStats({
                follows: followsRes.follows?.length || 0,
                likes:   profileRes.likesCount || 0,
                orders:  ordersRes.orders?.length || 0,
            });
        } catch {}
    }

    async function loadOrders() {
        setLoadingOrders(true);
        try {
            const data = await apiFetch<{ orders: OrderItem[] }>("/api/orders");
            setOrders(data.orders || []);
        } catch {}
        setLoadingOrders(false);
        setOrdersLoaded(true);
    }

    async function loadFollows() {
        setLoadingFollows(true);
        try {
            const data = await apiFetch<{ follows: FollowedStore[] }>("/api/follows");
            setFollows(data.follows || []);
        } catch {}
        setLoadingFollows(false);
        setFollowsLoaded(true);
    }

    async function loadBookmarks() {
        setLoadingBookmarks(true);
        try {
            const data = await apiFetch<{ bookmarks: BookmarkItem[] }>("/api/bookmarks");
            setBookmarks(data.bookmarks || []);
        } catch {}
        setLoadingBookmarks(false);
        setBookmarksLoaded(true);
    }

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
                    <Link href="/settings" className="absolute -bottom-1 -right-1 bg-primary p-2.5 rounded-2xl border-4 border-background-dark shadow-xl hover:scale-110 transition-transform">
                        <Star className="w-4 h-4 text-white fill-current" />
                    </Link>
                </div>

                <h2 className="text-2xl font-black mb-1 italic">{profile?.full_name || "Usuário"}</h2>
                <p className="text-primary font-black text-xs mb-4 uppercase tracking-widest">@{profile?.username || "user"}</p>

                <div className="flex items-center gap-1.5 text-white/30 text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 px-6 py-2.5 rounded-full border border-white/5">
                    <MapPin className="w-3.5 h-3.5" />
                    Shopcrat Member
                </div>
            </section>

            {/* Stats Summary */}
            <section className="px-6 grid grid-cols-3 gap-3 mb-8">
                {[
                    { label: "Seguindo", value: stats.follows.toString(), icon: Users },
                    { label: "Curtidas", value: stats.likes.toString(),   icon: Heart },
                    { label: "Pedidos",  value: stats.orders.toString(),  icon: Package },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/5 rounded-[24px] p-4 flex flex-col items-center gap-1 group cursor-pointer hover:border-white/10 transition-all">
                        <span className="text-xl font-black italic text-white">{stat.value}</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-primary transition-colors">{stat.label}</span>
                    </div>
                ))}
            </section>

            {/* Merchant Shortcut */}
            {profile?.role === "merchant" && (
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
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                                activeTab === tab
                                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                                    : "text-white/20 hover:text-white/40"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-6 space-y-3">
                {/* ── PEDIDOS ── */}
                {activeTab === "Pedidos" && (
                    loadingOrders ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-4" />
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
                                <Link
                                    key={order.id}
                                    href={`/order-tracking/${order.id}`}
                                    className="bg-white/5 border border-white/5 rounded-3xl p-3 flex items-center gap-4 group cursor-pointer hover:border-white/10 transition-all"
                                >
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden relative border border-white/10 bg-black/40 shrink-0">
                                        {order.product_images?.[0] ? (
                                            <Image
                                                src={order.product_images[0]}
                                                alt={order.product_name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/10">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[10px] font-black uppercase tracking-tight text-white/80 truncate mb-1">
                                            {order.product_name || "Produto"}
                                        </h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-primary font-black text-sm italic">
                                                R$ {parseFloat(String(order.total || 0)).toFixed(2)}
                                            </span>
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
                    )
                )}

                {/* ── SEGUINDO ── */}
                {activeTab === "Seguindo" && (
                    loadingFollows ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : follows.length === 0 ? (
                        <div className="text-center py-12">
                            <Store className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/20 text-sm mb-4">Você ainda não segue nenhuma loja</p>
                            <Link href="/" className="text-primary text-sm font-bold hover:underline">
                                Descobrir lojas
                            </Link>
                        </div>
                    ) : (
                        follows.map((follow) => (
                            <Link
                                key={follow.id}
                                href={`/store/${follow.store_username || follow.store_id}`}
                                className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center gap-4 group cursor-pointer hover:border-white/10 transition-all"
                            >
                                <div className="w-14 h-14 rounded-2xl overflow-hidden relative border border-white/10 bg-black/40 shrink-0">
                                    {follow.logo_url ? (
                                        <Image
                                            src={follow.logo_url}
                                            alt={follow.store_name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                            <Store className="w-6 h-6 text-primary" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-white/90 truncate">{follow.store_name}</h4>
                                    {follow.store_username && (
                                        <p className="text-[10px] text-primary font-bold">@{follow.store_username}</p>
                                    )}
                                    {follow.store_description && (
                                        <p className="text-[10px] text-white/30 truncate mt-0.5">{follow.store_description}</p>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/5 group-hover:text-primary transition-colors shrink-0" />
                            </Link>
                        ))
                    )
                )}

                {/* ── DESEJOS ── */}
                {activeTab === "Desejos" && (
                    loadingBookmarks ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : bookmarks.length === 0 ? (
                        <div className="text-center py-12">
                            <Bookmark className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/20 text-sm mb-4">Nenhum vídeo salvo ainda</p>
                            <Link href="/" className="text-primary text-sm font-bold hover:underline">
                                Explorar vídeos
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {bookmarks.map((bm) => {
                                const price    = bm.video.product.price;
                                const oldPrice = bm.video.product.old_price;
                                const hasDiscount = !!(oldPrice && price && oldPrice > price);
                                return (
                                    <Link
                                        key={bm.id}
                                        href={`/?video=${bm.video.id}`}
                                        className="group relative bg-black rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all aspect-[9/16]"
                                    >
                                        {/* Thumbnail */}
                                        {bm.video.thumbnail_url ? (
                                            <Image
                                                src={bm.video.thumbnail_url}
                                                alt={bm.video.product.name || "Vídeo"}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                <Play className="w-8 h-8 text-white/20" />
                                            </div>
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                        {/* Discount badge */}
                                        {hasDiscount && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg">
                                                -{Math.round((1 - price! / oldPrice!) * 100)}%
                                            </div>
                                        )}

                                        {/* Bookmark icon */}
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary/80 rounded-lg flex items-center justify-center">
                                            <Bookmark className="w-3 h-3 text-white fill-current" />
                                        </div>

                                        {/* Bottom info */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <p className="text-[9px] font-black text-white/60 truncate mb-0.5">
                                                {bm.store.name}
                                            </p>
                                            {price != null && (
                                                <div className="flex items-center gap-1.5">
                                                    {hasDiscount && (
                                                        <span className="text-[9px] text-white/40 line-through">
                                                            R$ {oldPrice!.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-black text-primary">
                                                        R$ {price.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )
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
