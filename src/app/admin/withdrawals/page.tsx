"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ArrowDownToLine,
    Zap,
    Hand,
    Copy,
    AlertTriangle,
} from "lucide-react";

const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "processing", label: "Processando" },
    { value: "completed", label: "Concluídos" },
    { value: "cancelled", label: "Rejeitados" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pendente", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    processing: { label: "Processando", color: "text-blue-400", bg: "bg-blue-400/10" },
    completed: { label: "Concluído", color: "text-green-400", bg: "bg-green-400/10" },
    failed: { label: "Falhou", color: "text-red-400", bg: "bg-red-400/10" },
    cancelled: { label: "Rejeitado", color: "text-red-400", bg: "bg-red-400/10" },
};

export default function AdminWithdrawals() {
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState("");

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(`/api/admin/withdrawals?status=${filter}&page=${page}`);
            setWithdrawals(res.withdrawals);
            setTotalPages(res.totalPages);
            setTotal(res.total);
            setStats(res.stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWithdrawals(); }, [filter, page]);

    const processWithdrawal = async (id: string, action: "approve" | "reject") => {
        setProcessing(id);
        try {
            await apiFetch("/api/admin/withdrawals", {
                method: "PATCH",
                body: JSON.stringify({ withdrawalId: id, action, adminNotes }),
            });
            toast.success(action === "approve" ? "Saque aprovado!" : "Saque rejeitado!");
            setAdminNotes("");
            setExpandedId(null);
            fetchWithdrawals();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setProcessing(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado!");
    };

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Saques</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        Gerenciar solicitações de saque
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4">
                            <Clock className="w-4 h-4 text-yellow-400 mb-1" />
                            <p className="text-lg font-black italic text-yellow-400">{stats.pending_count}</p>
                            <p className="text-[8px] font-bold text-yellow-400/60 uppercase tracking-wider">
                                R$ {parseFloat(stats.pending_amount).toFixed(2)} pendente
                            </p>
                        </div>
                        <div className="bg-green-400/10 border border-green-400/20 rounded-2xl p-4">
                            <CheckCircle2 className="w-4 h-4 text-green-400 mb-1" />
                            <p className="text-lg font-black italic text-green-400">{stats.completed_count}</p>
                            <p className="text-[8px] font-bold text-green-400/60 uppercase tracking-wider">
                                R$ {parseFloat(stats.completed_amount).toFixed(2)} pago
                            </p>
                        </div>
                    </div>
                )}

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

                {/* Withdrawals List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {withdrawals.map((wr) => {
                            const sc = statusConfig[wr.status] || statusConfig.pending;
                            const isExpanded = expandedId === wr.id;
                            const isAutomatic = wr.method === "automatic";

                            return (
                                <div key={wr.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : wr.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                                <Image
                                                    src={wr.merchant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${wr.merchant_username}`}
                                                    alt={wr.merchant_name || ""}
                                                    width={40}
                                                    height={40}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold truncate">{wr.merchant_name}</p>
                                                    {isAutomatic ? (
                                                        <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                                    ) : (
                                                        <Hand className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${sc.bg} ${sc.color}`}>
                                                        {sc.label}
                                                    </span>
                                                    <span className="text-[9px] text-white/20">
                                                        {new Date(wr.created_at).toLocaleString("pt-BR")}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-primary font-black text-lg italic">
                                                    R$ {parseFloat(wr.amount).toFixed(2)}
                                                </p>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-4">
                                            {/* PIX Key */}
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Chave PIX</p>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold">{wr.pix_key}</p>
                                                        <p className="text-[9px] text-white/30 uppercase">{wr.pix_key_type}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(wr.pix_key)}
                                                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
                                                    >
                                                        <Copy className="w-4 h-4 text-white/40" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <div>
                                                    <span className="text-white/30 font-bold">Método</span>
                                                    <p className="font-bold mt-0.5 flex items-center gap-1">
                                                        {isAutomatic ? (
                                                            <><Zap className="w-3 h-3 text-yellow-400" /> Automático (API Efi)</>
                                                        ) : (
                                                            <><Hand className="w-3 h-3 text-blue-400" /> Manual (24h)</>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold">Loja</span>
                                                    <p className="font-bold mt-0.5">{wr.store_name || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold">Saldo Atual</span>
                                                    <p className="font-bold mt-0.5 text-primary">
                                                        R$ {parseFloat(wr.wallet_balance || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 font-bold">ID Saque</span>
                                                    <p className="font-bold mt-0.5 font-mono text-white/40">
                                                        #{wr.id.substring(0, 8)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Admin Notes */}
                                            {wr.admin_notes && (
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Nota do Admin</p>
                                                    <p className="text-xs text-white/60">{wr.admin_notes}</p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {(wr.status === "pending" || wr.status === "processing") && (
                                                <div className="space-y-3">
                                                    <textarea
                                                        placeholder="Nota do admin (opcional)..."
                                                        value={adminNotes}
                                                        onChange={(e) => setAdminNotes(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs placeholder:text-white/20 focus:outline-none focus:border-primary/50 resize-none h-16"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            disabled={processing === wr.id}
                                                            onClick={() => processWithdrawal(wr.id, "approve")}
                                                            className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-30"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {processing === wr.id ? "..." : "Aprovar"}
                                                        </button>
                                                        <button
                                                            disabled={processing === wr.id}
                                                            onClick={() => processWithdrawal(wr.id, "reject")}
                                                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-30"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            {processing === wr.id ? "..." : "Rejeitar"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {withdrawals.length === 0 && (
                            <p className="text-center text-white/20 text-sm py-12">Nenhuma solicitação encontrada</p>
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
