"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Loader2,
    Save,
    Percent,
    CreditCard,
    Wallet,
    Zap,
    Clock,
    Settings,
    ChevronDown,
    Key,
    AlertTriangle,
    Banknote,
} from "lucide-react";

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [cardFees, setCardFees] = useState<Record<string, string>>({});
    const [showCardFees, setShowCardFees] = useState(false);
    const [showEfi, setShowEfi] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<any>("/api/admin/settings");
                setSettings(res.settings);
                setCardFees(res.cardFees);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const updateSetting = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateCardFee = (installment: string, value: string) => {
        setCardFees(prev => ({ ...prev, [installment]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Merge card fees into settings
            const allSettings: Record<string, string> = { ...settings };
            for (const [key, value] of Object.entries(cardFees)) {
                allSettings[`card_fee_${key}`] = value;
            }

            await apiFetch("/api/admin/settings", {
                method: "PUT",
                body: JSON.stringify({ settings: allSettings }),
            });
            toast.success("Configurações salvas!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="px-4 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Configurações</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                            Taxas, API Efi e regras do sistema
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar
                    </button>
                </div>

                {/* Maintenance Mode */}
                <section className={`border rounded-2xl p-5 space-y-3 transition-all ${
                    settings.maintenance_mode === "true"
                        ? "bg-yellow-400/10 border-yellow-400/30"
                        : "bg-white/5 border-white/5"
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                settings.maintenance_mode === "true" ? "bg-yellow-400/20" : "bg-white/10"
                            }`}>
                                <AlertTriangle className={`w-5 h-5 ${settings.maintenance_mode === "true" ? "text-yellow-400" : "text-white/30"}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight">Modo Manutenção</h3>
                                <p className="text-[9px] text-white/30 font-bold">
                                    {settings.maintenance_mode === "true"
                                        ? "App inacessível para usuários"
                                        : "App funcionando normalmente"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateSetting("maintenance_mode", settings.maintenance_mode === "true" ? "false" : "true")}
                            className={`w-12 h-6 rounded-full transition-all relative ${
                                settings.maintenance_mode === "true" ? "bg-yellow-400" : "bg-white/10"
                            }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                                settings.maintenance_mode === "true" ? "translate-x-6" : "translate-x-0.5"
                            }`} />
                        </button>
                    </div>
                    {settings.maintenance_mode === "true" && (
                        <p className="text-[9px] text-yellow-400/70 text-center font-bold bg-yellow-400/10 rounded-xl p-2">
                            ⚠ O app está em manutenção. Lembre-se de salvar e desativar após concluir.
                        </p>
                    )}
                </section>

                {/* Platform Fee */}
                <section className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Percent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Taxa da Plataforma</h3>
                            <p className="text-[9px] text-white/30 font-bold">Percentual sobre cada venda</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={settings.platform_fee_percent || "3.00"}
                            onChange={(e) => updateSetting("platform_fee_percent", e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-center focus:outline-none focus:border-primary/50"
                        />
                        <span className="text-xl font-black text-white/20">%</span>
                    </div>
                    <p className="text-[9px] text-white/20 bg-white/5 rounded-lg p-2 text-center">
                        Ex: Venda de R$ 100 → Plataforma recebe R$ {(100 * parseFloat(settings.platform_fee_percent || "3") / 100).toFixed(2)}, Lojista recebe R$ {(100 - 100 * parseFloat(settings.platform_fee_percent || "3") / 100).toFixed(2)}
                    </p>
                </section>

                {/* Coin Rewards */}
                <section className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                            <span className="text-lg">🪙</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Recompensas TikTok</h3>
                            <p className="text-[9px] text-white/30 font-bold">Ganho de moedas por tempo assistido</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                Quantidade de Moedas por Vídeo
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.coin_reward_amount || "5"}
                                onChange={(e) => updateSetting("coin_reward_amount", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50 text-yellow-400"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                Segundos exigidos para ganhar
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={settings.coin_reward_seconds || "5"}
                                onChange={(e) => updateSetting("coin_reward_seconds", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                </section>

                {/* Withdrawal Rules */}
                <section className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Regras de Saque</h3>
                            <p className="text-[9px] text-white/30 font-bold">Valores e prazos para saques</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                Valor mínimo para saque (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.min_withdrawal || "1.00"}
                                onChange={(e) => updateSetting("min_withdrawal", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                <Banknote className="w-3 h-3 inline mr-1 text-green-400" />
                                Taxa fixa por saque PIX (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.withdrawal_fee_fixed || "0.00"}
                                onChange={(e) => updateSetting("withdrawal_fee_fixed", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50"
                            />
                            <p className="text-[8px] text-white/20 mt-1">Valor descontado do saque do lojista. Ex: Saque de R$ 50 com taxa R$ 1 → lojista recebe R$ 49</p>
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                <Zap className="w-3 h-3 inline mr-1 text-yellow-400" />
                                Mínimo para saque automático (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.auto_withdrawal_min || "100.00"}
                                onChange={(e) => updateSetting("auto_withdrawal_min", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50"
                            />
                            <p className="text-[8px] text-white/20 mt-1">Abaixo desse valor, saque será manual (admin processa em até 24h)</p>
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">
                                <Clock className="w-3 h-3 inline mr-1 text-blue-400" />
                                Prazo máximo saque manual (horas)
                            </label>
                            <input
                                type="number"
                                value={settings.manual_withdrawal_deadline_hours || "24"}
                                onChange={(e) => updateSetting("manual_withdrawal_deadline_hours", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* Fee Preview */}
                    <div className="bg-white/5 rounded-xl p-3 space-y-1">
                        <p className="text-[9px] text-white/20 text-center">
                            📊 Exemplo: Venda de R$ 100 → Taxa plataforma {settings.platform_fee_percent || "3"}% = R$ {(100 * parseFloat(settings.platform_fee_percent || "3") / 100).toFixed(2)}
                        </p>
                        <p className="text-[9px] text-white/20 text-center">
                            💸 Saque de R$ {(100 - 100 * parseFloat(settings.platform_fee_percent || "3") / 100).toFixed(2)} → Taxa saque R$ {parseFloat(settings.withdrawal_fee_fixed || "0").toFixed(2)} → Recebe R$ {(100 - 100 * parseFloat(settings.platform_fee_percent || "3") / 100 - parseFloat(settings.withdrawal_fee_fixed || "0")).toFixed(2)}
                        </p>
                    </div>
                </section>

                {/* Card Fees */}
                <section className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowCardFees(!showCardFees)}
                        className="w-full p-5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-400/20 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-black uppercase tracking-tight">Taxas de Cartão</h3>
                                <p className="text-[9px] text-white/30 font-bold">Taxas por número de parcelas (1x a 12x)</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-white/20 transition-transform ${showCardFees ? "rotate-180" : ""}`} />
                    </button>

                    {showCardFees && (
                        <div className="border-t border-white/5 p-5 space-y-2">
                            <p className="text-[9px] text-white/20 mb-3">
                                Taxa cobrada sobre o valor da venda no cartão de crédito
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                                    const key = `${n}x`;
                                    return (
                                        <div key={key} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                                            <span className="text-[10px] font-black text-white/40 w-6">{key}</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={cardFees[key] || "0"}
                                                onChange={(e) => updateCardFee(key, e.target.value)}
                                                className="flex-1 bg-transparent text-sm font-bold focus:outline-none text-right"
                                            />
                                            <span className="text-[10px] text-white/20 font-bold">%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Efi Bank API */}
                <section className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowEfi(!showEfi)}
                        className="w-full p-5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-green-400/20 flex items-center justify-center">
                                <Key className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-black uppercase tracking-tight">API Efi Bank</h3>
                                <p className="text-[9px] text-white/30 font-bold">Credenciais para pagamentos PIX e cartão</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-white/20 transition-transform ${showEfi ? "rotate-180" : ""}`} />
                    </button>

                    {showEfi && (
                        <div className="border-t border-white/5 p-5 space-y-3">
                            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${settings.efi_sandbox === "true" ? "text-yellow-400" : "text-green-400"}`}>
                                    {settings.efi_sandbox === "true" ? "Modo Sandbox (Testes)" : "Modo Produção"}
                                </span>
                                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                                    <span className="text-[9px] text-white/30">Sandbox</span>
                                    <button
                                        onClick={() => updateSetting("efi_sandbox", settings.efi_sandbox === "true" ? "false" : "true")}
                                        className={`w-10 h-5 rounded-full transition-all ${
                                            settings.efi_sandbox === "true" ? "bg-yellow-400" : "bg-green-400"
                                        }`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                                            settings.efi_sandbox === "true" ? "translate-x-0" : "translate-x-5"
                                        }`} />
                                    </button>
                                </label>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">Client ID</label>
                                <input
                                    type="text"
                                    value={settings.efi_client_id || ""}
                                    onChange={(e) => updateSetting("efi_client_id", e.target.value)}
                                    placeholder="Client_Id..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary/50 placeholder:text-white/10"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">Client Secret</label>
                                <input
                                    type="password"
                                    value={settings.efi_client_secret || ""}
                                    onChange={(e) => updateSetting("efi_client_secret", e.target.value)}
                                    placeholder="Client_Secret..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary/50 placeholder:text-white/10"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 block mb-1.5">Chave PIX Recebedora</label>
                                <input
                                    type="text"
                                    value={settings.efi_pix_key || ""}
                                    onChange={(e) => updateSetting("efi_pix_key", e.target.value)}
                                    placeholder="sua-chave-pix@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary/50 placeholder:text-white/10"
                                />
                            </div>
                            <p className="text-[8px] text-white/15 text-center mt-2">
                                As credenciais da API Efi serão usadas para processar pagamentos PIX, cartão e saques automáticos
                            </p>
                        </div>
                    )}
                </section>

                {/* Save Button (bottom) */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 py-4 rounded-2xl text-sm font-black uppercase tracking-wider disabled:opacity-50 transition-all shadow-xl shadow-primary/20"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                </button>
            </div>
        </AdminLayout>
    );
}
