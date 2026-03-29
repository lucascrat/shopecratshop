"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                style: {
                    background: "rgba(34, 22, 16, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    backdropFilter: "blur(12px)",
                    borderRadius: "16px",
                    fontSize: "14px",
                    fontWeight: "600",
                },
                className: "shopcrat-toast",
            }}
            theme="dark"
            richColors
            closeButton
        />
    );
}
