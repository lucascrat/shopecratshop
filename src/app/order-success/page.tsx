"use client";

import { CheckCircle2, ArrowRight, Share2, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Order {
    id: string;
    total: number;
    status: string;
    created_at: string;
    quantity: number;
    payment_method: string;
    store_name: string;
    product: {
        name: string;
        images: string[];
        price: number;
    };
}

const PAYMENT_LABEL: Record<string, string> = {
    pix:             "PIX",
    card:            "Cartão de Crédito",
    pay_on_delivery: "Pagar ao Receber",
    store_pickup:    "Retirada na Loja",
};

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(!!orderId);

    useEffect(() => {
        if (!orderId) return;
        apiFetch<{ order: Order }>(`/api/orders/${orderId}`)
            .then((data) => setOrder(data.order))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [orderId]);

    const shortId = orderId
        ? `#${orderId.substring(0, 8).toUpperCase()}`
        : "#SKU-????";

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Success Icon */}
            <div className="relative mb-8">
                <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                    </div>
                </div>
            </div>

            <h1 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">Pedido Realizado!</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-10">Obrigado por comprar no Shopcrat</p>

            {/* Order Card */}
            <div className="w-full bg-white/5 border border-white/5 rounded-[32px] p-6 mb-8 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Order number + total */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Número do Pedido</p>
                                <p className="text-sm font-black text-white">{shortId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Pago</p>
                                <p className="text-lg font-black text-primary">
                                    R$ {order ? order.total.toFixed(2) : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Product */}
                        {order ? (
                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-white/10 shrink-0 bg-black/30">
                                    {order.product.images?.[0] ? (
                                        <Image
                                            src={order.product.images[0]}
                                            alt={order.product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20">
                                            <Package className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold leading-tight">{order.product.name}</p>
                                    <p className="text-[10px] text-white/30 uppercase font-black mt-0.5">{order.store_name}</p>
                                    <p className="text-[10px] text-white/20 font-bold mt-0.5">
                                        Qtd: {order.quantity} • {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-14 h-14 rounded-xl border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-white/20" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white/40">Pedido confirmado</p>
                                    <p className="text-[10px] text-white/20 font-bold mt-0.5">Detalhes em breve</p>
                                </div>
                            </div>
                        )}

                        {/* Status badge */}
                        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <p className="text-[10px] font-black text-green-400 uppercase tracking-wider">
                                Pedido recebido com sucesso
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3">
                <Link
                    href="/profile"
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                >
                    Acompanhar Pedido
                    <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: "Comprei no Shopcrat!",
                                text: `Acabei de fazer um pedido ${shortId} no Shopcrat!`,
                                url: window.location.href,
                            });
                        }
                    }}
                    className="w-full h-14 bg-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl border border-white/5 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px]"
                >
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                </button>

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

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        }>
            <OrderSuccessContent />
        </Suspense>
    );
}
