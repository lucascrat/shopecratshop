"use client";

import { useAuth } from "@/components/AuthProvider";
import {
    Plus,
    LayoutDashboard,
    Package,
    Video,
    TrendingUp,
    ChevronRight,
    BarChart3,
    ShoppingBag,
    Bell,
    ArrowLeft,
    Loader2,
    Camera,
    Pencil,
    X,
    Save,
    Store,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

interface StoreInfo {
    id: string;
    name: string;
    description: string;
    logo_url: string | null;
}

interface DashboardData {
    store: StoreInfo;
    totalSales: number;
    totalOrders: number;
    totalViews: number;
    recentProducts: Array<Product & { salesCount: number }>;
}

export default function MerchantDashboard() {
    const { profile, user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    // Store profile edit state
    const [showEditStore, setShowEditStore] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [savingStore, setSavingStore] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        fetchDashboard();
    }, [user]);

    async function fetchDashboard() {
        setLoading(true);
        try {
            const data = await apiFetch<{
                store: StoreInfo;
                products: Product[];
                totalSales: number;
                totalOrders: number;
                totalVideos: number;
                estimatedViews: number;
            }>("/api/merchant/dashboard");

            const recentProducts: Array<Product & { salesCount: number }> = (data.products || []).map((p) => ({
                ...p,
                salesCount: Math.floor(data.totalOrders / Math.max((data.products || []).length, 1)),
            }));

            setDashboard({
                store: data.store,
                totalSales: data.totalSales,
                totalOrders: data.totalOrders,
                totalViews: data.estimatedViews,
                recentProducts,
            });
        } catch (err) {
            console.error("Failed to load dashboard:", err);
        } finally {
            setLoading(false);
        }
    }

    function openEditStore() {
        if (!dashboard) return;
        setEditName(dashboard.store.name);
        setEditDescription(dashboard.store.description || "");
        setEditLogoUrl(dashboard.store.logo_url || null);
        setShowEditStore(true);
    }

    async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const form = new FormData();
            form.append("action", "upload-file");
            form.append("file", file);
            form.append("folder", "logos");

            const token = localStorage.getItem("token");
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: form,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro no upload");
            setEditLogoUrl(data.url);
            toast.success("Logo carregada!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao carregar logo");
        } finally {
            setUploadingLogo(false);
        }
    }

    async function saveStoreProfile() {
        setSavingStore(true);
        try {
            const res = await apiFetch<{ store: StoreInfo }>("/api/merchant/store", {
                method: "PATCH",
                body: JSON.stringify({
                    name: editName,
                    description: editDescription,
                    logoUrl: editLogoUrl,
                }),
            });

            setDashboard((prev) => prev ? { ...prev, store: res.store } : prev);
            setShowEditStore(false);
            toast.success("Perfil da loja atualizado!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setSavingStore(false);
        }
    }

    if (loading) {
        return (
            <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </main>
        );
    }

    const store = dashboard?.store;
    const storeName = store?.name || "Painel do Vendedor";
    const totalSales = dashboard?.totalSales || 0;
    const totalOrders = dashboard?.totalOrders || 0;
    const totalViews = dashboard?.totalViews || 0;
    const recentProducts = dashboard?.recentProducts || [];

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-32">
            {/* Header */}
            <header className="p-6 pt-10 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => router.push('/profile')} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-white/40 hover:text-white relative">
                            <Bell className="w-6 h-6" />
                            {totalOrders > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />}
                        </button>
                        {/* Store logo avatar — click to edit */}
                        <button
                            onClick={openEditStore}
                            className="relative w-10 h-10 rounded-2xl border-2 border-primary/30 overflow-hidden bg-white/5 rotate-3 p-0.5 hover:border-primary transition-colors group"
                        >
                            <div className="w-full h-full rounded-[14px] overflow-hidden -rotate-3 relative">
                                {store?.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={store.logo_url}
                                        alt={storeName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                        <Store className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                <Camera className="w-3 h-3 text-white" />
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-1">
                            {storeName}
                        </h1>
                        <p className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">Status: Verificado • Loja Oficial</p>
                    </div>
                    <button
                        onClick={openEditStore}
                        className="mt-1 p-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all text-white/30 hover:text-primary"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Stats Card */}
            <section className="px-6 -mt-4 mb-8">
                <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 rounded-[32px] p-6 shadow-2xl shadow-primary/10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Vendas Totais (Mês)</p>
                            <h2 className="text-3xl font-black italic">R$ {parseFloat(String(totalSales || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
                        </div>
                        <div className="bg-primary/20 p-3 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Pedidos</p>
                            <p className="text-xl font-black italic">{totalOrders}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Visitas</p>
                            <p className="text-xl font-black italic">{totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions Grid */}
            <section className="px-6 mb-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 px-2">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/merchant/add-product" className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-tight">Novo Produto</span>
                    </Link>
                    <button
                        onClick={openEditStore}
                        className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/20 transition-colors">
                            <Store className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-tight">Perfil da Loja</span>
                    </button>
                    <button className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/20 transition-colors">
                            <ShoppingBag className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-tight">Pedidos Ativos</span>
                    </button>
                    <button className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/20 transition-colors">
                            <BarChart3 className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-tight">Relatórios</span>
                    </button>
                </div>
            </section>

            {/* Recent Products */}
            <section className="px-6 pb-12">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Produtos Recentes</h3>
                    <Link href="/merchant/stock" className="text-primary text-[10px] font-black uppercase tracking-widest">Ver Todos</Link>
                </div>

                <div className="space-y-4">
                    {recentProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/20 text-sm mb-4">Nenhum produto cadastrado ainda</p>
                            <Link href="/merchant/add-product" className="text-primary text-sm font-bold hover:underline">
                                Adicionar primeiro produto
                            </Link>
                        </div>
                    ) : (
                        recentProducts.map((prod) => (
                            <div key={prod.id} className="bg-white/5 rounded-3xl p-4 flex items-center gap-5 group cursor-pointer border border-white/0 hover:border-white/10 transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-black/40 overflow-hidden relative shrink-0">
                                    {prod.images?.[0] && (
                                        <Image src={prod.images[0]} alt={prod.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-black uppercase tracking-tight text-white/80 truncate mb-1">{prod.name}</h4>
                                    <div className="flex items-center justify-between">
                                        <p className="text-primary font-black text-sm italic">R$ {parseFloat(String(prod.price || 0)).toFixed(2)}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20">{prod.salesCount} Vendas</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/5 group-hover:text-primary transition-colors" />
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Merchant Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background-dark/95 backdrop-blur-3xl border-t border-white/5 h-24 flex items-center justify-around px-8 pb-6 z-50">
                <div className="flex flex-col items-center gap-1.5 text-primary">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mb-1" />
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
                </div>
                <Link href="/merchant/stock" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <Package className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Estoque</span>
                </Link>
                <Link href="/" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <Video className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Feed</span>
                </Link>
                <div className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors cursor-pointer">
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Analítico</span>
                </div>
            </nav>

            {/* Edit Store Profile Sheet */}
            {showEditStore && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowEditStore(false)}
                    />

                    {/* Sheet */}
                    <div className="relative bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 pb-10 space-y-6 max-h-[90vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto -mt-1 mb-2" />

                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-tight">Perfil da Loja</h2>
                            <button
                                onClick={() => setShowEditStore(false)}
                                className="p-2 text-white/30 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Logo Upload */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="w-28 h-28 rounded-[32px] border-2 border-primary/30 overflow-hidden bg-white/5">
                                    {editLogoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={editLogoUrl}
                                            alt="Logo da loja"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                            <Store className="w-10 h-10 text-white/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Upload button overlay */}
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {uploadingLogo ? (
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                        <Camera className="w-5 h-5 text-white" />
                                    )}
                                </button>

                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleLogoChange}
                                />
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-bold text-white/60">Logo da Loja</p>
                                <p className="text-[10px] text-white/20 mt-0.5">JPG, PNG ou WEBP · Máx 10MB</p>
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">
                                Nome da Loja
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={60}
                                placeholder="Ex: Minha Loja Incrível"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                            />
                            <p className="text-[9px] text-white/20 mt-1 text-right">{editName.length}/60</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">
                                Descrição
                            </label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                maxLength={200}
                                rows={3}
                                placeholder="Conte um pouco sobre sua loja..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20 resize-none"
                            />
                            <p className="text-[9px] text-white/20 mt-1 text-right">{editDescription.length}/200</p>
                        </div>

                        {/* Save */}
                        <button
                            onClick={saveStoreProfile}
                            disabled={savingStore || uploadingLogo || !editName.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 disabled:opacity-40 active:scale-95 transition-all"
                        >
                            {savingStore ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Salvar Perfil
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
