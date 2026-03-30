"use client";

import { Search, Settings, Edit3, Store, Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

interface Conversation {
    id: string;
    user_id: string;
    store_id: string;
    last_message: string | null;
    last_message_at: string | null;
    unread_user: number;
    unread_store: number;
    user_username: string;
    user_name: string;
    user_avatar: string | null;
    store_name: string;
    store_logo: string | null;
    store_username: string | null;
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const now  = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60)    return "Agora";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function MessagesPage() {
    const { user, profile } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filtered, setFiltered]           = useState<Conversation[]>([]);
    const [search, setSearch]               = useState("");
    const [loading, setLoading]             = useState(true);
    const [isMerchant, setIsMerchant]       = useState(false);
    const [activeTab, setActiveTab]         = useState<"Todas" | "Não lidas">("Todas");

    useEffect(() => {
        if (!user) return;
        apiFetch<{ conversations: Conversation[]; isMerchant: boolean }>("/api/conversations")
            .then((data) => {
                setConversations(data.conversations || []);
                setFiltered(data.conversations || []);
                setIsMerchant(data.isMerchant || false);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    // Filter by search + tab
    useEffect(() => {
        let list = conversations;
        if (activeTab === "Não lidas") {
            list = list.filter((c) =>
                isMerchant ? c.unread_store > 0 : c.unread_user > 0
            );
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((c) =>
                c.store_name.toLowerCase().includes(q) ||
                c.user_name?.toLowerCase().includes(q) ||
                c.user_username?.toLowerCase().includes(q)
            );
        }
        setFiltered(list);
    }, [conversations, search, activeTab, isMerchant]);

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between p-6 pb-2">
                    <button className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                        <Settings className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold italic uppercase tracking-tight">Mensagens</h1>
                    <div className="p-2 -mr-2 text-white/20">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                </div>

                {/* Search */}
                <div className="px-6 py-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar conversas..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-white/20 text-sm"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 px-8 border-b border-white/5">
                    {(["Todas", "Não lidas"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold transition-all relative ${
                                activeTab === tab ? "text-primary" : "text-white/40 hover:text-white/60"
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_-2px_8px_rgba(244,106,37,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                    <MessageCircle className="w-16 h-16 text-white/10 mb-4" />
                    <p className="text-white/30 text-sm font-bold mb-2">
                        {conversations.length === 0 ? "Nenhuma conversa ainda" : "Nenhum resultado"}
                    </p>
                    <p className="text-white/15 text-xs">
                        {conversations.length === 0
                            ? "Visite uma loja e inicie uma conversa"
                            : "Tente outro termo de busca"
                        }
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {filtered.map((conv) => {
                        const unread  = isMerchant ? conv.unread_store : conv.unread_user;
                        const hasUnread = unread > 0;

                        // Display info depends on who's viewing
                        const displayName   = isMerchant ? (conv.user_name || conv.user_username) : conv.store_name;
                        const displayAvatar = isMerchant ? conv.user_avatar : conv.store_logo;
                        const displaySub    = isMerchant
                            ? `@${conv.user_username}`
                            : (conv.store_username ? `@${conv.store_username}` : "");

                        return (
                            <Link
                                key={conv.id}
                                href={`/messages/${conv.id}`}
                                className="flex items-center gap-4 p-6 hover:bg-white/5 transition-all active:scale-[0.98]"
                            >
                                <div className="relative shrink-0">
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 relative bg-white/5">
                                        {displayAvatar ? (
                                            <Image src={displayAvatar} alt={displayName} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                                <Store className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    {hasUnread && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background-dark">
                                            <span className="text-[8px] font-black text-white">{unread > 9 ? "9+" : unread}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`text-sm font-bold truncate ${hasUnread ? "text-white" : "text-white/80"}`}>
                                            {displayName}
                                        </h3>
                                        <span className={`text-[10px] font-bold shrink-0 ml-2 ${hasUnread ? "text-primary" : "text-white/30"}`}>
                                            {timeAgo(conv.last_message_at)}
                                        </span>
                                    </div>
                                    {displaySub && (
                                        <p className="text-[9px] text-primary/60 font-bold">{displaySub}</p>
                                    )}
                                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-white/90 font-bold" : "text-white/40"}`}>
                                        {conv.last_message || "Iniciar conversa"}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {filtered.length > 0 && (
                <div className="p-12 text-center text-white/20 italic">
                    <p className="text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-white/5" />
                        Fim das conversas
                        <span className="h-px w-8 bg-white/5" />
                    </p>
                </div>
            )}

            <BottomNav />
        </main>
    );
}
