"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Plus, Volume2, VolumeX, X, Send, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { toggleLike, toggleBookmark, addComment, getComments } from "@/lib/videos";
import type { VideoFeedItem } from "@/lib/types";
import { toast } from "sonner";

interface VideoItemProps {
    video: VideoFeedItem;
}

interface CommentData {
    id: string;
    content: string;
    created_at: string;
    profile: { username: string; avatar_url: string } | null;
}

export default function VideoItem({ video }: VideoItemProps) {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [liked, setLiked] = useState(video.userLiked);
    const [bookmarked, setBookmarked] = useState(video.userBookmarked);
    const [likesCount, setLikesCount] = useState(video.stats.likes);
    const [bookmarkCount, setBookmarkCount] = useState(video.stats.bookmarks);
    const [commentsCount, setCommentsCount] = useState(video.stats.comments);

    // Comments drawer state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(() => { });
                    } else {
                        videoRef.current?.pause();
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Faça login para curtir vídeos");
            return;
        }
        // Optimistic update
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        try {
            await toggleLike(video.id, user.id);
        } catch {
            // Revert on error
            setLiked(liked);
            setLikesCount(prev => liked ? prev + 1 : prev - 1);
            toast.error("Erro ao curtir. Tente novamente.");
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Faça login para salvar vídeos");
            return;
        }
        // Optimistic update
        setBookmarked(!bookmarked);
        setBookmarkCount(prev => bookmarked ? prev - 1 : prev + 1);
        try {
            await toggleBookmark(video.id, user.id);
        } catch {
            setBookmarked(bookmarked);
            setBookmarkCount(prev => bookmarked ? prev + 1 : prev - 1);
            toast.error("Erro ao salvar. Tente novamente.");
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareData = {
            title: video.product.name,
            text: video.description,
            url: `${window.location.origin}/?video=${video.id}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toast.success("Link copiado!");
            }
        } catch (err) {
            // User cancelled share or error
            if ((err as Error).name !== "AbortError") {
                await navigator.clipboard.writeText(shareData.url);
                toast.success("Link copiado!");
            }
        }
    };

    const handleOpenComments = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowComments(true);
        setLoadingComments(true);
        try {
            const data = await getComments(video.id);
            setComments(data as CommentData[]);
        } catch {
            toast.error("Erro ao carregar comentários");
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("Faça login para comentar");
            return;
        }
        if (!newComment.trim()) return;

        setSubmittingComment(true);
        try {
            const comment = await addComment(video.id, user.id, newComment.trim());
            setComments(prev => [comment as CommentData, ...prev]);
            setCommentsCount(prev => prev + 1);
            setNewComment("");
            toast.success("Comentário adicionado!");
        } catch {
            toast.error("Erro ao comentar. Tente novamente.");
        } finally {
            setSubmittingComment(false);
        }
    };

    const formatCount = (n: number): string => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    // Discount calculation — computed before JSX to avoid IIFE in render
    const hasProduct   = !!video.product.id;
    const productPrice = typeof video.product.price === "number" ? video.product.price : parseFloat(String(video.product.price || 0));
    const oldPrice     = video.product.oldPrice ? (typeof video.product.oldPrice === "number" ? video.product.oldPrice : parseFloat(String(video.product.oldPrice))) : undefined;
    const hasDiscount  = !!(oldPrice && oldPrice > productPrice);
    const discountPct  = hasDiscount ? Math.round((1 - productPrice / oldPrice!) * 100) : 0;

    return (
        <div className="relative h-full w-full bg-black">
            {/* Video Element */}
            <video
                ref={videoRef}
                src={video.url}
                className="h-full w-full object-cover"
                loop
                playsInline
                muted={muted}
                onClick={togglePlay}
                preload="metadata"
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

            {/* Mute Toggle */}
            <button
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                className="absolute top-4 right-4 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"
                title={muted ? "Ativar som" : "Desativar som"}
            >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Interaction Sidebar */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
                {/* Like */}
                <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={handleLike}>
                    <div className={`p-3 rounded-full backdrop-blur-md transition-all ${liked ? 'bg-primary/20 text-primary scale-110' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                        <Heart className={`w-7 h-7 ${liked ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-[10px] font-bold shadow-sm">{formatCount(likesCount)}</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={handleOpenComments}>
                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white group-hover:bg-white/20 transition-all">
                        <MessageCircle className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-bold shadow-sm">{formatCount(commentsCount)}</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={handleBookmark}>
                    <div className={`p-3 rounded-full backdrop-blur-md transition-all ${bookmarked ? 'bg-yellow-500/20 text-yellow-400 scale-110' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                        <Bookmark className={`w-7 h-7 ${bookmarked ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-[10px] font-bold shadow-sm">{formatCount(bookmarkCount)}</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={handleShare}>
                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-md text-white group-hover:bg-white/20 transition-all">
                        <Share2 className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-bold shadow-sm">{formatCount(video.stats.shares)}</span>
                </div>
            </div>

            {/* Info Overlay */}
            <div className="absolute left-4 bottom-44 right-20 z-10 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <Link href={`/store/${video.merchant.username}`} className="relative group">
                        <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden group-hover:scale-105 transition-transform">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={video.merchant.avatar} alt={video.merchant.username} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary px-1 rounded-full">
                            <Plus className="w-3 h-3 text-white" />
                        </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <Link href={`/store/${video.merchant.username}`} className="font-bold text-sm tracking-wide block hover:underline truncate">{video.merchant.storeName}</Link>
                        <p className="text-[10px] text-primary font-bold">@{video.merchant.username}</p>
                    </div>
                    <Link
                        href={`/store/${video.merchant.username}`}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <Store className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver Loja</span>
                    </Link>
                </div>
                <p className="text-sm line-clamp-2 pr-4 leading-snug drop-shadow-lg font-medium">
                    {video.description}
                </p>
            </div>

            {/* Floating Product Card */}
            {hasProduct && (
                <div className="absolute left-4 bottom-20 right-20 z-10 animate-in slide-in-from-left duration-500">
                    <div className="bg-black/50 backdrop-blur-xl border border-white/15 rounded-2xl p-3 flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                            {video.product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={video.product.image} alt={video.product.name} className="w-full h-full object-cover" />
                            ) : null}
                            {hasDiscount && (
                                <div className="absolute top-0 left-0 bg-[#f46a25] text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg leading-none">
                                    -{discountPct}%
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white text-[11px] font-bold truncate leading-tight">{video.product.name}</h4>
                            {hasDiscount ? (
                                <div className="mt-1 flex flex-col gap-0">
                                    <span className="text-white/40 text-[10px] line-through leading-none">
                                        R$ {oldPrice!.toFixed(2)}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[#f46a25] font-black text-base leading-none">
                                            R$ {productPrice.toFixed(2)}
                                        </span>
                                        <span className="bg-[#f46a25]/20 text-[#f46a25] text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                            Promoção
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[#f46a25] font-black text-sm mt-1 block">
                                    R$ {productPrice.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* CTA */}
                        <Link
                            href={`/checkout?id=${video.product.id}`}
                            className="bg-[#f46a25] hover:bg-[#f46a25]/90 text-white px-3 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 whitespace-nowrap uppercase tracking-wide shadow-lg shadow-[#f46a25]/30"
                        >
                            Comprar
                        </Link>
                    </div>
                </div>
            )}

            {/* Comments Drawer */}
            {showComments && (
                <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={() => setShowComments(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div
                        className="relative bg-background-dark rounded-t-3xl max-h-[60vh] flex flex-col border-t border-white/10 animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-bold text-sm">{commentsCount} comentários</h3>
                            <button onClick={() => setShowComments(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingComments ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-center text-white/30 py-8 text-sm">
                                    Nenhum comentário ainda. Seja o primeiro!
                                </p>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                            {comment.profile?.avatar_url && (
                                                <Image
                                                    src={comment.profile.avatar_url}
                                                    alt={comment.profile.username || "user"}
                                                    width={32}
                                                    height={32}
                                                    className="object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-primary">
                                                @{comment.profile?.username || "anônimo"}
                                            </p>
                                            <p className="text-sm text-white/80 mt-0.5">{comment.content}</p>
                                            <p className="text-[10px] text-white/20 mt-1">
                                                {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Comment Input */}
                        <form onSubmit={handleSubmitComment} className="p-4 border-t border-white/10 flex gap-3">
                            <input
                                type="text"
                                placeholder={user ? "Adicione um comentário..." : "Faça login para comentar"}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                disabled={!user || submittingComment}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 placeholder:text-white/20"
                                maxLength={500}
                            />
                            <button
                                type="submit"
                                disabled={!user || !newComment.trim() || submittingComment}
                                className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl disabled:opacity-30 transition-all active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
