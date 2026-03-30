"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
    Loader2,
    Search,
    ShoppingBag,
    User,
    ChevronDown,
    TrendingUp,
} from "lucide-react";

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(
                `/api/admin/users?search=${encodeURIComponent(search)}&page=${page}`
            );
            setUsers(res.users);
            setTotalPages(res.totalPages);
            setTotal(res.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [search, page]);

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Usuários</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        {total} cliente(s) cadastrado(s)
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar usuário..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Users List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => {
                            const isExpanded = expandedUser === user.id;
                            return (
                                <div key={user.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                                                <Image
                                                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                                    alt={user.full_name}
                                                    width={44}
                                                    height={44}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold truncate">{user.full_name}</p>
                                                    <User className="w-3 h-3 text-white/20 shrink-0" />
                                                </div>
                                                <p className="text-[10px] text-white/30 font-bold">
                                                    @{user.username}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-primary font-black text-sm italic">
                                                    {user.total_orders}
                                                </p>
                                                <p className="text-[8px] text-white/20 font-bold uppercase">Pedidos</p>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                                    <ShoppingBag className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                                    <p className="text-lg font-black italic">{user.total_orders}</p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase">Pedidos</p>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                                    <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                                                    <p className="text-sm font-black italic text-green-400">
                                                        R$ {parseFloat(user.total_spent || 0).toFixed(2)}
                                                    </p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase">Total Gasto</p>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-white/20 text-center">
                                                Desde {new Date(user.created_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {users.length === 0 && (
                            <p className="text-center text-white/20 text-sm py-12">Nenhum usuário encontrado</p>
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
