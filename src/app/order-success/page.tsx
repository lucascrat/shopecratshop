"use client";

import { CheckCircle2, ShoppingBag, ArrowRight, Share2, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function OrderSuccessPage() {
    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                    </div>
                </div>
            </div>

            <h1 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">Pedido Realizado!</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-10">Obrigado por comprar no Shopcrat</p>

            <div className="w-full bg-white/5 border border-white/5 rounded-[32px] p-6 mb-8 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Número do Pedido</p>
                        <p className="text-sm font-black text-white">#SKU-7829-X1</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Pago</p>
                        <p className="text-lg font-black text-primary">R$ 64,00</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-white/10 shrink-0">
                            <Image src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100" alt="Prod" fill className="object-cover" />
                        </div>
                        <div>
                            <p className="text-xs font-bold leading-tight">Vibes Oversized Hoodie</p>
                            <p className="text-[10px] text-white/30 uppercase font-black">Tam: G | Cor: Cinza</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-3">
                <Link
                    href="/profile"
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                >
                    Acompanhar Pedido
                    <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="grid grid-cols-2 gap-3">
                    <button className="h-14 bg-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl border border-white/5 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px]">
                        <Download className="w-4 h-4" />
                        Nota Fiscal
                    </button>
                    <button className="h-14 bg-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl border border-white/5 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px]">
                        <Share2 className="w-4 h-4" />
                        Compartilhar
                    </button>
                </div>

                <Link
                    href="/"
                    className="block pt-4 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                >
                    Voltar para o Início
                </Link>
            </div>
        </main>
    );
}
