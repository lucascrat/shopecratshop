"use client";

import { ShoppingBag, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);

    return (
        <main className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#221610' }}>
            <div className="w-full max-w-[480px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500" style={{ backgroundColor: '#1a242e' }}>
                {/* Header */}
                <div className="pt-8 px-8 flex items-center justify-between">
                    <Link href="/login" className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="text-primary w-5 h-5" />
                    </div>
                    <div className="w-10" />
                </div>

                {!sent ? (
                    <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="text-center mb-8">
                            <h1 className="text-white text-3xl font-black tracking-tight mb-2 uppercase">Recuperar Senha</h1>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest leading-relaxed">Insira seu e-mail para receber as instruções de recuperação.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase ml-1">E-mail Cadastrado</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        className="w-full h-14 rounded-2xl bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none pl-12 pr-4 text-base transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setSent(true)}
                                className="w-full h-15 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transform active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
                            >
                                Enviar Link
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase italic">E-mail Enviado!</h2>
                        <p className="text-white/40 text-sm mb-8 leading-relaxed">Confira sua caixa de entrada e siga as instruções para redefinir sua senha.</p>

                        <button
                            onClick={() => setSent(false)}
                            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl border border-white/5 transition-all uppercase tracking-widest text-xs"
                        >
                            Tentar outro e-mail
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="p-8 text-center mt-auto border-t border-white/5 bg-white/5">
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                        Lembrou a senha?
                        <Link href="/login" className="text-primary font-black hover:underline ml-2">Voltar ao Login</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
