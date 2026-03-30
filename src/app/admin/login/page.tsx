"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Erro ao autenticar.");
                return;
            }

            // Store token in both keys so apiFetch and admin auth both work
            localStorage.setItem("admin_token", data.token);
            localStorage.setItem("token", data.token);

            router.push("/admin");
        } catch {
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
            <div className="w-full max-w-[430px] mx-auto">
                {/* Shield icon with pulsing glow ring */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative flex items-center justify-center mb-6">
                        {/* Outer pulsing ring */}
                        <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/20 animate-ping opacity-40" />
                        {/* Middle ring */}
                        <span className="absolute inline-flex h-16 w-16 rounded-full bg-primary/15" />
                        {/* Icon container */}
                        <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7 text-primary" strokeWidth={1.5} />
                        </div>
                    </div>

                    <h1 className="text-xs font-black uppercase tracking-[0.3em] text-white/80 mb-1.5">
                        Acesso Restrito
                    </h1>
                    <p className="text-[10px] text-white/20 tracking-widest uppercase">
                        Área protegida • Shopcrat
                    </p>
                </div>

                {/* Form card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white/3 border border-white/8 rounded-3xl p-6 space-y-4"
                >
                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                            Usuário
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                            placeholder="Digite seu usuário"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                            Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.25em] py-3.5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verificando...</span>
                            </>
                        ) : (
                            "Entrar"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
