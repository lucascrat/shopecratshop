"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    Wallet,
    ShoppingBag,
    Package,
    ChevronDown,
    Store,
    Ban,
    CheckCircle2,
    ExternalLink,
} from "lucide-react";

export default function AdminMerchants() {
    const [merchants, setMerchants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const fetchMerchants = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(
                `/api/admin/merchants?search=${encodeURIComponent(search)}&page=${page}`
            );
            setMerchants(res.merchants);
            setTotalPages(res.totalPages);
            setTotal(res.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMerchants(); }, [search, page]);

    const toggleBlock = async (merchant: any) => {
        const action = merchant.is_blocked ? "unblock" : "block";
        setToggling(merchant.id);
        try {
            await apiFetch("/api/admin/merchants", {
                method: "PATCH",
                body: JSON.stringify({ merchantId: merchant.id, action }),
            });
            toast.success(action === "block" ? "Lojista bloqueado!" : "Lojista desbloqueado!");
            setMerchants(prev =>
                prev.map(m =>
                    m.id === merchant.id ? { ...m, is_blocked: !m.is_blocked } : m
                )
            );
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setToggling(null);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Lojistas</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        {total} lojista(s) cadastrado(s)
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar lojista..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Merchants List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {merchants.map((merchant) => {
                            const isExpanded = expandedMerchant === merchant.id;
                            return (
                                <div
                                    key={merchant.id}
                                    className={`bg-white/5 rounded-2xl border overflow-hidden transition-all ${
                                        merchant.is_blocked ? "border-red-500/20" : "border-white/5"
                                    }`}
                                >
                                    <button
                                        onClick={() => setExpandedMerchant(isExpanded ? null : merchant.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                                                <Image
                                                    src={merchant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${merchant.username}`}
                                                    alt={merchant.full_name}
                                                    width={48}
                                                    height={48}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold truncate">{merchant.full_name}</p>
                                                    {merchant.is_blocked ? (
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg bg-red-500/15 text-red-400">
                                                            Bloqueado
                                                        </span>
                                                    ) : (
                                                        <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-white/30 font-bold">
                                                    @{merchant.username} • {merchant.store_name || "Sem loja"}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-primary font-black text-sm italic">
                                                    R$ {parseFloat(merchant.wallet_balance || 0).toFixed(2)}
                                                </p>
                                                <p className="text-[8px] text-white/20 font-bold uppercase">Saldo</p>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                                    <Package className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                                    <p className="text-lg font-black italic">{merchant.total_products}</p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase">Produtos</p>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                                    <ShoppingBag className="w-4 h-4 text-green-400 mx-auto mb-1" />
                                                    <p className="text-lg font-black italic">{merchant.total_orders}</p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase">Pedidos</p>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                                    <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
                                                    <p className="text-sm font-black italic">
                                                        R$ {parseFloat(merchant.total_sales || 0).toFixed(0)}
                                                    </p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase">Vendas</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Total Recebido</span>
                                                    <p className="font-bold text-green-400 mt-0.5">
                                                        R$ {parseFloat(merchant.total_received || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <span className="text-white/30 font-bold uppercase tracking-wider">Total Sacado</span>
                                                    <p className="font-bold text-yellow-400 mt-0.5">
                                                        R$ {parseFloat(merchant.total_withdrawn || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                {/* View store */}
                                                {merchant.store_username && (
                                                    <Link
                                                        href={`/store/${merchant.store_username}`}
                                                        target="_blank"
                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Ver loja
                                                    </Link>
                                                )}

                                                {/* Block / unblock */}
                                                <button
                                                    disabled={toggling === merchant.id}
                                                    onClick={() => toggleBlock(merchant)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 ${
                                                        merchant.is_blocked
                                                            ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                                            : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                                    }`}
                                                >
                                                    {toggling === merchant.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : merchant.is_blocked ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Ban className="w-3.5 h-3.5" />
                                                    )}
                                                    {merchant.is_blocked ? "Desbloquear" : "Bloquear"}
                                                </button>
                                            </div>

                                            <p className="text-[9px] text-white/20 text-center">
                                                Desde {new Date(merchant.created_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {merchants.length === 0 && (
                            <p className="text-center text-white/20 text-sm py-12">Nenhum lojista encontrado</p>
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20">Anterior</button>
                        <span className="text-[10px] font-bold text-white/40">{page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold disabled:opacity-20">Próximo</button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
