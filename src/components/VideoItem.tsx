"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Plus, Volume2, VolumeX, X, Send, Store, Coins, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { toggleLike, toggleBookmark, addComment, getComments, claimVideoReward } from "@/lib/videos";
import type { VideoFeedItem } from "@/lib/types";
import { toast } from "sonner";

interface VideoItemProps {
    video: VideoFeedItem;
    onError?: () => void;
    isActive?: boolean;
    preloadLevel?: "full" | "next" | "none";
}

interface CommentData {
    id: string;
    content: string;
    created_at: string;
    profile: { username: string; avatar_url: string } | null;
}

export default function VideoItem({ video, onError, isActive, preloadLevel = "full" }: VideoItemProps) {
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

    // Coin Reward state
    const [rewardProgress, setRewardProgress] = useState(0);
    const [rewardClaimed, setRewardClaimed] = useState(false);
    const rewardSeconds = 5; // Configurable via Admin realistically
    const accumulatedTimeRef = useRef(0);

    // Double-tap and tap handling
    const lastTapRef = useRef(0);
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Heart overlay animation (double-tap)
    const [showHeartOverlay, setShowHeartOverlay] = useState(false);

    // Like button bounce animation
    const [likeBounce, setLikeBounce] = useState(false);

    // Video progress bar
    const [progress, setProgress] = useState(0);

    // Buffering indicator
    const [buffering, setBuffering] = useState(false);

    // Comments drawer drag state
    const drawerRef = useRef<HTMLDivElement>(null);
    const drawerDragStartY = useRef(0);
    const drawerCurrentY = useRef(0);
    const [drawerClosing, setDrawerClosing] = useState(false);

    // Track watch time and claim
    useEffect(() => {
        if (!user || rewardClaimed) return;

        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                accumulatedTimeRef.current += 0.1;
                const prog = Math.min((accumulatedTimeRef.current / rewardSeconds) * 100, 100);
                setRewardProgress(prog);

                if (accumulatedTimeRef.current >= rewardSeconds) {
                    setRewardClaimed(true);
                    setRewardProgress(100);

                    // Claim API call
                    claimVideoReward(video.id).then(res => {
                        if (res.success) {
                            toast.success(`Você ganhou +${res.awarded} moedas! 🪙`);
                        }
                    }).catch(() => {});
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [user, rewardClaimed, video.id]);

    // isActive control: auto-play/pause based on isActive prop
    useEffect(() => {
        if (isActive === undefined) return; // If not provided, skip (backward compat)

        if (isActive) {
            videoRef.current?.play().catch(() => {});
        } else {
            videoRef.current?.pause();
        }
    }, [isActive]);

    // Legacy IntersectionObserver: only used when isActive is not provided
    useEffect(() => {
        if (isActive !== undefined) return; // Skip if parent manages active state

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(() => {});
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
    }, [isActive]);

    // Video progress bar: timeupdate listener
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const handleTimeUpdate = () => {
            if (vid.duration && vid.duration > 0) {
                setProgress((vid.currentTime / vid.duration) * 100);
            }
        };

        vid.addEventListener("timeupdate", handleTimeUpdate);
        return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
    }, []);

    // Buffering indicator: waiting/playing events
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => setBuffering(false);
        const handleSeeked = () => setBuffering(false);

        vid.addEventListener("waiting", handleWaiting);
        vid.addEventListener("playing", handlePlaying);
        vid.addEventListener("seeked", handleSeeked);
        return () => {
            vid.removeEventListener("waiting", handleWaiting);
            vid.removeEventListener("playing", handlePlaying);
            vid.removeEventListener("seeked", handleSeeked);
        };
    }, []);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    }, []);

    // Trigger like logic (shared between double-tap and button)
    const triggerLike = useCallback(async () => {
        if (!user) {
            toast.error("Faça login para curtir vídeos");
            return;
        }
        // If already liked, do nothing on double-tap (only add likes, don't remove via double-tap)
        if (liked) return;

        setLiked(true);
        setLikesCount(prev => prev + 1);
        try {
            await toggleLike(video.id, user.id);
        } catch {
            setLiked(false);
            setLikesCount(prev => prev - 1);
            toast.error("Erro ao curtir. Tente novamente.");
        }
    }, [user, liked, video.id]);

    // Show heart overlay animation
    const showHeartAnimation = useCallback(() => {
        setShowHeartOverlay(true);
        setTimeout(() => setShowHeartOverlay(false), 800);
    }, []);

    // Handle video area tap (single = toggle play, double = like)
    const handleVideoTap = useCallback((e: React.MouseEvent) => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double-tap detected
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = null;
            }
            lastTapRef.current = 0;
            triggerLike();
            showHeartAnimation();
        } else {
            // First tap: wait to see if double-tap follows
            lastTapRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                // Single tap confirmed
                togglePlay();
                tapTimeoutRef.current = null;
            }, 300);
        }
    }, [triggerLike, showHeartAnimation, togglePlay]);

    // Cleanup tap timeout on unmount
    useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        };
    }, []);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Faça login para curtir vídeos");
            return;
        }
        // Optimistic update
        const wasLiked = liked;
        setLiked(!liked);
        setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

        // Bounce animation
        setLikeBounce(true);
        setTimeout(() => setLikeBounce(false), 300);

        try {
            await toggleLike(video.id, user.id);
        } catch {
            // Revert on error
            setLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
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
        const wasBm = bookmarked;
        setBookmarked(!bookmarked);
        setBookmarkCount(prev => wasBm ? prev - 1 : prev + 1);
        try {
            await toggleBookmark(video.id, user.id);
        } catch {
            setBookmarked(wasBm);
            setBookmarkCount(prev => wasBm ? prev + 1 : prev - 1);
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
        setDrawerClosing(false);
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

    const handleCloseComments = useCallback(() => {
        setDrawerClosing(true);
        setTimeout(() => {
            setShowComments(false);
            setDrawerClosing(false);
        }, 300);
    }, []);

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

    // Drawer drag handlers
    const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
        drawerDragStartY.current = e.touches[0].clientY;
        drawerCurrentY.current = 0;
    }, []);

    const handleDrawerTouchMove = useCallback((e: React.TouchEvent) => {
        const dy = e.touches[0].clientY - drawerDragStartY.current;
        if (dy > 0 && drawerRef.current) {
            drawerCurrentY.current = dy;
            drawerRef.current.style.transform = `translateY(${dy}px)`;
        }
    }, []);

    const handleDrawerTouchEnd = useCallback(() => {
        if (drawerRef.current) {
            if (drawerCurrentY.current > 100) {
                // Dragged far enough: close
                handleCloseComments();
            } else {
                // Snap back
                drawerRef.current.style.transform = "translateY(0)";
            }
            drawerCurrentY.current = 0;
        }
    }, [handleCloseComments]);

    const formatCount = (n: number): string => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    // Discount calculation
    const hasProduct   = !!video.product.id;
    const productPrice = typeof video.product.price === "number" ? video.product.price : parseFloat(String(video.product.price || 0));
    const oldPrice     = video.product.oldPrice ? (typeof video.product.oldPrice === "number" ? video.product.oldPrice : parseFloat(String(video.product.oldPrice))) : undefined;
    const hasDiscount  = !!(oldPrice && oldPrice > productPrice);
    const discountPct  = hasDiscount ? Math.round((1 - productPrice / oldPrice!) * 100) : 0;

    // Preload strategy
    const preloadAttr = preloadLevel === "full" ? "auto" : preloadLevel === "next" ? "metadata" : "none";
    const renderVideoSrc = preloadLevel !== "none";

    return (
        <div className="relative h-full w-full bg-black">
            {/* Video Element */}
            <video
                ref={videoRef}
                src={renderVideoSrc ? video.url : undefined}
                className="h-full w-full object-cover"
                loop
                playsInline
                muted={muted}
                onClick={handleVideoTap}
                preload={preloadAttr}
                onError={() => onError?.()}
            />

            {/* Black background for preloadLevel "none" */}
            {!renderVideoSrc && (
                <div className="absolute inset-0 bg-black" />
            )}

            {/* Buffering Indicator */}
            {buffering && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="bg-black/30 backdrop-blur-sm rounded-full p-3">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                </div>
            )}

            {/* Heart Overlay Animation (double-tap) */}
            {showHeartOverlay && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <Heart
                        className="w-24 h-24 text-red-500 fill-current"
                        style={{
                            animation: "heartPop 0.8s ease-out forwards",
                        }}
                    />
                </div>
            )}

            {/* Keyframe styles (injected via style tag) */}
            <style jsx>{`
                @keyframes heartPop {
                    0% {
                        opacity: 1;
                        transform: scale(0.2);
                    }
                    30% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1.3);
                    }
                }
                @keyframes likeBounce {
                    0% { transform: scale(1); }
                    40% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                @keyframes pulseBtn {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(244, 106, 37, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 0 6px rgba(244, 106, 37, 0);
                    }
                }
                @keyframes drawerSlideIn {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes drawerSlideOut {
                    from { transform: translateY(0); }
                    to { transform: translateY(100%); }
                }
            `}</style>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

            {/* Video Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none" style={{ height: "2px" }}>
                <div
                    className="h-full transition-[width] duration-200 ease-linear"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: "#f46a25",
                        opacity: 0.7,
                    }}
                />
            </div>

            {/* Coin Reward Float */}
            {user && !rewardClaimed && (
                <div className="absolute top-4 left-4 z-20 flex items-center justify-center">
                    <div className="relative w-10 h-10 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full shadow-lg">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle
                                cx="20" cy="20" r="18"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="2.5" fill="none"
                            />
                            <circle
                                cx="20" cy="20" r="18"
                                stroke="#EAB308"
                                strokeWidth="2.5" fill="none"
                                strokeDasharray="113.097"
                                strokeDashoffset={113.097 - (113.097 * rewardProgress) / 100}
                                className="transition-all duration-100 ease-linear"
                            />
                        </svg>
                        <div className="bg-yellow-500 rounded-full w-6 h-6 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                            <Coins className="w-3.5 h-3.5 text-black" />
                        </div>
                    </div>
                </div>
            )}

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
                    <div
                        className={`p-3 rounded-full backdrop-blur-md transition-all ${liked ? 'bg-primary/20 text-primary scale-110' : 'bg-white/10 text-white group-hover:bg-white/20'}`}
                        style={likeBounce ? { animation: "likeBounce 0.3s ease-out" } : undefined}
                    >
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
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40 flex items-center justify-center">
                            {video.product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={video.product.image}
                                    alt={video.product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                            ) : (
                                <Store className="w-7 h-7 text-white/20" />
                            )}
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

                        {/* CTA with pulse animation */}
                        <Link
                            href={`/checkout?id=${video.product.id}`}
                            className="bg-[#f46a25] hover:bg-[#f46a25]/90 text-white px-3 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 whitespace-nowrap uppercase tracking-wide shadow-lg shadow-[#f46a25]/30"
                            style={{ animation: "pulseBtn 2s ease-in-out infinite" }}
                        >
                            Comprar
                        </Link>
                    </div>
                </div>
            )}

            {/* Comments Drawer */}
            {showComments && (
                <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={handleCloseComments}>
                    <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" style={{ opacity: drawerClosing ? 0 : 1 }} />
                    <div
                        ref={drawerRef}
                        className="relative bg-background-dark rounded-t-3xl max-h-[60vh] flex flex-col border-t border-white/10"
                        style={{
                            animation: drawerClosing
                                ? "drawerSlideOut 0.3s ease-in forwards"
                                : "drawerSlideIn 0.3s ease-out forwards",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={handleDrawerTouchStart}
                        onTouchMove={handleDrawerTouchMove}
                        onTouchEnd={handleDrawerTouchEnd}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-1 cursor-grab">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
                            <h3 className="font-bold text-sm">{commentsCount} comentários</h3>
                            <button onClick={handleCloseComments} className="p-1 hover:bg-white/10 rounded-full transition-colors">
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
