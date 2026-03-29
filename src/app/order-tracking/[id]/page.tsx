"use client";

import { Box, MapPin, Truck, CheckCircle2, ChevronLeft, Package, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const STEPS = [
    { id: 1, title: "Pedido Confirmado", subtitle: "22 Out, 10:30", completed: true, current: false },
    { id: 2, title: "Em Processamento", subtitle: "22 Out, 14:15", completed: true, current: false },
    { id: 3, title: "Enviado", subtitle: "23 Out, 09:10", completed: true, current: true, icon: Truck },
    { id: 4, title: "Saiu para Entrega", subtitle: "Previsão hoje", completed: false, current: false },
    { id: 5, title: "Entregue", subtitle: "-", completed: false, current: false },
];

export default function OrderTrackingPage() {
    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-10">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <Link href="/profile" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-widest italic">Rastrear Pedido</h1>
                <div className="w-10" />
            </header>

            {/* Hero Stats */}
            <section className="p-6">
                <div className="bg-primary/10 border border-primary/20 rounded-[32px] p-6 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Previsão de Entrega</p>
                    <h2 className="text-3xl font-black mb-4 uppercase italic">25 de Outubro</h2>

                    <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest">
                        <Box className="w-3.5 h-3.5" />
                        Pedido: #SKU-7829-X1
                    </div>
                </div>

                {/* Tracking Timeline */}
                <div className="space-y-0 pl-4 py-4 relative">
                    <div className="absolute left-[31px] top-6 bottom-6 w-0.5 bg-white/5" />

                    {STEPS.map((step, index) => {
                        const isLast = index === STEPS.length - 1;
                        return (
                            <div key={step.id} className={`flex gap-6 pb-10 relative ${isLast ? 'pb-0' : ''}`}>
                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 border-background-dark ${step.completed ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/10'
                                    }`}>
                                    {step.id === 3 ? <Truck className="w-4 h-4" /> :
                                        step.completed ? <CheckCircle2 className="w-4 h-4 fill-current" /> :
                                            <div className="w-2 h-2 rounded-full bg-current" />}
                                </div>

                                <div className="flex-1">
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${step.current ? 'text-primary' : step.completed ? 'text-white' : 'text-white/20'}`}>
                                        {step.title}
                                    </h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${step.completed ? 'text-white/40' : 'text-white/10'}`}>
                                        {step.subtitle}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Shipping Address */}
            <section className="px-6 space-y-4">
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Endereço de Entrega</h4>
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary shrink-0">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white mb-1">Av. Paulista, 1000</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">Apto 42, Bela Vista<br />São Paulo - SP, 01310-100</p>
                    </div>
                </div>
            </section>

            {/* Action Buttons */}
            <div className="p-6 pt-10">
                <button className="w-full h-15 bg-white text-black font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs">
                    Suporte ao Pedido
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-6 text-[9px] text-white/20 uppercase tracking-widest font-black">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Compra Protegida por Shopcrat
                </div>
            </div>
        </main>
    );
}
