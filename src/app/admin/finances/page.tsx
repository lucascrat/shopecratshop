"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Wallet,
    ArrowDownToLine,
    Percent,
    PiggyBank,
} from "lucide-react";

interface FinanceData {
    totalRevenue: number;
    totalOrders: number;
    pendingWithdrawalsAmount: number;
    todayRevenue: number;
}

export default function AdminFinances() {
    const [data, setData] = useState<FinanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [platformFee, setPlatformFee] = useState(3);

    useEffect(() => {
        async function load() {
            try {
                const [dashboard, settings] = await Promise.all([
                    apiFetch<FinanceData>("/api/admin/dashboard"),
                    apiFetch<any>("/api/admin/settings"),
                ]);
                setData(dashboard);
                setPlatformFee(parseFloat(settings.settings.platform_fee_percent || "3"));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const totalRevenue = data?.totalRevenue || 0;
    const platformEarnings = totalRevenue * (platformFee / 100);
    const merchantPayouts = totalRevenue - platformEarnings;
    const pendingPayouts = data?.pendingWithdrawalsAmount || 0;

    return (
        <AdminLayout>
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="px-4 py-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Finanças</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                            Visão financeira da plataforma
                        </p>
                    </div>

                    {/* Main Revenue */}
                    <div className="bg-gradient-to-br from-green-500/20 via-green-500/5 to-transparent border border-green-500/30 rounded-3xl p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Receita Total (GMV)</p>
                                <h3 className="text-3xl font-black italic">
                                    R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="bg-green-500/20 p-3 rounded-2xl">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                            </div>
                        </div>
                        <p className="text-[10px] text-green-400/60 font-bold">
                            {data?.totalOrders || 0} pedidos processados
                        </p>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-1">Composição</h3>

                        {/* Platform Earnings */}
                        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <PiggyBank className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Lucro da Plataforma</p>
                                    <p className="text-xl font-black italic text-primary">
                                        R$ {platformEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-primary/20 px-3 py-1.5 rounded-xl">
                                    <p className="text-[10px] font-black text-primary">{platformFee}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Merchant Payouts */}
                        <div className="bg-blue-400/10 border border-blue-400/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Repasse aos Lojistas</p>
                                    <p className="text-xl font-black italic text-blue-400">
                                        R$ {merchantPayouts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-blue-400/20 px-3 py-1.5 rounded-xl">
                                    <p className="text-[10px] font-black text-blue-400">{100 - platformFee}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Pending Payouts */}
                        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                                    <ArrowDownToLine className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Saques Pendentes</p>
                                    <p className="text-xl font-black italic text-yellow-400">
                                        R$ {pendingPayouts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Flow Visualization */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Fluxo de Receita</h3>
                        <div className="space-y-3">
                            {/* Bar: Platform */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Plataforma ({platformFee}%)</span>
                                    <span className="text-[10px] font-black text-primary">
                                        R$ {platformEarnings.toFixed(2)}
                                    </span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
                                        style={{ width: `${totalRevenue > 0 ? (platformEarnings / totalRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            {/* Bar: Merchants */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Lojistas ({100 - platformFee}%)</span>
                                    <span className="text-[10px] font-black text-blue-400">
                                        R$ {merchantPayouts.toFixed(2)}
                                    </span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-400 to-blue-400/60 rounded-full transition-all duration-1000"
                                        style={{ width: `${totalRevenue > 0 ? (merchantPayouts / totalRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today Summary */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Resumo de Hoje</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[9px] text-white/30 font-bold uppercase">Faturamento</p>
                                <p className="text-lg font-black italic text-green-400">
                                    R$ {(data?.todayRevenue || 0).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/30 font-bold uppercase">Lucro Estimado</p>
                                <p className="text-lg font-black italic text-primary">
                                    R$ {((data?.todayRevenue || 0) * (platformFee / 100)).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
