"use client";

import { ShoppingBag, Eye, EyeOff, User, Store, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"user" | "merchant">("user");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { loginWithToken } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, loginType }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao fazer login");
            }

            await loginWithToken(data.token);

            // Redirect based on role
            const role = data.profile?.role || loginType;
            if (role === 'admin') {
                router.push("/admin");
            } else if (role === 'merchant' || loginType === 'merchant') {
                router.push("/merchant/dashboard");
            } else {
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message || "Erro ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[480px] bg-white dark:bg-[#1a242e] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500">
                {/* Branding */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-primary/30 transform -rotate-6">
                        <ShoppingBag className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-[#111418] dark:text-white text-4xl font-black tracking-tight mb-2 uppercase">shopcrat</h1>
                    <p className="text-[#617589] dark:text-[#a0b0c0] text-sm font-bold uppercase tracking-widest text-[10px]">Descubra. Assista. Compre.</p>
                </div>

                {/* Login Type Toggle */}
                <div className="px-8 mb-6">
                    <div className="flex bg-[#f0f2f4] dark:bg-[#101922] p-1.5 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setLoginType("user")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginType === 'user' ? 'bg-white dark:bg-background-dark text-primary shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <User className="w-4 h-4" />
                            Sou Cliente
                        </button>
                        <button
                            onClick={() => setLoginType("merchant")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginType === 'merchant' ? 'bg-white dark:bg-background-dark text-primary shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Store className="w-4 h-4" />
                            Sou Vendedor
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="px-8 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold ml-1 text-white/40 tracking-widest uppercase text-[10px]">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={loginType === 'user' ? "Digite seu e-mail" : "Digite seu e-mail da loja"}
                            className="w-full h-14 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none px-6 text-base transition-all placeholder:text-white/10"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold ml-1 text-white/40 tracking-widest uppercase text-[10px]">Senha</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Digite sua senha"
                                className="w-full h-14 rounded-2xl bg-[#f0f2f4] dark:bg-[#101922] border border-white/5 focus:ring-2 focus:ring-primary/50 outline-none px-6 text-base transition-all placeholder:text-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end p-1">
                        <Link href="/forgot-password" title="Esqueceu?" className="text-primary text-xs font-black hover:underline tracking-tight uppercase tracking-widest">Esqueceu a senha?</Link>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full h-15 bg-primary hover:bg-primary/90 text-white text-lg font-black rounded-2xl shadow-xl shadow-primary/20 transform active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm mt-4 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loginType === 'user' ? 'Entrar Agora' : 'Acessar Loja'}
                    </button>
                </form>

                {/* Divider */}
                <div className="px-8 py-8 flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="text-white/10 text-[9px] font-black uppercase tracking-[0.3em]">Conectar com</span>
                    <div className="flex-1 h-px bg-white/5"></div>
                </div>

                {/* Socials */}
                <div className="px-8 pb-8 flex gap-4">
                    <button className="flex-1 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/5 group">
                        <GoogleIcon className="w-6 h-6 group-hover:scale-110 transition-transform opacity-60" />
                    </button>
                    <button className="flex-1 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/5 group">
                        <AppleIcon className="w-6 h-6 group-hover:scale-110 transition-transform opacity-60 fill-white" />
                    </button>
                </div>

                {/* Footer */}
                <div className="p-8 bg-white/5 text-center mt-auto border-t border-white/5">
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                        Não tem uma conta?
                        <Link href="/register" className="text-primary font-black hover:underline ml-2">Cadastre-se</Link>
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-white/10 text-[9px] font-black uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
                        Ambiente Seguro
                    </div>
                </div>
            </div>
        </main>
    );
}

function GoogleIcon(props: any) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
        </svg>
    );
}

function AppleIcon(props: any) {
    return (
        <svg {...props} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702z" />
        </svg>
    );
}
