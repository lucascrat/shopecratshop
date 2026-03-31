"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import VideoItem from "./VideoItem";
import { getVideos } from "@/lib/videos";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { VideoFeedItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function VideoFeed() {
    const { user } = useAuth();
    const [videos, setVideos] = useState<VideoFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageRef = useRef(0);
    const sentinelRef = useRef<HTMLDivElement>(null);

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

    // Initial load
    useEffect(() => {
        pageRef.current = 0;
        loadVideos(0);
    }, [loadVideos]);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
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
        <div className="video-container h-screen overflow-y-scroll snap-y snap-mandatory bg-black">
            {videos.map((video) => (
                <section key={video.id} className="snap-start h-screen">
                    <VideoItem video={video} onError={() => handleVideoError(video.id)} />
                </section>
            ))}

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
