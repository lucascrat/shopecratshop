"use client";

import { Search, Settings, Edit3, CheckCheck, MoreHorizontal, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const MESSAGES = [
    {
        id: 1,
        name: "Luxe Beauty Store",
        lastMessage: "Seu pedido #SKU-291 foi enviado!",
        time: "2m",
        unread: true,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=luxe",
        verified: true,
        online: true,
    },
    {
        id: 2,
        name: "Urban Tech Gear",
        lastMessage: "Novidades na seção de casa inteligente chegaram.",
        time: "1h",
        unread: false,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=urban",
        verified: true,
        online: false,
    },
    {
        id: 3,
        name: "FitLife Apparel",
        lastMessage: "Obrigado pelo feedback sobre suas leggings!",
        time: "3h",
        unread: true,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=fit",
        verified: false,
        online: true,
    },
    {
        id: 4,
        name: "Glow Skincare Official",
        lastMessage: "Seu reembolso de R$ 24,99 foi processado.",
        time: "Ontem",
        unread: false,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=glow",
        verified: true,
        online: false,
    },
    {
        id: 5,
        name: "Home Decor Studio",
        lastMessage: "Sentimos sua falta! Aqui está um cupom de 10%.",
        time: "Terça",
        unread: false,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=home",
        verified: false,
        online: false,
    },
];

export default function MessagesPage() {
    const [activeTab, setActiveTab] = useState("Todas");

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between p-6 pb-2">
                    <button className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                        <Settings className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold italic uppercase tracking-tight">Mensagens</h1>
                    <button className="p-2 -mr-2 text-primary hover:text-primary/80 transition-colors">
                        <Edit3 className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar lojas ou conversas..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-white/20 text-sm"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 px-8 border-b border-white/5">
                    {["Todas", "Não lidas", "Promos"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-primary' : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_-2px_8px_rgba(43,124,238,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Message List */}
            <div className="divide-y divide-white/5">
                {MESSAGES.map((msg) => (
                    <Link
                        key={msg.id}
                        href={`/messages/${msg.id}`}
                        className="flex items-center gap-4 p-6 hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 relative">
                                <Image src={msg.avatar} alt={msg.name} fill className="object-cover" />
                            </div>
                            {msg.online && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background-dark rounded-full shadow-lg" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <h3 className={`text-sm font-bold truncate ${msg.unread ? 'text-white' : 'text-white/80'}`}>
                                        {msg.name}
                                    </h3>
                                    {msg.verified && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                                </div>
                                <span className={`text-[10px] font-bold ${msg.unread ? 'text-primary' : 'text-white/30'}`}>
                                    {msg.time}
                                </span>
                            </div>
                            <p className={`text-xs truncate ${msg.unread ? 'text-white/90 font-bold' : 'text-white/40'}`}>
                                {msg.lastMessage}
                            </p>
                        </div>

                        {msg.unread && (
                            <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(43,124,238,0.5)]" />
                        )}
                    </Link>
                ))}
            </div>

            <div className="p-12 text-center text-white/20 italic">
                <p className="text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                    <span className="h-px w-8 bg-white/5"></span>
                    Fim das conversas
                    <span className="h-px w-8 bg-white/5"></span>
                </p>
            </div>

            <BottomNav />
        </main>
    );
}
