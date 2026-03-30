"use client";

import { ArrowLeft, MoreHorizontal, Send, Store, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, use } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface Message {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender_username: string;
    sender_name: string;
    sender_avatar: string | null;
}

interface ConversationData {
    conversation: {
        id: string;
        user_id: string;
        store_id: string;
        is_user: boolean;
        is_merchant: boolean;
    };
    store: {
        id: string;
        name: string;
        logo_url: string | null;
        username: string | null;
    } | null;
    customer: {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    messages: Message[];
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDay(dateStr: string): string {
    const d   = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Hoje";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useAuth();

    const [data, setData]           = useState<ConversationData | null>(null);
    const [messages, setMessages]   = useState<Message[]>([]);
    const [input, setInput]         = useState("");
    const [loading, setLoading]     = useState(true);
    const [sending, setSending]     = useState(false);
    const bottomRef                 = useRef<HTMLDivElement>(null);
    const pollRef                   = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !id) return;
        loadConversation();
        // Poll for new messages every 5s
        pollRef.current = setInterval(pollMessages, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [user, id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function loadConversation() {
        try {
            const res = await apiFetch<ConversationData>(`/api/conversations/${id}`);
            setData(res);
            setMessages(res.messages || []);
        } catch (err: any) {
            toast.error(err.message || "Erro ao carregar conversa");
        } finally {
            setLoading(false);
        }
    }

    async function pollMessages() {
        try {
            const res = await apiFetch<ConversationData>(`/api/conversations/${id}`);
            setMessages(res.messages || []);
        } catch {}
    }

    async function handleSend() {
        if (!input.trim() || sending) return;
        const text = input.trim();
        setInput("");
        setSending(true);

        // Optimistic update
        const optimistic: Message = {
            id:              `opt-${Date.now()}`,
            content:         text,
            created_at:      new Date().toISOString(),
            sender_id:       user!.id,
            sender_username: "",
            sender_name:     "",
            sender_avatar:   null,
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            await apiFetch(`/api/conversations/${id}`, {
                method: "POST",
                body: JSON.stringify({ content: text }),
            });
            // Refresh to get server-confirmed message
            pollMessages();
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar mensagem");
            // Remove optimistic message on failure
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setInput(text);
        } finally {
            setSending(false);
        }
    }

    const isMerchant = data?.conversation.is_merchant ?? false;

    // The "other party" from current user's perspective
    const otherName   = isMerchant
        ? (data?.customer?.full_name || data?.customer?.username || "Cliente")
        : (data?.store?.name || "Loja");
    const otherAvatar = isMerchant
        ? data?.customer?.avatar_url
        : data?.store?.logo_url;

    // Group messages by day
    const grouped: { day: string; msgs: Message[] }[] = [];
    for (const msg of messages) {
        const day = formatDay(msg.created_at);
        const last = grouped[grouped.length - 1];
        if (last && last.day === day) {
            last.msgs.push(msg);
        } else {
            grouped.push({ day, msgs: [msg] });
        }
    }

    if (loading) {
        return (
            <main className="max-w-[430px] mx-auto h-screen bg-background-dark text-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </main>
        );
    }

    return (
        <main className="max-w-[430px] mx-auto h-screen bg-background-dark text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <Link href="/messages" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="flex items-center gap-3 flex-1 justify-center">
                    <div className="w-9 h-9 rounded-xl overflow-hidden relative border border-white/10 bg-white/5 shrink-0">
                        {otherAvatar ? (
                            <Image src={otherAvatar} alt={otherName} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                <Store className="w-4 h-4 text-primary" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-tight leading-none">{otherName}</h2>
                        {!isMerchant && data?.store?.username && (
                            <p className="text-[9px] text-primary/60 font-bold mt-0.5">@{data.store.username}</p>
                        )}
                    </div>
                </div>

                <button className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {grouped.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                            <Store className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/30 text-sm font-bold">Início da conversa</p>
                        <p className="text-white/15 text-xs">
                            {isMerchant
                                ? "O cliente entrará em contato em breve"
                                : "Envie uma mensagem para a loja"}
                        </p>
                    </div>
                ) : (
                    grouped.map(({ day, msgs }) => (
                        <div key={day}>
                            {/* Day separator */}
                            <div className="flex justify-center my-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 bg-white/5 px-3 py-1 rounded-full">
                                    {day}
                                </span>
                            </div>

                            {msgs.map((msg) => {
                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex items-end gap-2 mb-2 ${isMe ? "justify-end" : "justify-start"}`}
                                    >
                                        {/* Avatar (other party) */}
                                        {!isMe && (
                                            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 relative bg-white/5 shrink-0">
                                                {otherAvatar ? (
                                                    <Image src={otherAvatar} alt={otherName} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                                        <Store className="w-3 h-3 text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                                isMe
                                                    ? "bg-primary text-white rounded-br-sm shadow-lg shadow-primary/20"
                                                    : "bg-white/5 border border-white/5 text-white/80 rounded-bl-sm"
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-white/20 font-bold px-1">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick Replies (non-merchant only) */}
            {!isMerchant && messages.length === 0 && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5">
                    {["Tem estoque?", "Qual o prazo?", "Faz entrega?"].map((reply) => (
                        <button
                            key={reply}
                            onClick={() => setInput(reply)}
                            className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <footer className="p-4 pb-10 bg-background-dark/80 backdrop-blur-xl border-t border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            placeholder={isMerchant ? "Responder cliente..." : "Mensagem para a loja..."}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-4 pr-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-white/20 text-sm"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            input.trim() && !sending
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                : "bg-white/5 text-white/20"
                        }`}
                    >
                        {sending
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : <Send className="w-5 h-5" />
                        }
                    </button>
                </div>
            </footer>
        </main>
    );
}
