"use client";

import {
    Grid3X3, Play, Share2, ArrowLeft, Loader2, ShoppingBag,
    Video, Search, X, Star, ChevronRight, Store,
    CheckCircle2, Package, Trash2, Camera, AlertTriangle
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

interface Product {
    id: string;
    name: string;
    price: number;
    old_price?: number;
    images: string[];
    description?: string;
    stock?: number;
    avg_rating?: number;
    reviews_count?: number;
}

interface StoreVideo {
    id: string;
    video_url: string;
    description: string;
    product_id: string;
    created_at: string;
}

interface StoreData {
    id: string;
    name: string;
    description: string;
    logo_url: string;
    banner_url?: string;
    merchant_id: string;
}

type TabType = "products" | "videos";

export default function StoreProfile({ username }: { username?: string }) {
    const [activeTab, setActiveTab] = useState<TabType>("products");
    const [store, setStore] = useState<StoreData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [videos, setVideos] = useState<StoreVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    // Owner-only state
    const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (!username) return;
        async function fetchStoreData() {
            setLoading(true);
            try {
                const data = await apiFetch<{ store: StoreData; products: Product[]; videos: StoreVideo[] }>(
                    `/api/stores?username=${username}`
                );
                setStore(data.store);
                setProducts((data.products || []).map(p => ({
                    ...p,
                    price: parseFloat(String(p.price || 0)),
                    old_price: p.old_price ? parseFloat(String(p.old_price)) : undefined,
                })));
                setVideos(data.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchStoreData();
    }, [username]);

    const isOwner = !!(user && store && user.id === store.merchant_id);

    const filteredProducts = useMemo(() => {
        if (!search.trim()) return products;
        const q = search.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(q));
    }, [products, search]);

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: store?.name, url }).catch(() => {});
        } else {
            await navigator.clipboard.writeText(url);
            toast.success("Link da loja copiado!");
        }
    };

    // ── Delete video ──
    async function handleDeleteVideo(videoId: string) {
        setDeletingVideoId(videoId);
        try {
            await apiFetch(`/api/videos/${videoId}`, { method: "DELETE" });
            setVideos(prev => prev.filter(v => v.id !== videoId));
            toast.success("Vídeo excluído!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao excluir vídeo");
        } finally {
            setDeletingVideoId(null);
            setConfirmDeleteId(null);
        }
    }

    // ── Upload banner ──
    async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Selecione uma imagem");
            return;
        }
        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "image");

            const token = localStorage.getItem("auth_token");
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro no upload");

            const bannerUrl = data.url;
            await apiFetch("/api/merchant/store", {
                method: "PATCH",
                body: JSON.stringify({ bannerUrl }),
            });
            setStore(prev => prev ? { ...prev, banner_url: bannerUrl } : prev);
            toast.success("Capa da loja atualizada!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar imagem");
        } finally {
            setUploadingBanner(false);
            if (bannerInputRef.current) bannerInputRef.current.value = "";
        }
    }

    if (loading) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#f46a25]" />
            </div>
        );
    }

    if (!store) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-xl font-bold mb-2">Loja não encontrada</h2>
                <p className="text-white/40 text-sm mb-8">O link pode estar quebrado ou a loja foi removida.</p>
                <button onClick={() => router.back()} className="bg-[#f46a25] px-8 py-3 rounded-xl font-bold text-sm">
                    Voltar
                </button>
            </div>
        );
    }

    const totalDiscount = products.filter(p => p.old_price && p.old_price > p.price).length;

    return (
        <div className="bg-[#0d0d0d] min-h-screen text-white pb-24">

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => router.back()} className="p-2 -ml-1 text-white/50 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest truncate max-w-[160px]">{store.name}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 text-white/50 hover:text-white transition-colors"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                        <button onClick={handleShare} className="p-2 text-white/50 hover:text-white transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                {showSearch && (
                    <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <Search className="w-4 h-4 text-white/30 shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar produtos na loja..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/25"
                            />
                            {search && (
                                <button onClick={() => setSearch("")}>
                                    <X className="w-4 h-4 text-white/30" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Store Hero ── */}
            <div className="relative">
                {/* Banner — clickable for owner */}
                <div className="relative h-36 overflow-hidden">
                    {store.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={store.banner_url}
                            alt="Capa da loja"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#f46a25]/20 via-[#f46a25]/5 to-transparent">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#f46a2530_0%,_transparent_70%)]" />
                        </div>
                    )}
                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0d0d] to-transparent" />

                    {/* Banner edit button — owner only */}
                    {isOwner && (
                        <>
                            <input
                                ref={bannerInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBannerUpload}
                            />
                            <button
                                onClick={() => bannerInputRef.current?.click()}
                                disabled={uploadingBanner}
                                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl hover:bg-black/80 transition-all disabled:opacity-50"
                            >
                                {uploadingBanner
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Camera className="w-3.5 h-3.5" />}
                                {uploadingBanner ? "Enviando..." : "Alterar capa"}
                            </button>
                        </>
                    )}
                </div>

                {/* Logo + Info */}
                <div className="px-5 pb-5 -mt-10 relative">
                    <div className="flex items-end gap-4 mb-4">
                        {/* Logo */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-[24px] border-4 border-[#0d0d0d] bg-white/10 overflow-hidden shadow-2xl">
                                {store.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#f46a25]/10">
                                        <Store className="w-8 h-8 text-[#f46a25]" />
                                    </div>
                                )}
                            </div>
                            {/* Verified badge */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f46a25] rounded-full flex items-center justify-center border-2 border-[#0d0d0d]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-current" />
                            </div>
                        </div>

                        {/* Name & username */}
                        <div className="flex-1 min-w-0 pb-1">
                            <h1 className="text-xl font-black tracking-tight leading-tight">{store.name}</h1>
                            <p className="text-[#f46a25] text-xs font-bold">@{username}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {store.description && (
                        <p className="text-sm text-white/50 leading-relaxed mb-4">{store.description}</p>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                            <p className="text-lg font-black text-white">{products.length}</p>
                            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Produtos</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                            <p className="text-lg font-black text-white">{videos.length}</p>
                            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Vídeos</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                            <p className="text-lg font-black text-[#f46a25]">{totalDiscount}</p>
                            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Promoções</p>
                        </div>
                    </div>

                    {/* Action button */}
                    {isOwner ? (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                            <Store className="w-4 h-4 text-[#f46a25]" />
                            <span className="text-xs font-black text-white/50 uppercase tracking-wider">Você é o dono desta loja</span>
                        </div>
                    ) : (
                        <button className="w-full bg-[#f46a25] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#f46a25]/25 active:scale-95 transition-all">
                            Seguir Loja
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="px-4 pb-2">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab("products")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider ${activeTab === 'products' ? 'bg-[#f46a25] text-white shadow-md shadow-[#f46a25]/20' : 'text-white/30 hover:text-white/60'}`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                        Produtos ({products.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("videos")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider ${activeTab === 'videos' ? 'bg-[#f46a25] text-white shadow-md shadow-[#f46a25]/20' : 'text-white/30 hover:text-white/60'}`}
                    >
                        <Video className="w-4 h-4" />
                        Vídeos ({videos.length})
                    </button>
                </div>
            </div>

            {/* ── Products Tab ── */}
            {activeTab === "products" && (
                <div className="px-4 pt-2">
                    {search && (
                        <p className="text-xs text-white/30 mb-3 font-medium">
                            {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""} para &quot;{search}&quot;
                        </p>
                    )}

                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Package className="w-8 h-8 text-white/15" />
                            </div>
                            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">
                                {search ? "Nenhum produto encontrado" : "Nenhum produto listado"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {filteredProducts.map((product) => {
                                const discount = product.old_price && product.old_price > product.price
                                    ? Math.round((1 - product.price / product.old_price) * 100)
                                    : null;
                                const hasImage = product.images?.[0];

                                return (
                                    <Link
                                        href={`/product/${product.id}`}
                                        key={product.id}
                                        className="group flex flex-col bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#f46a25]/30 hover:bg-white/[0.07] transition-all active:scale-95"
                                    >
                                        <div className="relative aspect-square bg-black/30 overflow-hidden">
                                            {hasImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ShoppingBag className="w-8 h-8 text-white/10" />
                                                </div>
                                            )}
                                            {discount && (
                                                <div className="absolute top-2 left-2 bg-[#f46a25] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                                    -{discount}%
                                                </div>
                                            )}
                                            {product.stock === 0 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-[10px] text-white/60 font-black uppercase tracking-wider">Esgotado</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="text-[11px] font-bold text-white/80 line-clamp-2 leading-snug mb-2 flex-1">
                                                {product.name}
                                            </h3>
                                            <div className="mt-auto">
                                                {product.avg_rating && product.avg_rating > 0 ? (
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        <span className="text-[10px] text-yellow-400 font-bold">{Number(product.avg_rating).toFixed(1)}</span>
                                                        <span className="text-[9px] text-white/25">({product.reviews_count})</span>
                                                    </div>
                                                ) : null}
                                                {product.old_price && product.old_price > product.price && (
                                                    <p className="text-[10px] text-white/30 line-through leading-none">
                                                        R$ {product.old_price.toFixed(2)}
                                                    </p>
                                                )}
                                                <p className="text-[#f46a25] font-black text-base leading-tight">
                                                    R$ {product.price.toFixed(2)}
                                                </p>
                                                <div className={`mt-2 w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition-all
                                                    ${product.stock === 0
                                                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                        : 'bg-[#f46a25]/10 text-[#f46a25] group-hover:bg-[#f46a25] group-hover:text-white'
                                                    }`}>
                                                    {product.stock === 0 ? "Esgotado" : "Comprar"}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Videos Tab ── */}
            {activeTab === "videos" && (
                <div className="px-4 pt-2">
                    {isOwner && videos.length > 0 && (
                        <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mb-3 text-center">
                            Toque no lixo para excluir um vídeo
                        </p>
                    )}
                    {videos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Video className="w-8 h-8 text-white/15" />
                            </div>
                            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">
                                Nenhum vídeo publicado
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {videos.map((vid) => (
                                <div
                                    key={vid.id}
                                    className="relative aspect-[9/16] rounded-2xl overflow-hidden group border border-white/[0.06] bg-black/30"
                                >
                                    <video
                                        src={vid.video_url}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                        playsInline
                                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                        onMouseLeave={(e) => {
                                            const v = e.target as HTMLVideoElement;
                                            v.pause();
                                            v.currentTime = 0;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                                    {/* Play icon */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/20">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    </div>

                                    {/* Caption */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                                        <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight drop-shadow-lg">
                                            {vid.description}
                                        </p>
                                    </div>

                                    {/* ── Delete button — owner only ── */}
                                    {isOwner && (
                                        <div className="absolute top-2 right-2 z-10">
                                            {confirmDeleteId === vid.id ? (
                                                /* Confirmation mini-panel */
                                                <div className="flex flex-col gap-1.5 items-end animate-in zoom-in duration-150">
                                                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-xl px-2 py-1.5 border border-red-500/30">
                                                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                                        <span className="text-[9px] text-red-300 font-black">Excluir?</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="bg-black/70 backdrop-blur-md border border-white/20 text-white/60 text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg"
                                                        >
                                                            Não
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVideo(vid.id)}
                                                            disabled={deletingVideoId === vid.id}
                                                            className="bg-red-500 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            {deletingVideoId === vid.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Trash2 className="w-3 h-3" />}
                                                            Sim
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(vid.id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Confirm Delete Overlay (click outside to close) ── */}
            {confirmDeleteId && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => setConfirmDeleteId(null)}
                />
            )}
        </div>
    );
}
