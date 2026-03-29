import ProductForm from "@/components/merchant/ProductForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AddProductPage() {
    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white">
            {/* Top Header */}
            <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-lg border-b border-white/10 flex items-center p-4">
                <Link href="/" className="w-10">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="flex-1 text-center font-bold text-lg italic uppercase tracking-tight">Novo Produto</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            <ProductForm />
        </main>
    );
}
