"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Coins, ChevronLeft, TicketPercent, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Coupon } from "@/lib/types";

interface ServerCoupon extends Coupon {
    owned: boolean;
    used: boolean;
}

export default function WalletPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [coins, setCoins] = useState<number>(0);
    const [coupons, setCoupons] = useState<ServerCoupon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchWallet = async () => {
            try {
                const data = await apiFetch<{ coins: number; coupons: ServerCoupon[] }>("/api/wallet");
                setCoins(data.coins);
                setCoupons(data.coupons);
            } catch (err) {
                toast.error("Erro ao carregar carteira");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchWallet();
    }, [user, router]);

    const handleRedeem = async (coupon: ServerCoupon) => {
        if (coupon.cost_in_coins && coins < coupon.cost_in_coins) {
            toast.error("Saldo insuficiente de moedas!");
            return;
        }

        try {
            const result = await apiFetch<{ success: boolean; newBalance: number }>("/api/wallet", {
                method: "POST",
                body: JSON.stringify({ couponId: coupon.id })
            });

            if (result.success) {
                toast.success("Cupom resgatado com sucesso!");
                setCoins(result.newBalance);
                setCoupons(prev => prev.map(c => 
                    c.id === coupon.id ? { ...c, owned: true, used: false } : c
                ));
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao resgatar cupom");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#1E120D] text-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1E120D] text-white flex flex-col pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#1E120D]/80 backdrop-blur border-b border-white/5 p-4 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Minha Carteira</h1>
                <div className="w-10"></div>
            </header>

            {/* Coins Balance Card */}
            <div className="p-4">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/30 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    
                    <div className="flex items-center gap-2 text-yellow-500/80 font-medium mb-2">
                        <Coins className="w-5 h-5" />
                        <span>Saldo de Moedas</span>
                    </div>
                    
                    <div className="flex items-end gap-2 text-yellow-500">
                        <span className="text-5xl font-extrabold tracking-tight">{coins.toLocaleString()}</span>
                        <span className="text-lg font-medium mb-1">🪙</span>
                    </div>

                    <p className="text-white/50 text-sm mt-4 max-w-[200px]">
                        Assista a mais vídeos de lojas para ganhar mais moedas e trocá-las por cupons.
                    </p>
                </div>
            </div>

            {/* Coupons Section */}
            <div className="px-4 mt-4">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TicketPercent className="w-5 h-5 text-primary" />
                    Central de Cupons
                </h2>

                <div className="flex flex-col gap-3">
                    {coupons.length === 0 ? (
                        <div className="text-center py-10 text-white/40">
                            Nenhum cupom disponível no momento.
                        </div>
                    ) : (
                        coupons.map(coupon => (
                            <div key={coupon.id} className="bg-white/5 rounded-2xl flex items-center overflow-hidden border border-white/5">
                                {/* Left Side - Discount */}
                                <div className="bg-primary/20 w-24 flex-shrink-0 flex flex-col items-center justify-center p-4 border-r border-dashed border-white/20 relative">
                                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#1E120D] rounded-full"></div>
                                    <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#1E120D] rounded-full"></div>
                                    
                                    <span className="text-xl font-black text-primary mb-1">
                                        {coupon.discount_type === 'percentage' 
                                            ? `${coupon.discount_amount}%` 
                                            : `R$ ${coupon.discount_amount}`
                                        }
                                    </span>
                                    <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Desconto</span>
                                </div>
                                
                                {/* Right Side - Details & Action */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-sm">{coupon.code}</h3>
                                        <p className="text-xs text-white/40 mt-1">
                                            {coupon.min_purchase ? `Mínimo R$ ${coupon.min_purchase}` : 'Qualquer valor'}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-yellow-500 text-sm font-bold">
                                            {coupon.cost_in_coins ? (
                                                <>
                                                    <Coins className="w-4 h-4" />
                                                    {coupon.cost_in_coins}
                                                </>
                                            ) : (
                                                <span className="text-green-400">Grátis</span>
                                            )}
                                        </div>
                                        
                                        {coupon.used ? (
                                            <span className="text-xs text-white/30 flex items-center gap-1 font-medium bg-white/5 px-3 py-1.5 rounded-full">
                                                Utilizado
                                            </span>
                                        ) : coupon.owned ? (
                                            <span className="text-xs text-primary flex items-center gap-1 font-bold bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Seu
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleRedeem(coupon)}
                                                className="bg-yellow-500 text-black text-xs font-bold px-4 py-1.5 rounded-full transition-transform active:scale-95"
                                            >
                                                Resgatar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
