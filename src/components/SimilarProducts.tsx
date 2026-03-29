"use client";

import { ChevronLeft, Share2, PlayCircle, Star, Truck, Clock, ShieldCheck } from "lucide-react";
import Image from "next/image";

interface SimilarProduct {
    id: string;
    name: string;
    price: number;
    store: string;
    rating: string;
    badge?: string;
    badgeType?: "success" | "warning" | "info";
    image: string;
}

const SIMILAR_PRODUCTS: SimilarProduct[] = [
    { id: "s1", name: "Studio Wireless Pro", price: 219.00, store: "Loja Global de Áudio", rating: "4.9", badge: "Entrega Expressa", badgeType: "success", image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200" },
    { id: "s2", name: "QuietComfort Ultra", price: 235.00, store: "Centro SoundMaster", rating: "4.7", badge: "Envio em 3-5 dias", badgeType: "info", image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200" },
    { id: "s3", name: "SonicBoom Wireless", price: 189.99, store: "Ofertas Tech Diárias", rating: "4.5", badge: "Melhor Custo-Benefício", badgeType: "warning", image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=200" },
    { id: "s4", name: "Audio-Grade X5", price: 299.00, store: "Equipamentos Premium", rating: "5.0", badge: "Garantia Inclusa", badgeType: "success", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200" },
];

export default function SimilarProducts({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex flex-col h-full bg-background-dark text-white animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-white/10 uppercase tracking-tighter">
                <button onClick={onClose} className="p-2 -ml-2">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold">Comparar Produtos</h2>
                <button className="p-2 -mr-2">
                    <Share2 className="w-6 h-6" />
                </button>
            </header>

            {/* Anchor Product */}
            <div className="p-4">
                <div className="flex items-stretch justify-between gap-4 rounded-2xl bg-white/5 p-4 border border-primary/30 shadow-2xl shadow-primary/5">
                    <div className="flex flex-col justify-between py-1">
                        <div className="flex flex-col gap-1">
                            <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">Visualizando Agora</span>
                            <p className="text-sm font-bold leading-tight">Elite Noise Cancelling Headphones v2</p>
                            <p className="text-primary text-lg font-bold">R$ 249,00</p>
                        </div>
                        <p className="text-white/40 text-xs mt-2 italic">Loja: TechHaven Oficial</p>
                    </div>
                    <div className="w-24 h-24 relative rounded-xl overflow-hidden flex-shrink-0">
                        <Image src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200" alt="Current" fill className="object-cover" />
                    </div>
                </div>
            </div>

            {/* Suggested List */}
            <div className="flex items-center justify-between px-4 mt-4 mb-2">
                <h3 className="text-lg font-bold">Produtos Similares</h3>
                <span className="text-white/40 text-xs text-primary font-bold">12 opções encontradas</span>
            </div>

            <div className="flex flex-col gap-3 px-4 pb-32 overflow-y-auto">
                {SIMILAR_PRODUCTS.map((product) => (
                    <div key={product.id} className="flex gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 items-center hover:border-primary/50 transition-colors group cursor-pointer active:scale-95 transition-all">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-all">
                                <PlayCircle className="text-white w-8 h-8 opacity-80" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-bold truncate pr-2">{product.name}</h4>
                                <p className="text-primary font-bold text-sm">R$ {parseFloat(String(product.price || 0)).toFixed(2)}</p>
                            </div>
                            <p className="text-white/40 text-xs mb-2">{product.store} • {product.rating}★</p>
                            {product.badge && (
                                <div className="flex items-center gap-1">
                                    {product.badgeType === 'success' && <Truck className="w-3 h-3 text-green-400" />}
                                    {product.badgeType === 'info' && <Clock className="w-3 h-3 text-blue-400" />}
                                    {product.badgeType === 'warning' && <ShieldCheck className="w-3 h-3 text-orange-400" />}
                                    <p className={`text-[10px] font-bold uppercase tracking-tight ${product.badgeType === 'success' ? 'text-green-400' :
                                        product.badgeType === 'info' ? 'text-blue-400' : 'text-orange-400'
                                        }`}>
                                        {product.badge}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sticky Bottom Summary */}
            <div className="fixed bottom-0 left-0 right-1/2 translate-x-1/2 w-full max-w-[430px] mx-auto bg-black/90 backdrop-blur-2xl border-t border-white/10 p-5 pb-9 flex justify-between items-center z-50 rounded-t-[32px]">
                <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest pl-0.5">A partir de</span>
                    <span className="text-2xl font-black text-white italic">R$ 189,99</span>
                </div>
                <button className="bg-primary hover:bg-primary/90 text-white font-black py-3.5 px-8 rounded-2xl shadow-xl shadow-primary/40 transition-all active:scale-95 uppercase text-xs tracking-widest">
                    Ver Melhor Oferta
                </button>
            </div>
        </div>
    );
}
