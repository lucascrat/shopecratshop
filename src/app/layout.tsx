import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
    title: "Shopcrat - Video Shopping Experience",
    description: "Discover products through immersive vertical videos. Shop like never before.",
    manifest: "/manifest.json",
    colorScheme: "dark",
} as Metadata;

export const viewport: Viewport = {
    themeColor: "#f46a25",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" className="dark scroll-smooth" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
            <head>
                <meta name="color-scheme" content="dark" />
                {/* Force dark class before first paint to prevent flash of light mode */}
                <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';` }} />
            </head>
            <body className={`${plusJakartaSans.variable} font-sans antialiased flex flex-col items-center justify-center min-h-screen`} style={{ backgroundColor: '#221610', color: '#f1f5f9' }}>
                <ErrorBoundary>
                    <AuthProvider>
                        <ToastProvider />
                        {children}
                        <BottomNav />
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
