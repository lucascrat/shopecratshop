"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Loader2, AtSign, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface UsernameEditorProps {
    currentUsername: string;
    currentId: string;                          // store id or profile id
    type: "store" | "profile";
    onSave: (newUsername: string) => Promise<void>;
    onCancel?: () => void;
    label?: string;
}

export default function UsernameEditor({
    currentUsername,
    currentId,
    type,
    onSave,
    onCancel,
    label,
}: UsernameEditorProps) {
    const [value, setValue]         = useState(currentUsername);
    const [checking, setChecking]   = useState(false);
    const [saving, setSaving]       = useState(false);
    const [status, setStatus]       = useState<"idle" | "available" | "taken" | "invalid">("idle");
    const [message, setMessage]     = useState("");
    const debounceRef               = useRef<NodeJS.Timeout | null>(null);
    const unchanged                 = value.toLowerCase().trim() === currentUsername.toLowerCase().trim();

    useEffect(() => {
        const u = value.toLowerCase().trim();
        if (unchanged || !u) { setStatus("idle"); setMessage(""); return; }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setChecking(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await apiFetch<{ available: boolean; error?: string }>(
                    `/api/username/check?username=${encodeURIComponent(u)}&type=${type}&currentId=${currentId}`
                );
                if (res.error) {
                    setStatus("invalid");
                    setMessage(res.error);
                } else if (res.available) {
                    setStatus("available");
                    setMessage("@ disponível!");
                } else {
                    setStatus("taken");
                    setMessage("Este @ já está em uso");
                }
            } catch {
                setStatus("invalid");
                setMessage("Erro ao verificar");
            } finally {
                setChecking(false);
            }
        }, 500);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [value, currentId, type, unchanged]);

    const handleSave = async () => {
        if (unchanged || status !== "available") return;
        setSaving(true);
        try {
            await onSave(value.toLowerCase().trim());
        } finally {
            setSaving(false);
        }
    };

    const statusColor = {
        idle:      "border-white/10 focus:border-white/30",
        available: "border-green-500/60 focus:border-green-500",
        taken:     "border-red-500/60 focus:border-red-500",
        invalid:   "border-yellow-500/60 focus:border-yellow-500",
    }[status];

    return (
        <div>
            {label && (
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{label}</p>
            )}

            <div className={`flex items-center bg-white/5 border rounded-xl overflow-hidden transition-colors ${statusColor}`}>
                {/* @ prefix */}
                <div className="pl-3 pr-1 shrink-0">
                    <AtSign className="w-4 h-4 text-white/30" />
                </div>

                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={30}
                    placeholder="meu_username"
                    className="flex-1 bg-transparent py-3 pr-2 text-sm text-white placeholder:text-white/20 outline-none"
                />

                {/* Status indicator */}
                <div className="pr-3 shrink-0">
                    {checking && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
                    {!checking && status === "available" && !unchanged && (
                        <Check className="w-4 h-4 text-green-400" />
                    )}
                    {!checking && status === "taken" && (
                        <X className="w-4 h-4 text-red-400" />
                    )}
                    {!checking && status === "invalid" && (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                </div>
            </div>

            {/* Message */}
            {message && !unchanged && (
                <p className={`text-[11px] mt-1.5 font-semibold ${
                    status === "available" ? "text-green-400" :
                    status === "taken"     ? "text-red-400"   :
                    "text-yellow-400"
                }`}>
                    {message}
                </p>
            )}

            <p className="text-[10px] text-white/25 mt-1">
                Somente letras minúsculas, números e _ · 3 a 30 caracteres
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={handleSave}
                    disabled={saving || unchanged || status !== "available"}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#f46a25] disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? "Salvando..." : "Salvar @"}
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-4 py-3 bg-white/5 border border-white/10 text-white/50 font-black rounded-xl text-xs uppercase tracking-wider"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    );
}
