"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] bg-background-dark text-white p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
                    <div className="bg-black/50 overflow-auto p-4 rounded-xl text-left border border-white/10 w-full mb-6">
                        <p className="text-red-400 font-mono text-xs break-words whitespace-pre-wrap">
                            {this.state.error ? String(this.state.error?.stack || this.state.error?.message || this.state.error) : "No error details available"}
                        </p>
                    </div>
                    <p className="text-white/40 text-sm mb-6 max-w-xs">
                        Tente recarregar a página.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
