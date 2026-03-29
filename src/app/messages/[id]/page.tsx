"use client";

import { ArrowLeft, MoreHorizontal, Plus, Send, StickyNote, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ChatPage({ params }: { params: { id: string } }) {
    const [message, setMessage] = useState("");

    return (
        <main className="max-w-[430px] mx-auto h-screen bg-background-dark text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <Link href="/messages" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex flex-col items-center flex-1">
                    <h2 className="text-sm font-bold uppercase tracking-tight">Artisan Ceramics</h2>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Online</span>
                    </div>
                </div>
                <button className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex justify-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 bg-white/5 px-3 py-1 rounded-full">Hoje</span>
                </div>

                {/* Store Message */}
                <div className="flex items-end gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 relative">
                        <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=artisan" alt="Store" fill />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/20 pl-1 uppercase tracking-tight">Artisan Ceramics</p>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-none text-sm leading-relaxed text-white/80">
                            Olá! Vimos que você estava olhando nossa nova coleção. Como posso te ajudar hoje?
                        </div>
                    </div>
                </div>

                {/* User Message */}
                <div className="flex items-end gap-3 justify-end ml-auto max-w-[85%] text-right">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/20 pr-1 uppercase tracking-tight">Você</p>
                        <div className="bg-primary p-4 rounded-2xl rounded-br-none text-sm leading-relaxed text-white font-medium shadow-lg shadow-primary/20">
                            Oi! Eu vi esse vaso no seu vídeo. Ele vem na cor azul?
                        </div>
                    </div>
                </div>

                {/* Product Card Message */}
                <div className="flex justify-end pr-11">
                    <div className="w-full max-w-[240px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="aspect-square relative group overflow-hidden">
                            <Image src="https://images.unsplash.com/photo-1578500484722-19bc30ce97ae?w=400" alt="Vase" fill className="object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-tight truncate">Vaso de Cerâmica Cobalto</h4>
                                <p className="text-primary font-black">R$ 45,00</p>
                            </div>
                            <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                Ver Produto
                            </button>
                        </div>
                    </div>
                </div>

                {/* Store Message */}
                <div className="flex items-end gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 relative">
                        <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=artisan" alt="Store" fill />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/20 pl-1 uppercase tracking-tight">Artisan Ceramics</p>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-none text-sm leading-relaxed text-white/80">
                            Sim, temos! Compartilhei o link acima. Temos apenas 3 unidades restantes da edição azul cobalto.
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Replies */}
            <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5">
                {["Tem estoque?", "Valor do frete?", "Outras cores?"].map((reply) => (
                    <button key={reply} className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all">
                        {reply}
                    </button>
                ))}
            </div>

            {/* Input */}
            <footer className="p-4 pb-10 bg-background-dark/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <button className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/5">
                        <Plus className="w-6 h-6" />
                    </button>
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            placeholder="Mensagem para a loja..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-4 pr-12 focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-white/20 text-sm"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors">
                            <StickyNote className="w-5 h-5" />
                        </button>
                    </div>
                    <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${message ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white/5 text-white/20'}`}>
                        <Send className="w-6 h-6" />
                    </button>
                </div>
            </footer>
        </main>
    );
}
