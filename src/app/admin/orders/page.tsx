"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Truck,
    Filter,
    ChevronDown,
    DollarSign,
    Search,
} from "lucide-react";

const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "confirmed", label: "Confirmados" },
    { value: "shipped", label: "Enviados" },
    { value: "delivered", label: "Entregues" },
    { value: "cancelled", label: "Cancelados" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pendente", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    confirmed: { label: "Confirmado", color: "text-blue-400", bg: "bg-blue-400/10" },
    shipped: { label: "Enviado", color: "text-purple-400", bg: "bg-purple-400/10" },
    delivered: { label: "Entregue", color: "text-green-400", bg: "bg-green-400/10" },
    cancelled: { label: "Cancelado", color: "text-red-400", bg: "bg-red-400/10" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando", color: "text-yellow-400" },
    paid: { label: "Pago", color: "text-green-400" },
    failed: { label: "Falhou", color: "text-red-400" },
    refunded: { label: "Reembolsado", color: "text-purple-400" },
};

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(`/api/admin/orders?status=${filter}&page=${page}&search=${encodeURIComponent(search)}`);
            setOrders(res.orders);
            setTotalPages(res.totalPages);
            setTotal(res.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [filter, page, search]);

    const updateOrder = async (orderId: string, updates: any) => {
        setUpdating(orderId);
        try {
            await apiFetch("/api/admin/orders", {
                method: "PATCH",
                body: JSON.stringify({ orderId, ...updates }),
            });
            toast.success("Pedido atualizado!");
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pedidos</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        {total} pedido(s) no total
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar cliente, produto ou loja..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { setFilter(opt.value); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                                filter === opt.value
                                    ? "bg-primary text-white"
                                    : "bg-white/5 text-white/40 hover:text-white"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const sc = statusConfig[order.status] || statusConfig.pending;
                            const ps = paymentStatusConfig[order.payment_status || "pending"];
                            const isExpanded = expandedOrder === order.id;

                            return (
                                <div key={order.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                    {/* Order Header */}
                                    <button
                                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-white/40">
                                                    #{order.id.substring(0, 8)}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${sc.bg} ${sc.color}`}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-primary font-black text-sm italic">
                                                    R$ {parseFloat(order.total).toFixed(2)}
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold truncate">{order.product_name || "Produto"}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-[9px] text-white/30">
                                                {order.customer_name} → {order.store_name}
                                            </p>
                                            <p className="text-[9px] text-white/20">
                                                {new Date(order.created_at).toLocaleString("pt-BR")}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                                                <div>
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Qtd</span>
                                                    <p className="font-bold mt-0.5">{order.quantity}x</p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Pagamento</span>
                                                    <p className="font-bold mt-0.5 capitalize">{order.payment_method || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Status Pagamento</span>
                                                    <p className={`font-bold mt-0.5 ${ps.color}`}>{ps.label}</p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Endereço</span>
                                                    <p className="font-bold mt-0.5 truncate">{order.shipping_address || "N/A"}</p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Ações</p>

                                                {/* Status Update */}
                                                <div className="flex gap-2 flex-wrap">
                                                    {["confirmed", "shipped", "delivered", "cancelled"].map((s) => {
                                                        if (s === order.status) return null;
                                                        const cfg = statusConfig[s];
                                                        return (
                                                            <button
                                                                key={s}
                                                                disabled={updating === order.id}
                                                                onClick={() => updateOrder(order.id, { status: s })}
                                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color} hover:opacity-80 transition-all disabled:opacity-30`}
                                                            >
                                                                {updating === order.id ? "..." : cfg.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Payment Status */}
                                                {order.payment_status !== "paid" && (
                                                    <button
                                                        disabled={updating === order.id}
                                                        onClick={() => updateOrder(order.id, { paymentStatus: "paid" })}
                                                        className="w-full flex items-center justify-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-30"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                        {updating === order.id ? "Processando..." : "Confirmar Pagamento (Creditar Lojista)"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {orders.length === 0 && (
                            <p className="text-center text-white/20 text-sm py-12">Nenhum pedido encontrado</p>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20"
                        >
                            Anterior
                        </button>
                        <span className="text-[10px] font-bold text-white/40">
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20"
                        >
                            Próximo
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
