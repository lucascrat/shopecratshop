"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Share2, Heart, ShoppingCart, Star, ChevronRight,
    Store, Shield, Truck, RotateCcw, ChevronDown, ChevronUp,
    Play, Image as ImageIcon, Loader2, MessageSquare, Camera,
    CheckCircle2, Package, Zap, Info
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ProductVariants {
    colors?: string[];
    sizes?: string[];
}

interface ProductDetail {
    id: string;
    name: string;
    description: string;
    price: number;
    old_price?: number;
    images: string[];
    variants: ProductVariants;
    stock: number;
    category: string;
    store_name: string;
    store_logo: string;
    store_description: string;
    store_username: string;
    avg_rating: number;
    reviews_count: number;
}

interface Review {
    id: string;
    rating: number;
    text: string;
    images: string[];
    video_url?: string;
    user_name: string;
    username: string;
    avatar_url?: string;
    created_at: string;
}

interface ReviewStats {
    total: number;
    avg: number;
    distribution: { star: number; count: number }[];
}

const COLOR_MAP: Record<string, string> = {
    "Preto": "#1a1a1a", "Branco": "#f5f5f5", "Azul": "#2563eb",
    "Vermelho": "#dc2626", "Verde": "#16a34a", "Amarelo": "#eab308",
    "Rosa": "#ec4899", "Roxo": "#9333ea", "Laranja": "#f97316",
    "Cinza": "#6b7280", "Marrom": "#92400e", "Bege": "#d4b896",
    "Navy": "#1e3a5f", "Vinho": "#7f1d1d", "Cáqui": "#a0855b",
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    style={{ width: size, height: size }}
                    className={s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-white/15"}
                />
            ))}
        </div>
    );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
                <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(s)}
                    className="transition-transform active:scale-110"
                >
                    <Star
                        className={`w-8 h-8 transition-colors ${(hovered || value) >= s ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`}
                    />
                </button>
            ))}
        </div>
    );
}

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState<string>("");
    const [selectedSize, setSelectedSize] = useState<string>("");
    const [showDescription, setShowDescription] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const reviewFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function loadData() {
        setLoading(true);
        try {
            const [productData, reviewData] = await Promise.all([
                apiFetch<{ product: ProductDetail }>(`/api/products?id=${id}`),
                apiFetch<{ reviews: Review[]; stats: ReviewStats }>(`/api/products/${id}/reviews`),
            ]);
            const p = productData.product;
            p.price = parseFloat(String(p.price || 0));
            p.old_price = p.old_price ? parseFloat(String(p.old_price)) : undefined;
            p.avg_rating = parseFloat(String(p.avg_rating || 0));
            p.variants = p.variants || {};
            setProduct(p);
            setReviews(reviewData.reviews || []);
            setReviewStats(reviewData.stats || null);
            if (p.variants?.colors?.length) setSelectedColor(p.variants.colors[0]);
            if (p.variants?.sizes?.length) setSelectedSize(p.variants.sizes[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitReview() {
        if (!reviewRating) return;
        setSubmitting(true);
        try {
            await apiFetch(`/api/products/${id}/reviews`, {
                method: "POST",
                body: JSON.stringify({ rating: reviewRating, text: reviewText, images: reviewImages }),
            });
            toast.success("Avaliação enviada!");
            setShowReviewForm(false);
            setReviewText("");
            setReviewImages([]);
            setReviewRating(5);
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erro ao enviar avaliação");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleShare() {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: product?.name, url }).catch(() => {});
        } else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado!");
        }
    }

    const discount = product?.old_price && product.old_price > product.price
        ? Math.round((1 - product.price / product.old_price) * 100)
        : null;

    if (loading) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen max-w-[430px] mx-auto flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#f46a25]" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="bg-[#0d0d0d] min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-center p-8 text-center text-white">
                <Package className="w-16 h-16 text-white/10 mb-4" />
                <p className="font-bold text-lg mb-2">Produto não encontrado</p>
                <button onClick={() => router.back()} className="mt-4 bg-[#f46a25] px-8 py-3 rounded-xl font-bold text-sm">Voltar</button>
            </div>
        );
    }

    const images = product.images?.length ? product.images : [];

    return (
        <div className="bg-[#0d0d0d] min-h-screen max-w-[430px] mx-auto text-white pb-32">

            {/* ── Header ── */}
            <div className="sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => router.back()} className="p-2 -ml-1 text-white/50">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsWishlisted(v => !v)} className="p-2 text-white/50">
                            <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                        </button>
                        <button onClick={handleShare} className="p-2 text-white/50">
                            <Share2 className="w-5 h-5" />
                        </button>
                        <Link href="/cart" className="p-2 text-white/50">
                            <ShoppingCart className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Image Gallery ── */}
            <div className="relative bg-black">
                <div className="aspect-square overflow-hidden relative">
                    {images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={images[activeImage]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <ImageIcon className="w-16 h-16 text-white/10" />
                        </div>
                    )}
                    {discount && (
                        <div className="absolute top-4 left-4 bg-[#f46a25] text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
                            -{discount}%
                        </div>
                    )}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white font-black text-lg uppercase tracking-widest">Esgotado</span>
                        </div>
                    )}
                    {/* Image counter */}
                    {images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {activeImage + 1}/{images.length}
                        </div>
                    )}
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-[#0d0d0d]">
                        {images.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveImage(i)}
                                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? "border-[#f46a25]" : "border-white/10"}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Product Info ── */}
            <div className="px-4 pt-4 pb-2">
                {/* Category badge */}
                <span className="text-[10px] text-[#f46a25] font-bold uppercase tracking-widest bg-[#f46a25]/10 px-2 py-0.5 rounded-full">
                    {product.category}
                </span>

                <h1 className="text-lg font-bold text-white mt-2 leading-snug">{product.name}</h1>

                {/* Rating row */}
                <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={product.avg_rating} />
                    <span className="text-yellow-400 text-sm font-bold">{product.avg_rating > 0 ? product.avg_rating.toFixed(1) : "—"}</span>
                    <span className="text-white/30 text-xs">({product.reviews_count} avaliações)</span>
                </div>

                {/* Price */}
                <div className="mt-3 flex items-end gap-3">
                    <span className="text-3xl font-black text-[#f46a25]">R$ {product.price.toFixed(2)}</span>
                    {product.old_price && product.old_price > product.price && (
                        <span className="text-white/30 line-through text-base mb-0.5">R$ {product.old_price.toFixed(2)}</span>
                    )}
                </div>

                {/* Installments hint */}
                {product.price >= 50 && (
                    <p className="text-white/40 text-xs mt-1">
                        em até <span className="text-white/60 font-bold">12x</span> sem juros
                    </p>
                )}
            </div>

            {/* ── Flash Sale / Stock ── */}
            {product.stock > 0 && product.stock <= 10 && (
                <div className="mx-4 mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <Zap className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-red-400 text-xs font-bold">Últimas {product.stock} unidades!</p>
                </div>
            )}

            {/* ── Variants ── */}
            {(product.variants?.colors?.length || product.variants?.sizes?.length) ? (
                <div className="px-4 pb-4 space-y-4">
                    {/* Colors */}
                    {product.variants.colors && product.variants.colors.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                Cor: <span className="text-white normal-case">{selectedColor}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.colors.map(color => {
                                    const hex = COLOR_MAP[color] || "#888";
                                    return (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`relative w-9 h-9 rounded-full border-2 transition-all ${selectedColor === color ? "border-[#f46a25] scale-110" : "border-white/20"}`}
                                            style={{ backgroundColor: hex }}
                                            title={color}
                                        >
                                            {selectedColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sizes */}
                    {product.variants.sizes && product.variants.sizes.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                Tamanho: <span className="text-white normal-case">{selectedSize}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.sizes.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`min-w-[44px] h-10 px-3 rounded-xl text-sm font-bold border-2 transition-all
                                            ${selectedSize === size
                                                ? "border-[#f46a25] bg-[#f46a25] text-white"
                                                : "border-white/15 text-white/60 hover:border-white/30"}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* ── Delivery & Guarantees ── */}
            <div className="mx-4 mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.05]">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Truck className="w-4 h-4 text-[#f46a25] shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-white">Entrega</p>
                        <p className="text-[11px] text-white/40">Frete calculado no checkout</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                    <Shield className="w-4 h-4 text-[#f46a25] shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-white">Compra protegida</p>
                        <p className="text-[11px] text-white/40">Devolução gratuita em 7 dias</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                    <RotateCcw className="w-4 h-4 text-[#f46a25] shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-white">Garantia</p>
                        <p className="text-[11px] text-white/40">Produto 100% original</p>
                    </div>
                </div>
            </div>

            {/* ── Description ── */}
            {product.description && (
                <div className="mx-4 mb-4">
                    <button
                        onClick={() => setShowDescription(v => !v)}
                        className="w-full flex items-center justify-between py-3 border-b border-white/[0.07]"
                    >
                        <span className="text-sm font-bold text-white">Descrição do produto</span>
                        {showDescription ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                    </button>
                    {showDescription && (
                        <div className="pt-3 pb-1">
                            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{product.description}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Store Card ── */}
            <Link
                href={`/store/${product.store_username}`}
                className="mx-4 mb-4 flex items-center gap-3 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] active:bg-white/[0.06] transition-colors"
            >
                <div className="w-12 h-12 rounded-2xl bg-white/10 overflow-hidden shrink-0">
                    {product.store_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.store_logo} alt={product.store_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-6 h-6 text-white/20" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{product.store_name}</p>
                    <p className="text-[11px] text-white/40 truncate">{product.store_description || "Ver todos os produtos"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
            </Link>

            {/* ── Reviews Section ── */}
            <div className="px-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-black">Avaliações</h2>
                    <button
                        onClick={() => setShowReviewForm(v => !v)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#f46a25] bg-[#f46a25]/10 px-3 py-1.5 rounded-full"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Avaliar
                    </button>
                </div>

                {/* Rating Summary */}
                {reviewStats && reviewStats.total > 0 && (
                    <div className="flex gap-4 mb-5 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                        <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-4xl font-black text-white">{reviewStats.avg.toFixed(1)}</span>
                            <StarRating rating={reviewStats.avg} size={12} />
                            <span className="text-[10px] text-white/30 mt-1">{reviewStats.total} avaliações</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            {reviewStats.distribution.map(({ star, count }) => (
                                <div key={star} className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/40 w-3">{star}</span>
                                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 rounded-full"
                                            style={{ width: reviewStats.total > 0 ? `${(count / reviewStats.total) * 100}%` : "0%" }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-white/30 w-4 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Review Form */}
                {showReviewForm && (
                    <div className="mb-5 p-4 bg-white/[0.04] rounded-2xl border border-white/[0.08] space-y-4">
                        <p className="text-sm font-bold text-white">Sua avaliação</p>
                        <StarPicker value={reviewRating} onChange={setReviewRating} />
                        <textarea
                            value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            placeholder="Conte sua experiência com o produto..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none resize-none focus:border-[#f46a25]/40"
                        />

                        {/* Image upload */}
                        <div>
                            <p className="text-xs text-white/40 mb-2">Adicionar fotos</p>
                            <div className="flex gap-2 flex-wrap">
                                {reviewImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setReviewImages(prev => prev.filter((_, j) => j !== i))}
                                            className="absolute top-0.5 right-0.5 bg-black/70 rounded-full w-4 h-4 flex items-center justify-center text-[9px] text-white font-bold"
                                        >✕</button>
                                    </div>
                                ))}
                                {reviewImages.length < 5 && (
                                    <button
                                        onClick={() => reviewFileRef.current?.click()}
                                        className="w-16 h-16 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/30 hover:border-[#f46a25]/40 hover:text-[#f46a25]/40 transition-colors"
                                    >
                                        <Camera className="w-5 h-5" />
                                        <span className="text-[9px] mt-0.5">Foto</span>
                                    </button>
                                )}
                                <input
                                    ref={reviewFileRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={async e => {
                                        const files = Array.from(e.target.files || []);
                                        for (const file of files) {
                                            if (reviewImages.length >= 5) break;
                                            const form = new FormData();
                                            form.append("file", file);
                                            try {
                                                const res = await fetch("/api/upload", { method: "POST", body: form });
                                                const data = await res.json();
                                                if (data.url) setReviewImages(prev => [...prev, data.url]);
                                            } catch {}
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting}
                            className="w-full bg-[#f46a25] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {submitting ? "Enviando..." : "Publicar Avaliação"}
                        </button>
                    </div>
                )}

                {/* Reviews List */}
                {reviews.length === 0 ? (
                    <div className="py-8 flex flex-col items-center text-center">
                        <Star className="w-10 h-10 text-white/10 mb-3" />
                        <p className="text-white/30 text-sm font-bold">Nenhuma avaliação ainda</p>
                        <p className="text-white/20 text-xs mt-1">Seja o primeiro a avaliar!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <div key={review.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-[#f46a25]/20 flex items-center justify-center shrink-0 overflow-hidden">
                                        {review.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={review.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[#f46a25] font-bold text-sm">
                                                {(review.user_name || review.username || "U")[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">
                                            {review.user_name || review.username}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StarRating rating={review.rating} size={11} />
                                            <span className="text-[10px] text-white/25">
                                                {new Date(review.created_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {review.text && (
                                    <p className="text-sm text-white/70 leading-relaxed mb-3">{review.text}</p>
                                )}
                                {/* Review images */}
                                {review.images && review.images.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {review.images.map((img, i) => (
                                            <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Review video */}
                                {review.video_url && (
                                    <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
                                        <video src={review.video_url} controls className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Bottom Action Bar ── */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-white/[0.07] px-4 py-3 pb-safe">
                <div className="flex gap-3">
                    <Link
                        href={`/store/${product.store_username}`}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white text-xs font-bold shrink-0"
                    >
                        <Store className="w-4 h-4" />
                        Loja
                    </Link>
                    <Link
                        href={`/checkout?id=${product.id}`}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm transition-all active:scale-95
                            ${product.stock === 0
                                ? "bg-white/10 text-white/30 pointer-events-none"
                                : "bg-[#f46a25] shadow-lg shadow-[#f46a25]/25"
                            }`}
                    >
                        {product.stock === 0 ? (
                            <><Info className="w-4 h-4" /> Esgotado</>
                        ) : (
                            <><Zap className="w-4 h-4" /> Comprar Agora</>
                        )}
                    </Link>
                </div>
            </div>
        </div>
    );
}
