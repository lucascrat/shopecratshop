"use client";

import {
    ArrowLeft, TrendingUp, Package, ShoppingBag, BarChart3,
    Loader2, LayoutDashboard, Video, DollarSign
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface DailySale {
    date: string;
    orders: number;
    revenue: number;
}

interface TopProduct {
    id: string;
    name: string;
    images: string[];
    price: number;
    sales_count: number;
    revenue: number;
}

interface StatusBreakdown {
    pending:   number;
    confirmed: number;
    shipped:   number;
    delivered: number;
    cancelled: number;
}

interface AnalyticsData {
    dailySales:      DailySale[];
    topProducts:     TopProduct[];
    statusBreakdown: StatusBreakdown;
    totalRevenue:    number;
    totalOrders:     number;
    avgOrderValue:   number;
}

// Simple bar chart using CSS
function BarChart({ data, valueKey }: { data: DailySale[]; valueKey: "revenue" | "orders" }) {
    const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">
                Sem dados no período
            </div>
        );
    }

    return (
        <div className="flex items-end gap-1 h-32 w-full">
            {data.map((d) => {
                const height = Math.max((d[valueKey] / maxVal) * 100, 3);
                const label  = new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                });
                return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                            className="w-full bg-primary/30 group-hover:bg-primary rounded-t transition-all relative"
                            style={{ height: `${height}%` }}
                            title={`${label}: ${valueKey === "revenue" ? `R$ ${d.revenue.toFixed(2)}` : `${d.orders} pedidos`}`}
                        />
                    </div>
                );
            })}
        </div>
    );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:   { label: "Pendente",   color: "bg-yellow-500" },
    confirmed: { label: "Confirmado", color: "bg-blue-500" },
    shipped:   { label: "Enviado",    color: "bg-primary" },
    delivered: { label: "Entregue",   color: "bg-green-500" },
    cancelled: { label: "Cancelado",  color: "bg-red-500" },
};

export default function AnalyticsPage() {
    const router = useRouter();
    const [data, setData]       = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartMode, setChartMode] = useState<"revenue" | "orders">("revenue");

    useEffect(() => {
        apiFetch<AnalyticsData>("/api/merchant/analytics")
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </main>
        );
    }

    const totalStatus = data
        ? Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-32">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-base font-black uppercase tracking-widest italic">Analítico</h1>
                <BarChart3 className="w-5 h-5 text-primary" />
            </header>

            <div className="p-5 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-1">
                        <DollarSign className="w-5 h-5 text-primary mb-1" />
                        <p className="text-lg font-black italic text-white">
                            {data?.totalRevenue
                                ? `R$\u00a0${data.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                : "R$\u00a00"}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Receita</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-1">
                        <ShoppingBag className="w-5 h-5 text-blue-400 mb-1" />
                        <p className="text-lg font-black italic text-white">{data?.totalOrders || 0}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Pedidos</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-1">
                        <TrendingUp className="w-5 h-5 text-green-400 mb-1" />
                        <p className="text-lg font-black italic text-white">
                            {data?.avgOrderValue
                                ? `R$\u00a0${data.avgOrderValue.toFixed(0)}`
                                : "R$\u00a00"}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Ticket Médio</p>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Últimos 30 dias</h3>
                            <p className="text-[10px] text-white/30 font-bold">
                                {chartMode === "revenue" ? "Receita diária" : "Pedidos por dia"}
                            </p>
                        </div>
                        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                            <button
                                onClick={() => setChartMode("revenue")}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    chartMode === "revenue"
                                        ? "bg-primary text-white"
                                        : "text-white/30 hover:text-white"
                                }`}
                            >
                                R$
                            </button>
                            <button
                                onClick={() => setChartMode("orders")}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    chartMode === "orders"
                                        ? "bg-primary text-white"
                                        : "text-white/30 hover:text-white"
                                }`}
                            >
                                Pedidos
                            </button>
                        </div>
                    </div>
                    <BarChart data={data?.dailySales || []} valueKey={chartMode} />
                    <div className="flex justify-between mt-2">
                        <p className="text-[8px] text-white/20 font-bold">30 dias atrás</p>
                        <p className="text-[8px] text-white/20 font-bold">Hoje</p>
                    </div>
                </div>

                {/* Status Breakdown */}
                {totalStatus > 0 && (
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/80 mb-4">Status dos Pedidos</h3>

                        {/* Progress bars */}
                        <div className="space-y-3">
                            {Object.entries(data?.statusBreakdown || {}).map(([status, count]) => {
                                if (count === 0) return null;
                                const pct = totalStatus > 0 ? (count / totalStatus) * 100 : 0;
                                const info = STATUS_LABELS[status] || { label: status, color: "bg-white/20" };
                                return (
                                    <div key={status}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-bold text-white/60">{info.label}</span>
                                            <span className="text-[10px] font-black text-white/40">{count}</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${info.color}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top Products */}
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 px-1">
                        Produtos Mais Vendidos
                    </h3>

                    {!data?.topProducts?.length ? (
                        <div className="text-center py-8 text-white/20 text-sm">
                            Nenhum produto ainda
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.topProducts.map((prod, idx) => (
                                <div key={prod.id} className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center gap-4">
                                    <span className="text-2xl font-black italic text-white/10 w-6 shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden relative bg-black/30 shrink-0 border border-white/5">
                                        {prod.images?.[0] && (
                                            <Image src={prod.images[0]} alt={prod.name} fill className="object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight text-white/80 truncate">
                                            {prod.name}
                                        </p>
                                        <p className="text-[9px] text-white/30 font-bold mt-0.5">
                                            {prod.sales_count} vendas
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-primary font-black text-sm italic">
                                            R$ {prod.revenue.toFixed(2)}
                                        </p>
                                        <p className="text-[9px] text-white/20 font-bold">receita</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Merchant Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background-dark/95 backdrop-blur-3xl border-t border-white/5 h-24 flex items-center justify-around px-8 pb-6 z-50">
                <Link href="/merchant/dashboard" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
                </Link>
                <Link href="/merchant/stock" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <Package className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Estoque</span>
                </Link>
                <Link href="/" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <Video className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Feed</span>
                </Link>
                <div className="flex flex-col items-center gap-1.5 text-primary">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mb-1" />
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Analítico</span>
                </div>
            </nav>
        </main>
    );
}
