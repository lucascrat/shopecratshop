"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Loader2, Lock, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CardPaymentModalProps {
    open: boolean;
    onClose: () => void;
    orderId: string;
    amount: number;
    installments: number;
    customerName: string;
    customerEmail: string;
    onSuccess: () => void;
}

// Detect card brand from BIN. Covers the brands Efi supports; `unsupported` triggers UI error.
function detectBrand(number: string): string {
    const n = number.replace(/\D/g, "");
    if (/^4/.test(n)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
    if (/^3[47]/.test(n)) return "amex";
    if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|6504|6505|6506|6507|6516|6550)/.test(n)) return "elo";
    if (/^(38|60)/.test(n)) return "hipercard";
    return "";
}

interface EfiCheckout {
    debug: (on: boolean) => EfiCheckout;
    getPaymentToken: (
        card: {
            brand: string;
            number: string;
            cvv: string;
            expiration_month: string;
            expiration_year: string;
            reuse: boolean;
        },
        cb: (err: unknown, res: { data?: { payment_token?: string; card_mask?: string } } | unknown) => void
    ) => void;
}

declare global {
    interface Window {
        $gn?: {
            ready?: (cb: (checkout: EfiCheckout) => void) => void;
            checkout?: EfiCheckout;
            validForm?: boolean;
            processed?: boolean;
            done?: Record<string, unknown>;
        };
    }
}

async function loadEfiSdk(payeeCode: string, sandbox: boolean): Promise<EfiCheckout> {
    if (typeof window === "undefined") throw new Error("No window");

    // If already loaded, reuse it
    if (window.$gn?.checkout) return window.$gn.checkout;

    // Initialize global config object Efi's script expects
    window.$gn = window.$gn || { validForm: true, processed: false, done: {} };
    const v = Math.floor(Math.random() * 1e6);
    const src = sandbox
        ? `https://sandbox.gerencianet.com.br/v1/cdn/${payeeCode}/${v}`
        : `https://api.efipay.com.br/v1/cdn/${payeeCode}/${v}`;

    await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[data-efi-sdk="1"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Falha ao carregar SDK Efi")), { once: true });
            return;
        }
        const s = document.createElement("script");
        s.async = true;
        s.src = src;
        s.dataset.efiSdk = "1";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Falha ao carregar SDK Efi"));
        document.head.appendChild(s);
    });

    return new Promise<EfiCheckout>((resolve, reject) => {
        const t0 = Date.now();
        const tick = () => {
            if (window.$gn?.ready) {
                window.$gn.ready((checkout) => resolve(checkout));
            } else if (Date.now() - t0 > 10000) {
                reject(new Error("Timeout inicializando SDK Efi"));
            } else {
                setTimeout(tick, 100);
            }
        };
        tick();
    });
}

export default function CardPaymentModal({
    open,
    onClose,
    orderId,
    amount,
    installments,
    customerName,
    customerEmail,
    onSuccess,
}: CardPaymentModalProps) {
    const [form, setForm] = useState({
        number: "",
        holder: "",
        expMonth: "",
        expYear: "",
        cvv: "",
        cpf: "",
        birth: "",
        phone: "",
        zipcode: "",
        street: "",
        streetNumber: "",
        neighborhood: "",
        city: "",
        state: "",
    });
    const [processing, setProcessing] = useState(false);
    const [config, setConfig] = useState<{ payeeCode: string; sandbox: boolean } | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        apiFetch<{ payeeCode: string; sandbox: boolean }>("/api/payments/card/config")
            .then((c) => {
                if (!c.payeeCode) {
                    setConfigError("Pagamento por cartão não configurado. Peça ao administrador para cadastrar o Payee Code da Efi.");
                    return;
                }
                setConfig(c);
            })
            .catch(() => setConfigError("Não foi possível carregar a configuração de cartão."));
    }, [open]);

    if (!open) return null;

    const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setProcessing(true);
        try {
            const brand = detectBrand(form.number);
            if (!brand) throw new Error("Bandeira de cartão não reconhecida.");

            const checkout = await loadEfiSdk(config.payeeCode, config.sandbox);

            const token: string = await new Promise((resolve, reject) => {
                checkout.getPaymentToken(
                    {
                        brand,
                        number: form.number.replace(/\s/g, ""),
                        cvv: form.cvv,
                        expiration_month: form.expMonth.padStart(2, "0"),
                        expiration_year: form.expYear.length === 2 ? `20${form.expYear}` : form.expYear,
                        reuse: false,
                    },
                    (err, res) => {
                        if (err) {
                            reject(new Error((err as { error_description?: string })?.error_description || "Cartão inválido"));
                            return;
                        }
                        const pt = (res as { data?: { payment_token?: string } })?.data?.payment_token;
                        if (!pt) {
                            reject(new Error("Token de cartão não retornado"));
                            return;
                        }
                        resolve(pt);
                    }
                );
            });

            const result = await apiFetch<{ paid: boolean; status: string }>(
                "/api/payments/card",
                {
                    method: "POST",
                    body: JSON.stringify({
                        orderId,
                        installments,
                        paymentToken: token,
                        customer: {
                            name: customerName || form.holder,
                            cpf: form.cpf,
                            email: customerEmail,
                            phone: form.phone,
                            birth: form.birth,
                        },
                        billingAddress: {
                            street: form.street,
                            number: form.streetNumber,
                            neighborhood: form.neighborhood,
                            city: form.city,
                            state: form.state.toUpperCase(),
                            zipcode: form.zipcode,
                        },
                    }),
                }
            );

            if (result.paid) {
                toast.success("Pagamento aprovado!");
                onSuccess();
            } else {
                toast(`Pagamento em análise (${result.status}). Acompanhe em Meus Pedidos.`);
                onSuccess();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro ao processar pagamento.";
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl h-11 px-3 focus:ring-2 focus:ring-primary/50 outline-none text-sm";

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-[#1a242e] rounded-t-3xl sm:rounded-3xl w-full max-w-[430px] max-h-[92vh] overflow-y-auto border border-white/10">
                <div className="sticky top-0 bg-[#1a242e] flex items-center justify-between p-5 border-b border-white/5 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase">Pagamento com Cartão</h3>
                            <p className="text-[9px] text-white/30 font-bold">
                                {installments}x • R$ {amount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/30 hover:text-white" disabled={processing}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {configError && (
                    <div className="m-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-300 font-bold">{configError}</p>
                    </div>
                )}

                {!configError && (
                    <form onSubmit={onSubmit} className="p-5 space-y-3">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">Número do Cartão</label>
                            <input
                                className={inputClass}
                                placeholder="0000 0000 0000 0000"
                                value={form.number}
                                onChange={(e) => update("number", e.target.value)}
                                inputMode="numeric"
                                autoComplete="cc-number"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">Nome do Titular</label>
                            <input
                                className={inputClass}
                                placeholder="Como impresso no cartão"
                                value={form.holder}
                                onChange={(e) => update("holder", e.target.value)}
                                autoComplete="cc-name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Mês</label>
                                <input className={inputClass} placeholder="MM" value={form.expMonth} onChange={(e) => update("expMonth", e.target.value)} maxLength={2} inputMode="numeric" autoComplete="cc-exp-month" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Ano</label>
                                <input className={inputClass} placeholder="AAAA" value={form.expYear} onChange={(e) => update("expYear", e.target.value)} maxLength={4} inputMode="numeric" autoComplete="cc-exp-year" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">CVV</label>
                                <input className={inputClass} placeholder="123" value={form.cvv} onChange={(e) => update("cvv", e.target.value)} maxLength={4} inputMode="numeric" autoComplete="cc-csc" required />
                            </div>
                        </div>

                        <div className="h-px bg-white/5 my-2" />

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">CPF</label>
                                <input className={inputClass} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => update("cpf", e.target.value)} inputMode="numeric" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Nascimento</label>
                                <input type="date" className={inputClass} value={form.birth} onChange={(e) => update("birth", e.target.value)} required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Telefone</label>
                            <input className={inputClass} placeholder="(11) 91234-5678" value={form.phone} onChange={(e) => update("phone", e.target.value)} inputMode="tel" required />
                        </div>

                        <div className="h-px bg-white/5 my-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Endereço de Cobrança</p>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <input className={inputClass} placeholder="CEP" value={form.zipcode} onChange={(e) => update("zipcode", e.target.value)} required />
                            </div>
                            <div className="col-span-2">
                                <input className={inputClass} placeholder="Rua" value={form.street} onChange={(e) => update("street", e.target.value)} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <input className={inputClass} placeholder="Nº" value={form.streetNumber} onChange={(e) => update("streetNumber", e.target.value)} required />
                            <input className={`${inputClass} col-span-2`} placeholder="Bairro" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <input className={`${inputClass} col-span-2`} placeholder="Cidade" value={form.city} onChange={(e) => update("city", e.target.value)} required />
                            <input className={inputClass} placeholder="UF" value={form.state} onChange={(e) => update("state", e.target.value)} maxLength={2} required />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-95 transition-all uppercase tracking-widest text-xs"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processando…
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Pagar R$ {amount.toFixed(2)}
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
