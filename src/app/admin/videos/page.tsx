"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    Trash2,
    Heart,
    Bookmark,
    Play,
    Store,
    ChevronDown,
} from "lucide-react";

export default function AdminVideos() {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(
                `/api/admin/videos?search=${encodeURIComponent(search)}&page=${page}`
            );
            setVideos(res.videos);
            setTotalPages(res.totalPages);
            setTotal(res.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVideos(); }, [search, page]);

    const handleDelete = async (videoId: string) => {
        if (confirmDelete !== videoId) {
            setConfirmDelete(videoId);
            return;
        }
        setDeleting(videoId);
        try {
            await apiFetch(`/api/admin/videos?id=${videoId}`, { method: "DELETE" });
            toast.success("Vídeo removido!");
            setVideos(prev => prev.filter(v => v.id !== videoId));
            setTotal(prev => prev - 1);
            setConfirmDelete(null);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Vídeos</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        {total} vídeo(s) publicado(s)
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar por loja ou produto..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Videos List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {videos.map((video) => {
                            const isExpanded = expandedVideo === video.id;
                            const thumb = video.product_images?.[0] || null;
                            const isConfirming = confirmDelete === video.id;

                            return (
                                <div key={video.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedVideo(isExpanded ? null : video.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-12 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0 relative flex items-center justify-center">
                                                {thumb ? (
                                                    <Image
                                                        src={thumb}
                                                        alt="thumb"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <Play className="w-5 h-5 text-white/20" />
                                                )}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <Play className="w-4 h-4 text-white/60" fill="white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">
                                                    {video.product_name || "Sem produto vinculado"}
                                                </p>
                                                <p className="text-[10px] text-white/30 font-bold flex items-center gap-1 mt-0.5">
                                                    <Store className="w-3 h-3" />
                                                    {video.store_name}
                                                </p>
                                                {video.description && (
                                                    <p className="text-[9px] text-white/20 truncate mt-0.5">
                                                        {video.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="flex items-center gap-2 justify-end text-[9px] text-white/30 font-bold">
                                                    <span className="flex items-center gap-0.5">
                                                        <Heart className="w-3 h-3" />
                                                        {video.like_count}
                                                    </span>
                                                    <span className="flex items-center gap-0.5">
                                                        <Bookmark className="w-3 h-3" />
                                                        {video.bookmark_count}
                                                    </span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-white/20 transition-transform mt-1 ml-auto ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Loja</span>
                                                    <p className="font-bold mt-0.5 truncate">{video.store_name}</p>
                                                </div>
                                                {video.product_price && (
                                                    <div className="bg-white/5 rounded-xl p-3">
                                                        <span className="text-white/30 font-bold uppercase tracking-wider">Preço</span>
                                                        <p className="font-bold mt-0.5 text-primary">
                                                            R$ {parseFloat(video.product_price).toFixed(2)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Curtidas</span>
                                                    <p className="font-bold mt-0.5 text-red-400">{video.like_count}</p>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Salvos</span>
                                                    <p className="font-bold mt-0.5 text-blue-400">{video.bookmark_count}</p>
                                                </div>
                                            </div>

                                            <p className="text-[9px] text-white/20 text-center">
                                                Publicado em {new Date(video.created_at).toLocaleString("pt-BR")}
                                            </p>

                                            {/* Delete action */}
                                            <button
                                                disabled={deleting === video.id}
                                                onClick={() => handleDelete(video.id)}
                                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 ${
                                                    isConfirming
                                                        ? "bg-red-500 text-white"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                                }`}
                                            >
                                                {deleting === video.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                {isConfirming ? "Confirmar remoção" : "Remover vídeo"}
                                            </button>

                                            {isConfirming && (
                                                <button
                                                    onClick={() => setConfirmDelete(null)}
                                                    className="w-full text-[9px] text-white/30 hover:text-white/60 transition-colors py-1"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {videos.length === 0 && (
                            <p className="text-center text-white/20 text-sm py-12">Nenhum vídeo encontrado</p>
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20">Anterior</button>
                        <span className="text-[10px] font-bold text-white/40">{page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20">Próximo</button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
