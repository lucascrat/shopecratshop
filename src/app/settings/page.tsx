"use client";

import { ChevronLeft, User, Bell, Shield, Wallet, CircleHelp, Info, Languages, Moon, Trash2, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
    const { signOut } = useAuth();

    const MOCK_SECTIONS = [
        {
            title: "Conta",
            items: [
                { icon: User, label: "Informações Pessoais", color: "text-blue-400" },
                { icon: Wallet, label: "Métodos de Pagamento", color: "text-purple-400" },
                { icon: Shield, label: "Segurança e Senha", color: "text-green-400" },
            ]
        },
        {
            title: "Preferências",
            items: [
                { icon: Bell, label: "Notificações", color: "text-orange-400" },
                { icon: Languages, label: "Idioma", detail: "Português (BR)", color: "text-cyan-400" },
                { icon: Moon, label: "Aparência", detail: "Escuro", color: "text-indigo-400" },
            ]
        },
        {
            title: "Suporte",
            items: [
                { icon: CircleHelp, label: "Central de Ajuda", color: "text-pink-400" },
                { icon: Info, label: "Sobre o Shopcrat", color: "text-white/40" },
            ]
        }
    ];

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-10">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <Link href="/profile" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-widest italic">Configurações</h1>
                <div className="w-10" />
            </header>

            {/* Profile Summary Card */}
            <div className="p-6">
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 p-1">
                        <div className="w-full h-full rounded-xl overflow-hidden relative">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=alex" alt="Alex" className="object-cover" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-base font-black truncate">Alex Rivera</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">Conta Premium desde Out 2025</p>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {MOCK_SECTIONS.map((section) => (
                        <div key={section.title} className="space-y-4">
                            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">{section.title}</h4>
                            <div className="bg-white/5 border border-white/5 rounded-[32px] overflow-hidden">
                                {section.items.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.label}
                                            className={`w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group ${index !== section.items.length - 1 ? 'border-b border-white/5' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-white/80 group-hover:text-white">{item.label}</p>
                                                    {item.detail && <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider">{item.detail}</p>}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Danger Zone */}
                <div className="mt-12 space-y-4">
                    <button
                        onClick={() => signOut()}
                        className="w-full h-15 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-500 font-black rounded-2xl border border-white/5 hover:border-red-500/20 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                    </button>
                    <button className="w-full py-4 text-white/10 hover:text-red-500/40 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all">
                        <Trash2 className="w-3 h-3" />
                        Excluir Minha Conta
                    </button>
                </div>
            </div>
        </main>
    );
}
