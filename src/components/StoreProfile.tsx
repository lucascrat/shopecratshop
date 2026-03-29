"use client";

import { Grid, Play, Share2, Verified, ArrowLeft, Loader2, ShoppingBag, Video } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
    id: string;
    name: string;
    price: number;
    images: string[];
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

export default function StoreProfile({ username }: { username?: string }) {
    const [activeTab, setActiveTab] = useState<"products" | "videos">("products");
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [videos, setVideos] = useState<StoreVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!username) return;

        async function fetchStoreData() {
            setLoading(true);
            try {
                const data = await apiFetch<{
                    store: Store;
                    products: Product[];
                    videos: StoreVideo[];
                }>(`/api/stores?username=${username}`);

                setStore(data.store);
                setProducts(data.products || []);
                setVideos(data.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchStoreData();
    }, [username]);

    if (loading) {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    if (!store) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-xl font-bold mb-2 uppercase italic">Loja não encontrada</h2>
                <p className="text-white/40 text-sm mb-8">O link que você seguiu pode estar quebrado ou a loja foi removida.</p>
                <button onClick={() => router.back()} className="bg-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-background-dark min-h-screen text-white pb-32">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-[10px] font-black uppercase tracking-[0.2em] italic pr-8">{store.name}</h1>
                <div />
            </div>

            {/* Profile Info */}
            <div className="p-6 pt-8 flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-[40px] border-4 border-primary/20 p-2 mb-6 rotate-3">
                    <div className="w-full h-full rounded-[32px] overflow-hidden relative -rotate-3 bg-white/5">
                        {store.logo_url ? (
                            <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary">
                                <ShoppingBag className="w-10 h-10" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black italic uppercase tracking-tight">{store.name}</h1>
                    <Verified className="w-5 h-5 text-blue-400 fill-current" />
                </div>
                <p className="text-primary font-black text-xs mb-6 tracking-widest uppercase">@{username}</p>

                <div className="flex gap-10 mb-8 w-full justify-center">
                    <div className="text-center">
                        <p className="font-black text-xl italic leading-none mb-1">1.2K</p>
                        <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.2em]">Seguidores</p>
                    </div>
                    <div className="text-center border-x border-white/5 px-10">
                        <p className="font-black text-xl italic leading-none mb-1">{products.length}</p>
                        <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.2em]">Produtos</p>
                    </div>
                    <div className="text-center">
                        <p className="font-black text-xl italic leading-none mb-1">{videos.length}</p>
                        <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.2em]">Vídeos</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full px-4">
                    <button className="flex-grow bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase text-xs tracking-[0.2em] active:scale-95">
                        Seguir Loja
                    </button>
                    <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-all">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Description */}
            {store.description && (
                <div className="px-8 mb-10 text-center">
                    <p className="text-sm text-white/50 leading-relaxed font-medium italic">
                        &ldquo;{store.description}&rdquo;
                    </p>
                </div>
            )}

            {/* Tabs: Produtos | Vídeos */}
            <div className="border-t border-white/5">
                <div className="flex bg-white/5 m-4 p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab("products")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/20 hover:text-white'}`}
                    >
                        <Grid className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Produtos</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("videos")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'videos' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/20 hover:text-white'}`}
                    >
                        <Video className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Vídeos</span>
                    </button>
                </div>

                {/* Products Tab */}
                {activeTab === "products" && (
                    <>
                        {products.length === 0 ? (
                            <div className="p-20 text-center">
                                <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-4" />
                                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Nenhum produto listado</p>
                            </div>
                        ) : (
                            <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                                {products.map((product) => (
                                    <Link
                                        href={`/checkout?id=${product.id}`}
                                        key={product.id}
                                        className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden flex flex-col hover:border-white/10 transition-all group"
                                    >
                                        <div className="relative aspect-square shrink-0 overflow-hidden bg-black/40">
                                            {product.images?.[0] && (
                                                <Image src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col justify-between flex-grow">
                                            <div>
                                                <h3 className="text-[10px] font-black line-clamp-2 mb-1 uppercase tracking-tight leading-tight text-white/80">{product.name}</h3>
                                                <p className="text-primary font-black text-lg italic">R$ {parseFloat(String(product.price || 0)).toFixed(2)}</p>
                                            </div>
                                            <div className="mt-4 w-full bg-white/5 group-hover:bg-primary group-hover:text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all text-center text-white/40">
                                                Comprar
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Videos Tab */}
                {activeTab === "videos" && (
                    <>
                        {videos.length === 0 ? (
                            <div className="p-20 text-center">
                                <Video className="w-10 h-10 text-white/10 mx-auto mb-4" />
                                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Nenhum vídeo publicado</p>
                            </div>
                        ) : (
                            <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                                {videos.map((vid) => (
                                    <div
                                        key={vid.id}
                                        className="relative aspect-[9/16] rounded-3xl overflow-hidden group cursor-pointer border border-white/5 bg-black/40"
                                    >
                                        {/* Video thumbnail */}
                                        <video
                                            src={vid.video_url}
                                            className="w-full h-full object-cover"
                                            muted
                                            preload="metadata"
                                            playsInline
                                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                            onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                                        {/* Play icon */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                                                <Play className="w-6 h-6 text-white fill-current" />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                                            <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow-lg">
                                                {vid.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
