"use client";

import { ShoppingBag, User, Store, ArrowLeft, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
    const [regType, setRegType] = useState<"user" | "merchant">("user");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [storeName, setStoreName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { loginWithToken } = useAuth();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, fullName, regType, storeName }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao criar conta");
            }

            await loginWithToken(data.token);
            setSuccess(true);

            // Short delay to show success animation then redirect based on role
            setTimeout(() => {
                const destination = regType === 'merchant' ? "/merchant/dashboard" : "/";
                router.push(destination);
            }, 1500);

        } catch (err: any) {
            setError(err.message || "Erro ao criar conta");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen w-full bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] bg-white dark:bg-[#1a242e] rounded-[32px] shadow-2xl p-12 text-center animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase italic">Bem-vindo!</h2>
                    <p className="text-white/40 text-sm leading-relaxed mb-8">Sua conta foi criada com sucesso. Estamos preparando tudo para você...</p>
                    <div className="flex flex-col gap-3">
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-1/2 animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Entrando no app...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[480px] bg-white dark:bg-[#1a242e] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500">
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

                <div className="pt-6 pb-4 px-8 flex flex-col items-center">
                    <h1 className="text-[#111418] dark:text-white text-3xl font-black tracking-tight mb-1 uppercase italic">Criar Conta</h1>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest text-center">Junte-se à revolução do vídeo shopping</p>
                </div>

                {/* Toggle */}
                <div className="px-8 mb-6">
                    <div className="flex bg-[#f0f2f4] dark:bg-[#101922] p-1.5 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setRegType("user")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${regType === 'user' ? 'bg-white dark:bg-background-dark text-primary shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <User className="w-4 h-4" />
                            Cliente
                        </button>
                        <button
                            type="button"
                            onClick={() => setRegType("merchant")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${regType === 'merchant' ? 'bg-white dark:bg-background-dark text-primary shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Store className="w-4 h-4" />
                            Vendedor
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="px-8 space-y-3 pb-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/20 tracking-[0.2em] uppercase ml-1">Nome Completo</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                            <input
                                required
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Digite seu nome"
                                className="w-full h-12 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none pl-12 pr-4 text-sm transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/20 tracking-[0.2em] uppercase ml-1">E-mail</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemplo@email.com"
                                className="w-full h-12 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none pl-12 pr-4 text-sm transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    {regType === 'merchant' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[9px] font-black text-white/20 tracking-[0.2em] uppercase ml-1">Nome da Loja</label>
                            <div className="relative group">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    required={regType === 'merchant'}
                                    type="text"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    placeholder="Nome da sua marca"
                                    className="w-full h-12 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none pl-12 pr-4 text-sm transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/20 tracking-[0.2em] uppercase ml-1">Senha</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                className="w-full h-12 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none pl-12 pr-4 text-sm transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <p className="text-[10px] text-white/20 text-center mb-4 leading-relaxed px-4">
                            Ao se cadastrar, você concorda com nossos <span className="text-white/40 underline">Termos</span> e <span className="text-white/40 underline">Política de Privacidade</span>.
                        </p>
                        <button
                            disabled={loading}
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            Criar Conta Grátis
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 text-center mt-auto border-t border-white/5 bg-white/5">
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                        Já possui uma conta?
                        <Link href="/login" className="text-primary font-black hover:underline ml-2">Fazer Login</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
