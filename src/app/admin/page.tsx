"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
    TrendingUp,
    ShoppingBag,
    Store,
    Users,
    ArrowDownToLine,
    DollarSign,
    ChevronRight,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";

interface DashboardData {
    totalRevenue: number;
    totalOrders: number;
    totalMerchants: number;
    totalCustomers: number;
    pendingWithdrawals: number;
    pendingWithdrawalsAmount: number;
    todayOrders: number;
    todayRevenue: number;
    recentOrders: any[];
    recentWithdrawals: any[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
    confirmed: { label: "Confirmado", color: "text-blue-400 bg-blue-400/10", icon: CheckCircle2 },
    shipped: { label: "Enviado", color: "text-purple-400 bg-purple-400/10", icon: TrendingUp },
    delivered: { label: "Entregue", color: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
    cancelled: { label: "Cancelado", color: "text-red-400 bg-red-400/10", icon: XCircle },
};

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<DashboardData>("/api/admin/dashboard");
                setData(res);
            } catch (err) {
                console.error("Admin dashboard error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <AdminLayout>
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="px-4 py-6 space-y-6">
                    {/* Welcome */}
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Dashboard</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                            Visão geral da plataforma
                        </p>
                    </div>

                    {/* Revenue Card */}
                    <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 rounded-3xl p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Receita Total</p>
                                <h3 className="text-3xl font-black italic">
                                    R$ {(data?.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="bg-primary/20 p-3 rounded-2xl">
                                <TrendingUp className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Hoje</p>
                                <p className="text-lg font-black italic text-green-400">
                                    R$ {(data?.todayRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Pedidos Hoje</p>
                                <p className="text-lg font-black italic">{data?.todayOrders || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/admin/orders" className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all">
                            <ShoppingBag className="w-5 h-5 text-blue-400 mb-2" />
                            <p className="text-xl font-black italic">{data?.totalOrders || 0}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Pedidos</p>
                        </Link>
                        <Link href="/admin/merchants" className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all">
                            <Store className="w-5 h-5 text-purple-400 mb-2" />
                            <p className="text-xl font-black italic">{data?.totalMerchants || 0}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Lojistas</p>
                        </Link>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <Users className="w-5 h-5 text-green-400 mb-2" />
                            <p className="text-xl font-black italic">{data?.totalCustomers || 0}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Clientes</p>
                        </div>
                        <Link href="/admin/withdrawals" className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all relative">
                            <ArrowDownToLine className="w-5 h-5 text-yellow-400 mb-2" />
                            <p className="text-xl font-black italic">{data?.pendingWithdrawals || 0}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Saques Pend.</p>
                            {(data?.pendingWithdrawals || 0) > 0 && (
                                <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                            )}
                        </Link>
                    </div>

                    {/* Pending Withdrawals Alert */}
                    {(data?.pendingWithdrawals || 0) > 0 && (
                        <Link href="/admin/withdrawals" className="block bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-yellow-400">
                                        {data?.pendingWithdrawals} saque(s) pendente(s)
                                    </p>
                                    <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-wider">
                                        Total: R$ {(data?.pendingWithdrawalsAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-yellow-400/40" />
                            </div>
                        </Link>
                    )}

                    {/* Recent Orders */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Pedidos Recentes</h3>
                            <Link href="/admin/orders" className="text-primary text-[10px] font-black uppercase tracking-widest">
                                Ver Todos
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {(data?.recentOrders || []).slice(0, 5).map((order: any) => {
                                const sc = statusConfig[order.status] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                return (
                                    <div key={order.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-white/40">
                                                    #{order.id.substring(0, 8)}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${sc.color}`}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <span className="text-primary font-black text-sm italic">
                                                R$ {parseFloat(order.total).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold truncate max-w-[180px]">{order.product_name || "Produto"}</p>
                                                <p className="text-[9px] text-white/30 font-bold">
                                                    {order.customer_name} → {order.store_name}
                                                </p>
                                            </div>
                                            <p className="text-[9px] text-white/20">
                                                {new Date(order.created_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {(data?.recentOrders || []).length === 0 && (
                                <p className="text-center text-white/20 text-sm py-8">Nenhum pedido ainda</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </AdminLayout>
    );
}
