"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import VideoItem from "./VideoItem";
import { getVideos } from "@/lib/videos";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { VideoFeedItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

const WINDOW_BEFORE = 1;
const WINDOW_AFTER = 2;

function getPreloadLevel(
    index: number,
    currentIndex: number
): "full" | "next" | "none" {
    if (index === currentIndex) return "full";
    const distance = Math.abs(index - currentIndex);
    if (distance === 1) return "next";
    return "none";
}

function LoadingSkeleton() {
    return (
        <div className="flex items-center justify-center h-screen bg-background-dark">
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-3/4 h-3/4 rounded-2xl bg-white/5 animate-pulse" />
                <div className="flex flex-col items-center gap-2 w-3/4">
                    <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export default function VideoFeed() {
    const { user } = useAuth();
    const [videos, setVideos] = useState<VideoFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pageRef = useRef(0);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
    const touchStartY = useRef(0);
    const pullDistance = useRef(0);
    const [pullOffset, setPullOffset] = useState(0);

    const loadVideos = useCallback(async (page: number, append: boolean = false) => {
        try {
            if (page === 0) setLoading(true);
            else setLoadingMore(true);

            const result = await getVideos(page, user?.id);

            if (append) {
                setVideos(prev => [...prev, ...result.videos]);
            } else {
                setVideos(result.videos);
            }
            setHasMore(result.hasMore);
            setError(null);
        } catch (err) {
            console.error("Failed to load videos:", err);
            setError("Erro ao carregar vídeos. Tente novamente.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user?.id]);

    const handleVideoError = useCallback((videoId: string) => {
        setVideos(prev => prev.filter(v => v.id !== videoId));
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        pageRef.current = 0;
        await loadVideos(0);
        setCurrentIndex(0);
        setIsRefreshing(false);
    }, [loadVideos]);

    // Initial load
    useEffect(() => {
        pageRef.current = 0;
        loadVideos(0);
    }, [loadVideos]);

    // Track current video via IntersectionObserver
    useEffect(() => {
        if (videos.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const index = Number(
                            (entry.target as HTMLElement).dataset.videoIndex
                        );
                        if (!isNaN(index)) {
                            setCurrentIndex(index);
                        }
                    }
                }
            },
            { threshold: 0.6 }
        );

        itemRefs.current.forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, [videos]);

    // Infinite scroll with IntersectionObserver
    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    pageRef.current += 1;
                    loadVideos(pageRef.current, true);
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadVideos]);

    // Pull-to-refresh touch handlers
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onTouchStart = (e: TouchEvent) => {
            if (container.scrollTop === 0) {
                touchStartY.current = e.touches[0].clientY;
            } else {
                touchStartY.current = 0;
            }
            pullDistance.current = 0;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchStartY.current === 0 || isRefreshing) return;
            const delta = e.touches[0].clientY - touchStartY.current;
            if (delta > 0 && container.scrollTop === 0) {
                pullDistance.current = Math.min(delta * 0.4, 100);
                setPullOffset(pullDistance.current);
                if (delta > 20) e.preventDefault();
            }
        };

        const onTouchEnd = () => {
            if (pullDistance.current > 60 && !isRefreshing) {
                handleRefresh();
            }
            pullDistance.current = 0;
            setPullOffset(0);
            touchStartY.current = 0;
        };

        container.addEventListener("touchstart", onTouchStart, { passive: true });
        container.addEventListener("touchmove", onTouchMove, { passive: false });
        container.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            container.removeEventListener("touchstart", onTouchStart);
            container.removeEventListener("touchmove", onTouchMove);
            container.removeEventListener("touchend", onTouchEnd);
        };
    }, [isRefreshing, handleRefresh]);

    // Register item ref callback
    const setItemRef = useCallback(
        (index: number) => (el: HTMLElement | null) => {
            if (el) {
                itemRefs.current.set(index, el);
            } else {
                itemRefs.current.delete(index);
            }
        },
        []
    );

    // Compute virtual window boundaries
    const windowStart = Math.max(0, currentIndex - WINDOW_BEFORE);
    const windowEnd = Math.min(videos.length - 1, currentIndex + WINDOW_AFTER);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-8 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                    onClick={() => { pageRef.current = 0; loadVideos(0); }}
                    className="bg-primary px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-8 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Nenhum vídeo ainda</h2>
                <p className="text-white/40 text-sm mb-8">Seja o primeiro a carregar um vídeo de produto e comece a vender!</p>
                <Link href="/merchant/add-product" className="bg-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                    Carregar Vídeo
                </Link>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="video-container h-screen overflow-y-scroll snap-y snap-mandatory bg-black"
        >
            {/* Pull-to-refresh indicator */}
            {pullOffset > 0 && (
                <div
                    className="flex items-center justify-center bg-black transition-all"
                    style={{ height: `${pullOffset}px` }}
                >
                    <Loader2
                        className="w-6 h-6 text-primary"
                        style={{
                            opacity: Math.min(pullOffset / 60, 1),
                            transform: `rotate(${pullOffset * 3}deg)`,
                        }}
                    />
                </div>
            )}

            {isRefreshing && (
                <div className="flex items-center justify-center h-12 bg-black">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            )}

            {videos.map((video, index) => {
                const isInWindow = index >= windowStart && index <= windowEnd;
                const preloadLevel = getPreloadLevel(index, currentIndex);
                const isActive = index === currentIndex;

                return (
                    <section
                        key={video.id}
                        ref={setItemRef(index)}
                        data-video-index={index}
                        className="snap-start h-screen"
                    >
                        {isInWindow ? (
                            <VideoItem
                                video={video}
                                isActive={isActive}
                                preloadLevel={preloadLevel}
                                onError={() => handleVideoError(video.id)}
                            />
                        ) : (
                            <div className="h-screen bg-black" />
                        )}
                    </section>
                );
            })}

            {/* Sentinel for infinite scroll */}
            {hasMore && (
                <div ref={sentinelRef} className="snap-start h-24 flex items-center justify-center bg-black">
                    {loadingMore && (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    )}
                </div>
            )}
        </div>
    );
}
