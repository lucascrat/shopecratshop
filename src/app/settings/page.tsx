"use client";

import { useState, useRef } from "react";
import {
    ChevronLeft, User, Bell, Shield, Wallet, CircleHelp, Info,
    Languages, Moon, Trash2, LogOut, ChevronRight, AtSign,
    Camera, Loader2, Check, Pencil
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import UsernameEditor from "@/components/UsernameEditor";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
    const { user, profile, signOut, refreshProfile } = useAuth();

    const [showUsernameEditor, setShowUsernameEditor] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const form = new FormData();
            form.append("action", "upload-file");
            form.append("file", file);
            form.append("folder", "avatars");

            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: form,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro no upload");

            await apiFetch("/api/profile/update", {
                method: "PATCH",
                body: JSON.stringify({ avatar_url: data.url }),
            });
            if (refreshProfile) await refreshProfile();
            toast.success("Foto de perfil atualizada!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao atualizar foto");
        } finally {
            setUploadingAvatar(false);
            // Reset input so the same file can be selected again
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    }

    async function handleSaveUsername(newUsername: string) {
        await apiFetch("/api/profile/update", {
            method: "PATCH",
            body: JSON.stringify({ username: newUsername }),
        });
        if (refreshProfile) await refreshProfile();
        setShowUsernameEditor(false);
        toast.success(`@ atualizado para @${newUsername}!`);
    }

    async function handleSaveName() {
        if (!newName.trim()) return;
        setSavingName(true);
        try {
            await apiFetch("/api/profile/update", {
                method: "PATCH",
                body: JSON.stringify({ full_name: newName.trim() }),
            });
            if (refreshProfile) await refreshProfile();
            setEditingName(false);
            toast.success("Nome atualizado!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
        } finally {
            setSavingName(false);
        }
    }

    const SECTIONS = [
        {
            title: "Preferências",
            items: [
                { icon: Bell,      label: "Notificações",    color: "text-orange-400" },
                { icon: Languages, label: "Idioma",          detail: "Português (BR)", color: "text-cyan-400" },
                { icon: Moon,      label: "Aparência",       detail: "Escuro",         color: "text-indigo-400" },
            ]
        },
        {
            title: "Suporte",
            items: [
                { icon: CircleHelp, label: "Central de Ajuda",    color: "text-pink-400" },
                { icon: Info,       label: "Sobre o Shopcrat",    color: "text-white/40" },
            ]
        }
    ];

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-[#0d0d0d] text-white pb-16">

            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <Link href="/profile" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-widest">Configurações</h1>
                <div className="w-10" />
            </header>

            <div className="p-5 space-y-6">

                {/* ── Perfil Card ── */}
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl overflow-hidden">
                    {/* Avatar + info */}
                    <div className="p-5 flex items-center gap-4 border-b border-white/5">
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10">
                                {profile?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/20">
                                        {(profile?.full_name || profile?.username || "?")[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f46a25] rounded-lg flex items-center justify-center border-2 border-[#0d0d0d] hover:bg-[#f46a25]/80 transition-colors disabled:opacity-60"
                            >
                                {uploadingAvatar
                                    ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                                    : <Camera className="w-3 h-3 text-white" />
                                }
                            </button>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-base truncate">{profile?.full_name || "Usuário"}</p>
                            <p className="text-[11px] text-[#f46a25] font-bold">@{profile?.username}</p>
                            <p className="text-[10px] text-white/25 mt-0.5 capitalize">{profile?.role || "cliente"}</p>
                        </div>
                    </div>

                    {/* Nome */}
                    <div className="p-5 border-b border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                                <User className="w-3 h-3" /> Nome completo
                            </p>
                            {!editingName && (
                                <button onClick={() => { setNewName(profile?.full_name || ""); setEditingName(true); }}
                                    className="text-[10px] text-[#f46a25] font-black flex items-center gap-1">
                                    <Pencil className="w-3 h-3" /> Editar
                                </button>
                            )}
                        </div>
                        {editingName ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    maxLength={60}
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 focus:border-[#f46a25]/50 rounded-xl px-3 py-2.5 text-sm outline-none"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveName} disabled={savingName || !newName.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#f46a25] disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider">
                                        {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Salvar
                                    </button>
                                    <button onClick={() => setEditingName(false)}
                                        className="px-4 bg-white/5 border border-white/10 text-white/40 font-black rounded-xl text-xs uppercase tracking-wider">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-white/70">{profile?.full_name || "—"}</p>
                        )}
                    </div>

                    {/* Username */}
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                                <AtSign className="w-3 h-3" /> Seu @
                            </p>
                            {!showUsernameEditor && (
                                <button onClick={() => setShowUsernameEditor(true)}
                                    className="text-[10px] text-[#f46a25] font-black flex items-center gap-1">
                                    <Pencil className="w-3 h-3" /> Alterar
                                </button>
                            )}
                        </div>
                        {!showUsernameEditor ? (
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                                <AtSign className="w-4 h-4 text-white/30 shrink-0" />
                                <span className="text-sm font-bold text-white/70">{profile?.username || "—"}</span>
                            </div>
                        ) : (
                            <UsernameEditor
                                currentUsername={profile?.username || ""}
                                currentId={user?.id || ""}
                                type="profile"
                                onSave={handleSaveUsername}
                                onCancel={() => setShowUsernameEditor(false)}
                            />
                        )}
                        <p className="text-[10px] text-white/20 mt-2">
                            Seu perfil público: shopcrat.shop/u/{profile?.username}
                        </p>
                    </div>
                </div>

                {/* ── Segurança ── */}
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl overflow-hidden">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-1 mb-3">Segurança</p>
                    </div>
                    {[
                        { icon: Wallet, label: "Métodos de Pagamento", color: "text-purple-400" },
                        { icon: Shield, label: "Segurança e Senha",     color: "text-green-400" },
                    ].map((item, i, arr) => (
                        <button key={item.label}
                            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-white/70 group-hover:text-white">{item.label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-[#f46a25]" />
                        </button>
                    ))}
                </div>

                {/* ── Other sections ── */}
                {SECTIONS.map((section) => (
                    <div key={section.title} className="bg-white/[0.04] border border-white/[0.07] rounded-3xl overflow-hidden">
                        <div className="px-4 pt-4 pb-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-1 mb-1">{section.title}</p>
                        </div>
                        {section.items.map((item, i, arr) => (
                            <button key={item.label}
                                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-bold text-white/70 group-hover:text-white block">{item.label}</span>
                                        {item.detail && <span className="text-[10px] text-white/25">{item.detail}</span>}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-[#f46a25]" />
                            </button>
                        ))}
                    </div>
                ))}

                {/* ── Sair ── */}
                <div className="space-y-3 pt-2">
                    <button onClick={() => signOut()}
                        className="w-full py-4 bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 font-black rounded-2xl border border-white/5 hover:border-red-500/20 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs">
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                    </button>
                    <button className="w-full py-3 text-white/10 hover:text-red-500/40 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all">
                        <Trash2 className="w-3 h-3" />
                        Excluir Minha Conta
                    </button>
                </div>
            </div>
        </main>
    );
}
