"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import {
    ArrowLeft, Star, ShoppingBag, Share2, Heart, ChevronRight,
    Store, Shield, Truck, RotateCcw, MessageCircle,
    Loader2, Send, X, Check, Package,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Review {
    id: string;
    rating: number;
    text: string;
    images: string[];
    video_url?: string;
    reviewer_username: string;
    reviewer_name: string;
    reviewer_avatar?: string;
    created_at: string;
    helpful_count?: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    old_price?: number;
    stock: number;
    images: string[];
    colors?: { name: string; hex: string }[];
    sizes?: string[];
    avg_rating: number;
    reviews_count: number;
    sales_count: number;
    store: {
        id: string;
        name: string;
        logo_url?: string;
        username: string;
    };
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [ratingDist, setRatingDist] = useState<Record<number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    // ── Urgency / scarcity state ──
    const [timeLeft, setTimeLeft] = useState(0);
    const [viewing, setViewing] = useState(() => Math.floor(Math.random() * 18) + 7);
    const [liked, setLiked] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [newText, setNewText] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [activeTab, setActiveTab] = useState<"desc" | "reviews">("desc");

    const carouselRef = useRef<HTMLDivElement>(null);
    const thumbsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const [prodData, revData] = await Promise.all([
                    apiFetch<{ product: Product }>(`/api/products?id=${id}`),
                    apiFetch<{ reviews: Review[]; total: number; ratingDistribution: Record<number, number> }>(
                        `/api/products/${id}/reviews?limit=5`
                    ).catch(() => ({ reviews: [], total: 0, ratingDistribution: { 5:0,4:0,3:0,2:0,1:0 } })),
                ]);
                // Normalize: general route returns flat fields, specific route returns nested store object
                const raw = prodData.product as any;
                const normalized: Product = {
                    ...raw,
                    price: parseFloat(String(raw.price || 0)),
                    old_price: raw.old_price ? parseFloat(String(raw.old_price)) : undefined,
                    avg_rating: parseFloat(String(raw.avg_rating || 0)),
                    reviews_count: parseInt(String(raw.reviews_count || 0)),
                    sales_count: parseInt(String(raw.sales_count || 0)),
                    images: Array.isArray(raw.images) ? raw.images : [],
                    store: raw.store || {
                        id: raw.store_id,
                        name: raw.store_name,
                        logo_url: raw.store_logo,
                        username: raw.store_username,
                    },
                };
                setProduct(normalized);
                setReviews(revData.reviews || []);
                setTotalReviews(revData.total || 0);
                setRatingDist(revData.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    // ── Countdown timer (resets every session) ──
    useEffect(() => {
        if (!id) return;
        const key = `offer_timer_${id}`;
        const stored = sessionStorage.getItem(key);
        const initial = stored ? parseInt(stored) : Math.floor(Math.random() * 420) + 480; // 8–15 min
        setTimeLeft(initial > 0 ? initial : 600);
        const iv = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev <= 1 ? 600 : prev - 1;
                sessionStorage.setItem(key, String(next));
                return next;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [id]);

    // ── Viewers counter (fluctuates realistically) ──
    useEffect(() => {
        const iv = setInterval(() => {
            setViewing(v => Math.max(3, v + (Math.random() > 0.5 ? 1 : -1)));
        }, 4000);
        return () => clearInterval(iv);
    }, []);

    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // Sync carousel scroll → activeImage dot
    const handleCarouselScroll = useCallback(() => {
        if (!carouselRef.current || !product) return;
        const { scrollLeft, clientWidth } = carouselRef.current;
        const index = Math.round(scrollLeft / clientWidth);
        setActiveImage(index);
        // Scroll thumbnail into view
        if (thumbsRef.current) {
            const thumb = thumbsRef.current.children[index] as HTMLElement;
            if (thumb) thumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [product]);

    // Click thumbnail → scroll carousel
    const goToImage = (index: number) => {
        if (!carouselRef.current) return;
        carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: "smooth" });
        setActiveImage(index);
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: product?.name, url }).catch(() => { });
        } else {
            await navigator.clipboard.writeText(url);
        }
    };

    const handleBuy = () => {
        if (!product) return;
        const qs = new URLSearchParams({ productId: product.id, qty: String(qty) });
        if (selectedColor) qs.set("color", selectedColor);
        if (selectedSize) qs.set("size", selectedSize);
        router.push(`/checkout?${qs.toString()}`);
    };

    const handleSubmitReview = async () => {
        if (!newText.trim()) return;
        setSubmittingReview(true);
        try {
            await apiFetch(`/api/products/${id}/reviews`, {
                method: "POST",
                body: JSON.stringify({ rating: newRating, text: newText }),
            });
            setReviewSuccess(true);
            setShowReviewForm(false);
            setNewText("");
            const [revData, prodData] = await Promise.all([
                apiFetch<{ reviews: Review[]; total: number; ratingDistribution: Record<number, number> }>(`/api/products/${id}/reviews?limit=5`),
                apiFetch<{ product: Product }>(`/api/products?id=${id}`),
            ]);
            setReviews(revData.reviews || []);
            setTotalReviews(revData.total || 0);
            setRatingDist(revData.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
            const raw2 = prodData.product as any;
            setProduct({
                ...raw2,
                price: parseFloat(String(raw2.price || 0)),
                old_price: raw2.old_price ? parseFloat(String(raw2.old_price)) : undefined,
                avg_rating: parseFloat(String(raw2.avg_rating || 0)),
                reviews_count: parseInt(String(raw2.reviews_count || 0)),
                sales_count: parseInt(String(raw2.sales_count || 0)),
                images: Array.isArray(raw2.images) ? raw2.images : [],
                store: raw2.store || { id: raw2.store_id, name: raw2.store_name, logo_url: raw2.store_logo, username: raw2.store_username },
            });
        } catch (e: any) {
            alert(e.message || "Erro ao enviar avaliação");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#f46a25]" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen flex flex-col items-center justify-center text-white p-8 text-center">
                <ShoppingBag className="w-16 h-16 text-white/10 mb-4" />
                <h2 className="text-xl font-bold mb-2">Produto não encontrado</h2>
                <button onClick={() => router.back()} className="mt-4 bg-[#f46a25] px-6 py-3 rounded-xl font-bold text-sm">Voltar</button>
            </div>
        );
    }

    const discount = product.old_price && product.old_price > product.price
        ? Math.round((1 - product.price / product.old_price) * 100) : null;
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
    const images = product.images?.length ? product.images : [];

    return (
        <div className="bg-[#0d0d0d] min-h-screen text-white pb-32 max-w-[430px] mx-auto">
        <style>{`
            @keyframes fire-flicker {
                0%,100% { transform: scale(1) rotate(-3deg); filter: brightness(1); }
                20%     { transform: scale(1.15) rotate(3deg); filter: brightness(1.3); }
                40%     { transform: scale(0.92) rotate(-2deg); filter: brightness(0.9); }
                60%     { transform: scale(1.1) rotate(2deg); filter: brightness(1.2); }
                80%     { transform: scale(0.95) rotate(-1deg); filter: brightness(1); }
            }
            .fire-icon { animation: fire-flicker 0.8s ease-in-out infinite; display:inline-block; transform-origin: bottom center; }
            @keyframes digit-pop {
                0%,100% { transform: scale(1); }
                50%     { transform: scale(1.15); }
            }
        `}</style>

            {/* ── Header ── */}
            <div className="sticky top-0 z-40 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 py-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-white/50 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[200px]">{product.name}</span>
                <div className="flex gap-1">
                    <button onClick={() => setLiked(!liked)} className="p-2 text-white/50 hover:text-white">
                        <Heart className={`w-5 h-5 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : ""}`} />
                    </button>
                    <button onClick={handleShare} className="p-2 text-white/50 hover:text-white">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── Image Carousel (horizontal scroll-snap) ── */}
            <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
                {images.length > 0 ? (
                    <div
                        ref={carouselRef}
                        onScroll={handleCarouselScroll}
                        className="w-full h-full flex overflow-x-auto scroll-smooth"
                        style={{
                            scrollSnapType: "x mandatory",
                            WebkitOverflowScrolling: "touch",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}
                    >
                        {images.map((img, i) => (
                            <div
                                key={i}
                                className="shrink-0 w-full h-full"
                                style={{ scrollSnapAlign: "start" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <ShoppingBag className="w-20 h-20 text-white/10" />
                    </div>
                )}

                {/* Discount badge */}
                {discount && (
                    <div className={`absolute top-3 left-3 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-1 ${
                        discount >= 30
                            ? "bg-gradient-to-r from-red-600 to-orange-500 shadow-orange-500/40 shadow-lg"
                            : "bg-[#f46a25]"
                    }`}>
                        {discount >= 30 && <span className="fire-icon text-sm">🔥</span>}
                        -{discount}%
                    </div>
                )}

                {/* Out of stock overlay */}
                {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                        <span className="text-white font-black uppercase tracking-widest text-sm bg-black/50 px-4 py-2 rounded-full">Esgotado</span>
                    </div>
                )}

                {/* Dot indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                        {images.map((_, i) => (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-300 ${
                                    i === activeImage
                                        ? "bg-[#f46a25] w-4 h-1.5"
                                        : "w-1.5 h-1.5 bg-white/30"
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Image counter */}
                {images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full pointer-events-none">
                        {activeImage + 1}/{images.length}
                    </div>
                )}
            </div>

            {/* ── Thumbnail strip (horizontal scroll) ── */}
            {images.length > 1 && (
                <div
                    ref={thumbsRef}
                    className="flex gap-2 px-4 py-3 overflow-x-auto"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => goToImage(i)}
                            className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                i === activeImage
                                    ? "border-[#f46a25] opacity-100 scale-105"
                                    : "border-white/10 opacity-50 hover:opacity-80"
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── Product Info ── */}
            <div className="px-4 pt-2">
                <h1 className="text-lg font-black leading-snug mb-1">{product.name}</h1>

                {/* Rating + Sales */}
                <div className="flex items-center gap-3 mb-3">
                    {product.avg_rating > 0 ? (
                        <div className="flex items-center gap-1.5">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(product.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
                                ))}
                            </div>
                            <span className="text-yellow-400 text-xs font-bold">{product.avg_rating.toFixed(1)}</span>
                            <button
                                onClick={() => setActiveTab("reviews")}
                                className="text-white/30 text-xs underline underline-offset-2"
                            >
                                ({product.reviews_count} avaliações)
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setActiveTab("reviews")}
                            className="text-white/30 text-xs"
                        >
                            Sem avaliações ainda
                        </button>
                    )}
                    {product.sales_count > 0 && (
                        <span className="text-white/30 text-xs">· {product.sales_count} vendidos</span>
                    )}
                </div>

                {/* Price */}
                <div className="flex items-end gap-3 mb-4">
                    <span className="text-3xl font-black text-[#f46a25]">R$ {product.price.toFixed(2)}</span>
                    {product.old_price && product.old_price > product.price && (
                        <div className="flex flex-col pb-1">
                            <span className="text-white/30 text-sm line-through leading-none">R$ {product.old_price.toFixed(2)}</span>
                            {discount && (
                                <span className="text-green-400 text-[10px] font-bold">
                                    Economize R$ {(product.old_price - product.price).toFixed(2)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── URGENCY BLOCK ── */}

                {/* Countdown timer — shown only when discount exists */}
                {discount && timeLeft > 0 && (
                    <div className="relative overflow-hidden rounded-2xl mb-4 border border-red-500/30"
                        style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(234,88,12,0.15) 100%)" }}>
                        {/* animated left bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-red-500 to-orange-500 animate-pulse" />
                        <div className="flex items-center gap-3 px-4 py-3 pl-5">
                            {/* fire icon with flicker */}
                            <span className="text-2xl fire-icon shrink-0">🔥</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-red-400 uppercase tracking-widest leading-none mb-0.5">Oferta relâmpago!</p>
                                <p className="text-[10px] text-white/40 leading-none">Preço especial acaba em</p>
                            </div>
                            {/* countdown digits */}
                            <div className="flex items-center gap-1 shrink-0">
                                {formatTime(timeLeft).split("").map((ch, i) => (
                                    ch === ":" ? (
                                        <span key={i} className="text-red-400 font-black text-lg leading-none mx-0.5 animate-pulse">:</span>
                                    ) : (
                                        <div key={i} className="w-7 h-9 bg-black/60 border border-red-500/40 rounded-lg flex items-center justify-center">
                                            <span className="text-red-400 font-black text-base tabular-nums leading-none">{ch}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                        {/* progress bar draining */}
                        <div className="h-0.5 bg-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000"
                                style={{ width: `${Math.min(100, (timeLeft / 900) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Social proof — viewers */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-1.5">
                        {["from-orange-400 to-pink-500", "from-blue-400 to-purple-500", "from-green-400 to-teal-500"].map((g, i) => (
                            <div key={i} className={`w-5 h-5 rounded-full bg-gradient-to-br ${g} border-2 border-[#0d0d0d]`} />
                        ))}
                    </div>
                    <p className="text-[11px] text-white/40 flex-1">
                        <span className="text-white font-black">{viewing}</span> pessoas estão vendo agora
                    </p>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-[10px] text-green-400 font-black">AO VIVO</span>
                    </div>
                </div>

                {/* Scarcity bar */}
                {product.stock > 0 && product.stock <= 20 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Disponibilidade</span>
                            <span className={`text-[11px] font-black flex items-center gap-1 ${
                                product.stock === 1 ? "text-red-400" :
                                product.stock <= 3 ? "text-orange-400" : "text-yellow-400"
                            }`}>
                                {product.stock === 1 ? "🔥 ÚLTIMA UNIDADE!" :
                                 product.stock <= 3 ? `⚡ Apenas ${product.stock} restam!` :
                                 `🚨 Restam ${product.stock} unidades`}
                            </span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                    product.stock === 1 ? "animate-pulse bg-gradient-to-r from-red-600 to-red-400" :
                                    product.stock <= 3 ? "bg-gradient-to-r from-orange-600 to-orange-400" :
                                    "bg-gradient-to-r from-yellow-600 to-yellow-400"
                                }`}
                                style={{ width: `${Math.min(100, (product.stock / 20) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Payment hint */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0 animate-pulse" />
                    <span className="text-green-400 text-xs font-semibold">Em até 12x no cartão ou à vista no PIX</span>
                </div>

                {/* Colors */}
                {product.colors && product.colors.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black uppercase tracking-widest text-white/50">Cor</p>
                            <span className="text-xs text-[#f46a25] font-bold">{selectedColor || "Selecione"}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {product.colors.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => setSelectedColor(selectedColor === color.name ? null : color.name)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                        selectedColor === color.name
                                            ? "border-[#f46a25] bg-[#f46a25]/10 text-[#f46a25]"
                                            : "border-white/10 text-white/50"
                                    }`}
                                >
                                    <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: color.hex }} />
                                    {color.name}
                                    {selectedColor === color.name && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sizes */}
                {product.sizes && product.sizes.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black uppercase tracking-widest text-white/50">Tamanho</p>
                            <span className="text-xs text-[#f46a25] font-bold">{selectedSize || "Selecione"}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {product.sizes.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                                    className={`w-12 h-12 rounded-xl border text-sm font-black transition-all ${
                                        selectedSize === size
                                            ? "border-[#f46a25] bg-[#f46a25] text-white shadow-lg shadow-[#f46a25]/25"
                                            : "border-white/10 text-white/50"
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-white/50">Quantidade</span>
                        {product.stock > 0 && product.stock <= 10 && (
                            <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full">
                                Últimas {product.stock}!
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-1 py-1">
                        <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white text-xl font-black">−</button>
                        <span className="w-6 text-center text-sm font-black">{qty}</span>
                        <button onClick={() => setQty(q => Math.min(product.stock || 99, q + 1))} className="w-8 h-8 flex items-center justify-center text-[#f46a25] text-xl font-black">+</button>
                    </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                        { icon: Shield, label: "Compra segura" },
                        { icon: Truck,  label: "Entrega rápida" },
                        { icon: RotateCcw, label: "Devolução fácil" },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex flex-col items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                            <Icon className="w-4 h-4 text-[#f46a25]" />
                            <span className="text-[9px] text-white/40 font-bold text-center leading-tight">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Store card */}
                <Link
                    href={`/store/${product.store.username}`}
                    className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 mb-5 active:scale-[0.98] transition-transform"
                >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/10">
                        {product.store.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.store.logo_url} alt={product.store.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Store className="w-5 h-5 text-white/20" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{product.store.name}</p>
                        <p className="text-[10px] text-white/30">@{product.store.username} · Ver loja completa</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                </Link>

                {/* Tabs */}
                <div className="flex bg-white/5 p-1 rounded-2xl mb-4 border border-white/5">
                    <button
                        onClick={() => setActiveTab("desc")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === "desc" ? "bg-[#f46a25] text-white shadow-md" : "text-white/30"}`}
                    >
                        Descrição
                    </button>
                    <button
                        onClick={() => setActiveTab("reviews")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === "reviews" ? "bg-[#f46a25] text-white shadow-md" : "text-white/30"}`}
                    >
                        Avaliações ({totalReviews})
                    </button>
                </div>

                {/* ── Description ── */}
                {activeTab === "desc" && (
                    <div className="mb-6">
                        {product.description ? (
                            <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                                {product.description}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-10 text-center">
                                <Package className="w-10 h-10 text-white/10 mb-3" />
                                <p className="text-white/25 text-xs font-bold uppercase tracking-widest">Sem descrição disponível</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Reviews ── */}
                {activeTab === "reviews" && (
                    <div className="mb-6 space-y-4">

                        {/* Rating summary */}
                        {totalReviews > 0 && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                                <div className="flex gap-4 items-center mb-4">
                                    <div className="text-center shrink-0">
                                        <p className="text-5xl font-black text-[#f46a25]">{product.avg_rating.toFixed(1)}</p>
                                        <div className="flex justify-center mt-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`w-3 h-3 ${s <= Math.round(product.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-1">{totalReviews} avaliações</p>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        {[5, 4, 3, 2, 1].map(star => {
                                            const count = ratingDist[star] || 0;
                                            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-2">
                                                    <span className="text-[10px] text-white/40 w-3 shrink-0">{star}</span>
                                                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                                                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#f46a25] rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] text-white/25 w-5 shrink-0 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Write review button */}
                        {!reviewSuccess && (
                            <button
                                onClick={() => setShowReviewForm(!showReviewForm)}
                                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-[#f46a25]/40 text-white/60 hover:text-white rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider transition-all"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Escrever avaliação
                            </button>
                        )}

                        {reviewSuccess && (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 text-xs font-bold">Avaliação enviada com sucesso!</span>
                            </div>
                        )}

                        {/* Review form */}
                        {showReviewForm && (
                            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black uppercase tracking-widest">Sua avaliação</p>
                                    <button onClick={() => setShowReviewForm(false)}>
                                        <X className="w-4 h-4 text-white/40" />
                                    </button>
                                </div>
                                {/* Star picker */}
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setNewRating(s)}>
                                            <Star className={`w-7 h-7 transition-all ${s <= newRating ? "text-yellow-400 fill-yellow-400 scale-110" : "text-white/20"}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    placeholder="Conte sua experiência com o produto..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#f46a25]/50 resize-none"
                                />
                                <button
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview || !newText.trim()}
                                    className="w-full bg-[#f46a25] disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Enviar avaliação
                                </button>
                            </div>
                        )}

                        {/* Review list */}
                        {reviews.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center">
                                <MessageCircle className="w-10 h-10 text-white/10 mb-3" />
                                <p className="text-white/25 text-xs font-bold uppercase tracking-widest">Seja o primeiro a avaliar!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayedReviews.map((review) => (
                                    <div key={review.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                                        {/* Reviewer header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                                                {review.reviewer_avatar ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={review.reviewer_avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-white/30">
                                                        {(review.reviewer_name || review.reviewer_username || "?")[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black truncate">{review.reviewer_name || review.reviewer_username}</p>
                                                <p className="text-[10px] text-white/30">{new Date(review.created_at).toLocaleDateString("pt-BR")}</p>
                                            </div>
                                            {/* Stars */}
                                            <div className="flex shrink-0 gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-white/15"}`} />
                                                ))}
                                            </div>
                                        </div>

                                        {review.text && (
                                            <p className="text-sm text-white/60 leading-relaxed mb-3">{review.text}</p>
                                        )}

                                        {/* Review images — horizontal scroll */}
                                        {review.images && review.images.length > 0 && (
                                            <div
                                                className="flex gap-2 overflow-x-auto pb-1 mb-2"
                                                style={{ scrollbarWidth: "none" }}
                                            >
                                                {review.images.map((img, i) => (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        key={i}
                                                        src={img}
                                                        alt=""
                                                        className="shrink-0 w-20 h-20 rounded-xl object-cover border border-white/10"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {reviews.length > 3 && !showAllReviews && (
                                    <button
                                        onClick={() => setShowAllReviews(true)}
                                        className="w-full py-3 text-xs font-black uppercase tracking-wider text-[#f46a25] border border-[#f46a25]/20 rounded-2xl hover:bg-[#f46a25]/5 transition-all"
                                    >
                                        Ver todas as {totalReviews} avaliações
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Fixed Buy Bar ── */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent z-50">
                <div className="flex gap-3">
                    <Link
                        href={`/store/${product.store.username}`}
                        className="flex items-center justify-center w-14 h-14 bg-white/5 border border-white/10 rounded-2xl shrink-0 hover:border-white/20 transition-all"
                    >
                        <Store className="w-5 h-5 text-white/50" />
                    </Link>
                    <button
                        onClick={handleBuy}
                        disabled={product.stock === 0}
                        className="flex-1 bg-[#f46a25] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-[#f46a25]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        {product.stock === 0 ? "Produto Esgotado" : `Comprar · R$ ${(product.price * qty).toFixed(2)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
