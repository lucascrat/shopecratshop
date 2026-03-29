"use client";

import {
    Grid3X3, Play, Share2, ArrowLeft, Loader2, ShoppingBag,
    Video, Search, X, Star, Zap, ChevronRight, Store,
    Phone, MapPin, Clock, CheckCircle2, Package
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Product {
    id: string;
    name: string;
    price: number;
    old_price?: number;
    images: string[];
    description?: string;
    stock?: number;
}

interface StoreVideo {
    id: string;
    video_url: string;
    description: string;
    product_id: string;
    created_at: string;
}

interface Store {
    id: string;
    name: string;
    description: string;
    logo_url: string;
    owner_id: string;
}

type TabType = "products" | "videos";

export default function StoreProfile({ username }: { username?: string }) {
    const [activeTab, setActiveTab] = useState<TabType>("products");
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [videos, setVideos] = useState<StoreVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!username) return;
        async function fetchStoreData() {
            setLoading(true);
            try {
                const data = await apiFetch<{ store: Store; products: Product[]; videos: StoreVideo[] }>(
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
                {/* Banner gradient */}
                <div className="h-36 bg-gradient-to-br from-[#f46a25]/20 via-[#f46a25]/5 to-transparent relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#f46a2530_0%,_transparent_70%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0d0d] to-transparent" />
                </div>

                {/* Logo + Info */}
                <div className="px-5 pb-5 -mt-10 relative">
                    <div className="flex items-end gap-4 mb-4">
                        {/* Logo */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-[24px] border-4 border-[#0d0d0d] bg-white/10 overflow-hidden shadow-2xl">
                                {store.logo_url ? (
                                    <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
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
                    <button className="w-full bg-[#f46a25] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#f46a25]/25 active:scale-95 transition-all">
                        Seguir Loja
                    </button>
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
                    {/* Search result count */}
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
                                        href={`/checkout?id=${product.id}`}
                                        key={product.id}
                                        className="group flex flex-col bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#f46a25]/30 hover:bg-white/[0.07] transition-all active:scale-95"
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-square bg-black/30 overflow-hidden">
                                            {hasImage ? (
                                                <Image
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ShoppingBag className="w-8 h-8 text-white/10" />
                                                </div>
                                            )}

                                            {/* Discount badge */}
                                            {discount && (
                                                <div className="absolute top-2 left-2 bg-[#f46a25] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                                    -{discount}%
                                                </div>
                                            )}

                                            {/* Out of stock */}
                                            {product.stock === 0 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-[10px] text-white/60 font-black uppercase tracking-wider">Esgotado</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="text-[11px] font-bold text-white/80 line-clamp-2 leading-snug mb-2 flex-1">
                                                {product.name}
                                            </h3>

                                            <div className="mt-auto">
                                                {product.old_price && product.old_price > product.price && (
                                                    <p className="text-[10px] text-white/30 line-through leading-none">
                                                        R$ {product.old_price.toFixed(2)}
                                                    </p>
                                                )}
                                                <p className="text-[#f46a25] font-black text-base leading-tight">
                                                    R$ {product.price.toFixed(2)}
                                                </p>

                                                {/* Buy button */}
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
                                    className="relative aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.06] bg-black/30"
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
