"use client";

import { useAuth } from "@/components/AuthProvider";
import { UserPlus, ShoppingBag, MessageCircle, Heart, LogIn } from "lucide-react";
import Link from "next/link";

interface AuthGateProps {
    children: React.ReactNode;
    /** Mensagem personalizada mostrada ao usuário não autenticado */
    message?: string;
    /** Ícone exibido no topo: "shop" | "message" | "heart" | "default" */
    icon?: "shop" | "message" | "heart" | "default";
}

const ICONS = {
    shop: ShoppingBag,
    message: MessageCircle,
    heart: Heart,
    default: UserPlus,
};

/**
 * Wrapper que protege páginas que requerem login.
 * Usuários não logados veem uma tela convidando a criar conta.
 * Usuários logados veem o conteúdo normalmente.
 */
export default function AuthGate({ children, message, icon = "default" }: AuthGateProps) {
    const { user, loading } = useAuth();

    // Enquanto verifica o token, mostra loading sutil
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    // Usuário logado — renderiza o conteúdo
    if (user) {
        return <>{children}</>;
    }

    // Usuário NÃO logado — tela de convite
    const Icon = ICONS[icon];
    const defaultMessage = "Crie sua conta para acessar todas as funcionalidades do Shopcrat";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white px-8">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
                {/* Icon */}
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
                    <Icon className="w-10 h-10 text-primary" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black mb-3">
                    Entre no Shopcrat
                </h1>

                {/* Description */}
                <p className="text-white/40 text-sm leading-relaxed mb-10">
                    {message || defaultMessage}
                </p>

                {/* CTA Buttons */}
                <div className="w-full space-y-3">
                    <Link
                        href="/register"
                        className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        <UserPlus className="w-5 h-5" />
                        Criar Conta Grátis
                    </Link>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                    >
                        <LogIn className="w-5 h-5" />
                        Já tenho conta
                    </Link>
                </div>

                {/* Back to feed */}
                <Link
                    href="/"
                    className="mt-8 text-white/30 text-xs hover:text-white/50 transition-colors"
                >
                    Voltar para o feed
                </Link>
            </div>
        </div>
    );
}
