"use client";

import { Search, Play, Check, Sparkles, Flame, ShoppingBag, Loader2, TrendingUp, SearchX } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
    { label: "Tudo", value: "all" },
    { label: "Moda", value: "Fashion" },
    { label: "Beleza", value: "Beauty" },
    { label: "Tech", value: "Tech" },
    { label: "Casa", value: "Home" },
    { label: "Esportes", value: "Sports" },
    { label: "Alimentos", value: "Food" },
    { label: "Acess\u00f3rios", value: "Accessories" },
    { label: "Outros", value: "Other" },
];

const SORT_OPTIONS = [
    { label: "Recentes", value: "recent" },
    { label: "Menor Pre\u00e7o", value: "price_asc" },
    { label: "Maior Pre\u00e7o", value: "price_desc" },
    { label: "Popular", value: "popular" },
];

interface SearchStore {
    id: string;
    name: string;
    logo_url: string;
    username?: string;
    avatar_url?: string;
    profiles?: { username: string; avatar_url: string } | null;
}

interface SearchProduct {
    id: string;
    name: string;
    price: number;
    images: string[];
    category: string;
    video_count?: number;
    popularity?: number;
}

interface SearchVideo {
    id: string;
    video_url: string;
    description: string;
    product_id: string | null;
    product_name: string | null;
    product_price: number | null;
    product_images: string[] | null;
    like_count: number;
}

interface SearchResponse {
    stores: SearchStore[];
    products: SearchProduct[];
    videos: SearchVideo[];
}

function formatPrice(price: number | string): string {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [activeSort, setActiveSort] = useState("popular");
    const [stores, setStores] = useState<SearchStore[]>([]);
    const [products, setProducts] = useState<SearchProduct[]>([]);
    const [videos, setVideos] = useState<SearchVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    const SUGGESTIONS = ["Camiseta", "T\u00eanis", "Celular", "Bolsa", "Rel\u00f3gio"];

    // Load featured stores and trending products on mount
    useEffect(() => {
        async function loadInitial() {
            try {
                const data = await apiFetch<SearchResponse>("/api/search?sort=popular");
                setStores(data.stores || []);
                setProducts(data.products || []);
                setVideos(data.videos || []);
            } catch {
                console.error("Failed to load initial search data");
            } finally {
                setInitialLoading(false);
            }
        }
        loadInitial();
    }, []);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string, category: string, sort: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set("q", searchQuery);
            if (category !== "all") params.set("category", category);
            if (sort) params.set("sort", sort);

            const data = await apiFetch<SearchResponse>(
                `/api/search?${params.toString()}`
            );
            setProducts(data.products || []);
            setVideos(data.videos || []);
            if (searchQuery.trim()) {
                setStores(data.stores || []);
                setHasSearched(true);
            }
        } catch {
            toast.error("Erro na busca. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Search on query, category, or sort change
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query, activeCategory, activeSort);
        }, 400);

        return () => clearTimeout(timer);
    }, [query, activeCategory, activeSort, performSearch]);

    function handleSuggestionClick(term: string) {
        setQuery(term);
    }

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-32">
            {/* Search Header */}
            <header className="pt-8 pb-4 sticky top-0 bg-background-dark/80 backdrop-blur-xl z-20 border-b border-white/5">
                <div className="px-6 mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">Explorar</h1>
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>

                <div className="px-6 mb-4">
                    <div className="flex items-center bg-white/5 rounded-2xl h-14 focus-within:ring-2 focus-within:ring-primary/50 transition-all border border-white/5 group">
                        <div className="pl-5 text-white/20 group-focus-within:text-primary transition-colors">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar produtos, lojas ou tags..."
                            className="bg-transparent border-none outline-none flex-1 px-3 text-sm focus:ring-0 placeholder:text-white/10 font-medium"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-primary mr-4" />}
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar pb-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setActiveCategory(cat.value)}
                            className={`flex h-10 shrink-0 items-center justify-center rounded-full px-6 transition-all border ${activeCategory === cat.value ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-white/40'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Sort pills */}
                <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar pt-3 pb-1">
                    {SORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setActiveSort(opt.value)}
                            className={`flex h-8 shrink-0 items-center justify-center rounded-full px-4 transition-all border ${activeSort === opt.value ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/25'}`}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {initialLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <>
                    {/* Stores */}
                    {stores.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center justify-between px-8 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic">
                                        {query ? "Lojas encontradas" : "Lojas em Destaque"}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex gap-6 px-8 overflow-x-auto no-scrollbar">
                                {stores.map((store) => {
                                    const username = store.username || store.profiles?.username || store.name.toLowerCase().replace(/\s+/g, "_");
                                    return (
                                        <Link key={store.id} href={`/store/${username}`} className="flex flex-col items-center gap-3 shrink-0 group">
                                            <div className="relative w-24 h-24 p-1 rounded-[32px] bg-gradient-to-tr from-primary/50 to-orange-500/50 shadow-2xl transition-all group-hover:scale-105 active:scale-95">
                                                <div className="w-full h-full rounded-[28px] overflow-hidden relative border-4 border-background-dark bg-white/5">
                                                    {store.logo_url ? (
                                                        <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-primary">
                                                            <ShoppingBag className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-xl border-4 border-background-dark">
                                                    <Check className="w-3 h-3 stroke-[4px]" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black truncate w-24 uppercase tracking-tighter">{store.name}</p>
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">@{username}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Video results */}
                    {videos.length > 0 && (
                        <section className="mt-10 px-6">
                            <div className="flex items-center gap-2 mb-6 ml-2">
                                <Play className="w-4 h-4 text-primary fill-current" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic">
                                    V{"\u00ed"}deos encontrados
                                </h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {videos.map((video) => (
                                    <Link
                                        key={video.id}
                                        href={video.product_id ? `/checkout?id=${video.product_id}` : "#"}
                                        className="relative w-32 aspect-[9/16] rounded-2xl overflow-hidden shrink-0 border border-white/5 group"
                                    >
                                        {video.product_images?.[0] ? (
                                            <Image src={video.product_images[0]} alt={video.description || ""} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                <Play className="w-6 h-6 text-white/20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm p-1 rounded-full">
                                            <Play className="w-3 h-3 text-white fill-current" />
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-2">
                                            <p className="text-[9px] font-bold text-white line-clamp-2 leading-tight">
                                                {video.product_name || video.description}
                                            </p>
                                            {video.product_price != null && (
                                                <p className="text-[9px] font-black text-primary mt-1">
                                                    R$ {formatPrice(video.product_price)}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Products Grid */}
                    <section className="mt-12 px-6">
                        <div className="flex items-center gap-2 mb-6 ml-2">
                            {query ? (
                                <Search className="w-5 h-5 text-primary" />
                            ) : (
                                <TrendingUp className="w-5 h-5 text-orange-500" />
                            )}
                            <h2 className="text-sm font-black uppercase tracking-widest italic">
                                {query ? `Resultados para "${query}"` : "Trending"}
                            </h2>
                            {!query && products.length > 0 && (
                                <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse" />
                            )}
                        </div>

                        {products.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
                                    <SearchX className="w-8 h-8 text-white/15" />
                                </div>
                                <p className="text-white/30 text-sm font-bold mb-2">
                                    {query ? "Nenhum produto encontrado" : "Nenhum produto dispon\u00edvel"}
                                </p>
                                <p className="text-white/15 text-xs mb-6">
                                    {query
                                        ? "Tente buscar com outras palavras ou remova os filtros"
                                        : "Novos produtos ser\u00e3o adicionados em breve"}
                                </p>
                                {hasSearched && query && (
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Sugest\u00f5es</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {SUGGESTIONS.map((term) => (
                                                <button
                                                    key={term}
                                                    onClick={() => handleSuggestionClick(term)}
                                                    className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-white/30 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all"
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {products.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/checkout?id=${product.id}`}
                                        className="relative aspect-[10/16] rounded-3xl overflow-hidden group cursor-pointer border border-white/5 shadow-2xl"
                                    >
                                        {product.images?.[0] ? (
                                            <Image src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                                        ) : (
                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                <ShoppingBag className="w-10 h-10 text-white/10" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                        {/* Play icon overlay for products with videos */}
                                        {(product.video_count ?? 0) > 0 && (
                                            <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur-sm p-1.5 rounded-xl border border-white/10">
                                                <Play className="w-3.5 h-3.5 text-white fill-current" />
                                            </div>
                                        )}

                                        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                                            <span className="text-white text-[9px] font-black uppercase tracking-widest opacity-80">
                                                R$ {formatPrice(product.price)}
                                            </span>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <p className="text-white text-[11px] font-black uppercase tracking-tight line-clamp-2 leading-tight mb-3 tracking-wide">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/5 group-hover:bg-primary/20 transition-colors">
                                                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary transition-colors">
                                                    <ShoppingBag className="w-3.5 h-3.5 text-primary group-hover:text-white" />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">Ver Oferta</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            <BottomNav />
        </main>
    );
}
