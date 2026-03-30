"use client";

import {
    ArrowLeft, CreditCard, MapPin, Lock, ShieldCheck, QrCode, Loader2,
    Truck, Store, Copy, CheckCircle2, Clock, ChevronDown, X
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CheckoutProduct {
    id: string;
    name: string;
    price: number;
    store_id: string;
    images: string[];
}

interface InstallmentOption {
    installments: number;
    fee: number;
    installmentValue: number;
    total: number;
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const productId = searchParams.get("id");
    const router = useRouter();
    const { user } = useAuth();

    const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "pay_on_delivery" | "store_pickup">("pix");
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<CheckoutProduct | null>(null);
    const [fetching, setFetching] = useState(!!productId);
    const [storeName, setStoreName] = useState("Loja Oficial");

    // PIX state
    const [pixData, setPixData] = useState<{
        qrcode: string;
        copyPaste: string;
        expiresAt: string;
        txid: string;
    } | null>(null);
    const [showPixModal, setShowPixModal] = useState(false);
    const [checkingPix, setCheckingPix] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const pixPollRef = useRef<NodeJS.Timeout | null>(null);

    // Card state
    const [installments, setInstallments] = useState(1);
    const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
    const [showInstallments, setShowInstallments] = useState(false);

    useEffect(() => {
        if (productId) {
            async function fetchProduct() {
                try {
                    const data = await apiFetch<{ product: CheckoutProduct & { store_name?: string } }>(
                        `/api/products?id=${productId}`
                    );
                    if (data.product) {
                        setProduct({
                            ...data.product,
                            price: parseFloat(String(data.product.price)),
                        });
                        if (data.product.store_name) setStoreName(data.product.store_name);
                    }
                } catch {
                    toast.error("Produto não encontrado");
                }
                setFetching(false);
            }
            fetchProduct();
        }
    }, [productId]);

    // Fetch installment options when product loads
    useEffect(() => {
        if (product) {
            const total = product.price + deliveryFee;
            apiFetch<{ installments: InstallmentOption[] }>(`/api/payments/installments?amount=${total}`)
                .then(data => setInstallmentOptions(data.installments))
                .catch(() => {});
        }
    }, [product]);

    // Cleanup PIX polling on unmount
    useEffect(() => {
        return () => {
            if (pixPollRef.current) clearInterval(pixPollRef.current);
        };
    }, []);

    const deliveryFee = paymentMethod === "store_pickup" ? 0 : 5.00;
    const total = product ? product.price + deliveryFee : 0;

    // Get card total with fee
    const selectedInstallment = installmentOptions.find(o => o.installments === installments);
    const cardTotal = selectedInstallment?.total || total;

    const handleConfirm = async () => {
        if (!user) {
            toast.error("Faça login para realizar a compra");
            router.push("/login");
            return;
        }
        if (!product) {
            toast.error("Produto não encontrado");
            return;
        }

        setLoading(true);
        try {
            // Step 1: Create order
            const orderRes = await apiFetch<{ order: { id: string } }>("/api/orders", {
                method: "POST",
                body: JSON.stringify({
                    productId: product.id,
                    storeId: product.store_id,
                    quantity: 1,
                    total,
                    paymentMethod,
                    shippingAddress: paymentMethod === "store_pickup"
                        ? "Retirada na Loja"
                        : "Av. Paulista, 1000 - Apto 42",
                }),
            });

            const newOrderId = orderRes.order.id;
            setOrderId(newOrderId);

            // Step 2: Process payment based on method
            if (paymentMethod === "pix") {
                await handlePixPayment(newOrderId);
            } else if (paymentMethod === "card") {
                // Card will be handled via Efi tokenization (redirect to success for now)
                toast.success("Pedido realizado! Pagamento via cartão em processamento.");
                router.push(`/order-success?orderId=${newOrderId}`);
            } else {
                // pay_on_delivery or store_pickup — order created, no immediate payment
                toast.success(
                    paymentMethod === "pay_on_delivery"
                        ? "Pedido realizado! A maquininha será enviada ao seu endereço."
                        : "Pedido realizado! Retire na loja."
                );
                router.push(`/order-success?orderId=${newOrderId}`);
            }
        } catch (err: any) {
            console.error("Order error:", err);
            toast.error(err.message || "Erro ao realizar pedido. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handlePixPayment = async (oid: string) => {
        try {
            const pixRes = await apiFetch<{
                txid: string;
                qrcode: string;
                qrcodePng: string;
                copyPaste: string;
                expiresAt: string;
            }>("/api/payments/pix", {
                method: "POST",
                body: JSON.stringify({ orderId: oid }),
            });

            setPixData({
                qrcode: pixRes.qrcodePng || pixRes.qrcode,
                copyPaste: pixRes.copyPaste,
                expiresAt: pixRes.expiresAt,
                txid: pixRes.txid,
            });
            setShowPixModal(true);

            // Start polling for payment confirmation
            startPixPolling(oid);
        } catch (err: any) {
            toast.error(err.message || "Erro ao gerar PIX");
        }
    };

    const startPixPolling = (oid: string) => {
        if (pixPollRef.current) clearInterval(pixPollRef.current);

        setCheckingPix(true);
        pixPollRef.current = setInterval(async () => {
            try {
                const status = await apiFetch<{ paid: boolean; status: string }>(
                    `/api/payments/pix/status?orderId=${oid}`
                );
                if (status.paid) {
                    if (pixPollRef.current) clearInterval(pixPollRef.current);
                    setCheckingPix(false);
                    toast.success("Pagamento PIX confirmado!");
                    router.push(`/order-success?orderId=${oid}`);
                }
            } catch {
                // ignore polling errors
            }
        }, 5000); // Check every 5 seconds
    };

    const copyPixCode = () => {
        if (pixData?.copyPaste) {
            navigator.clipboard.writeText(pixData.copyPaste);
            toast.success("Código PIX copiado!");
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-8 text-center">
                <p className="text-white/40 mb-4">Produto não encontrado</p>
                <button onClick={() => router.back()} className="bg-primary px-8 py-3 rounded-xl font-bold">
                    Voltar
                </button>
            </div>
        );
    }

    const paymentMethods = [
        {
            id: "pix" as const,
            icon: QrCode,
            label: "PIX",
            sub: "QR Code • Confirmação Instantânea",
            tag: "Sem Taxa",
            tagColor: "bg-green-500/20 text-green-500",
        },
        {
            id: "card" as const,
            icon: CreditCard,
            label: "Cartão de Crédito",
            sub: `Até 12x • ${installments > 1 ? `${installments}x de R$ ${(selectedInstallment?.installmentValue || total).toFixed(2)}` : "À vista"}`,
        },
        {
            id: "pay_on_delivery" as const,
            icon: Truck,
            label: "Pagar ao Receber",
            sub: "Maquininha na sua porta",
            tag: "Cartão/Débito",
            tagColor: "bg-blue-400/20 text-blue-400",
        },
        {
            id: "store_pickup" as const,
            icon: Store,
            label: "Retirar na Loja",
            sub: "Pague na retirada • Frete Grátis",
            tag: "Grátis",
            tagColor: "bg-green-500/20 text-green-500",
        },
    ];

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white flex flex-col pb-40 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/10 flex items-center p-4">
                <button onClick={() => router.back()} className="w-10">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg uppercase tracking-tight italic">Finalizar Compra</h1>
                <div className="w-10" />
            </header>

            {/* Item Summary */}
            <div className="p-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex gap-4">
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Resumo do Item</p>
                            <h2 className="text-sm font-black leading-tight truncate">{product.name}</h2>
                            <p className="text-white/40 text-[10px] uppercase font-bold mt-1 tracking-widest">{storeName}</p>
                        </div>
                        <p className="text-primary text-xl font-black mt-2">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <div className="w-24 h-24 relative rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                        <Image
                            src={product.images?.[0] || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200"}
                            alt={product.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Shipping Details */}
            {paymentMethod !== "store_pickup" && (
                <section className="px-4 py-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-3 px-2">Detalhes de Entrega</h3>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 justify-between group cursor-pointer hover:border-primary/50 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Residencial</p>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest line-clamp-1">Av. Paulista, 1000 - Apto 42</p>
                            </div>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20 transition-all text-primary">
                            Editar
                        </button>
                    </div>
                </section>
            )}

            {/* Store Pickup Info */}
            {paymentMethod === "store_pickup" && (
                <section className="px-4 py-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-3 px-2">Retirada</h3>
                    <div className="flex items-center gap-4 bg-green-500/5 p-4 rounded-3xl border border-green-500/20">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-green-400">Retirar na Loja</p>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{storeName} • Pague na retirada</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Pay on Delivery Info */}
            {paymentMethod === "pay_on_delivery" && (
                <section className="px-4 pt-2">
                    <div className="flex items-center gap-3 bg-blue-400/5 p-3 rounded-2xl border border-blue-400/20">
                        <Truck className="w-5 h-5 text-blue-400 shrink-0" />
                        <p className="text-[10px] text-blue-400/80 font-bold">
                            O lojista enviará uma maquininha ao seu endereço para pagamento no ato da entrega.
                        </p>
                    </div>
                </section>
            )}

            {/* Payment Methods */}
            <section className="px-4 py-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-3 px-2">Pagamento</h3>
                <div className="flex flex-col gap-3">
                    {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const active = paymentMethod === method.id;
                        return (
                            <label key={method.id} className={`flex items-center gap-4 p-4 rounded-3xl border transition-all cursor-pointer ${active ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    value={method.id}
                                    checked={active}
                                    onChange={() => { setPaymentMethod(method.id); setInstallments(1); }}
                                    className="hidden"
                                />
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/20'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold">{method.label}</p>
                                        {method.tag && (
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest ${method.tagColor}`}>
                                                {method.tag}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{method.sub}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-primary' : 'border-white/10'}`}>
                                    {active && <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-lg shadow-primary/40" />}
                                </div>
                            </label>
                        );
                    })}
                </div>
            </section>

            {/* Installments Selector (Card only) */}
            {paymentMethod === "card" && installmentOptions.length > 0 && (
                <section className="px-4 pb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-3 px-2">Parcelas</h3>
                    <button
                        onClick={() => setShowInstallments(!showInstallments)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:border-primary/30 transition-all"
                    >
                        <div>
                            <p className="text-sm font-bold">
                                {installments}x de R$ {(selectedInstallment?.installmentValue || total).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-white/30 font-bold">
                                {installments === 1
                                    ? "Sem juros"
                                    : `Total: R$ ${(selectedInstallment?.total || total).toFixed(2)} (${selectedInstallment?.fee || 0}% taxa)`}
                            </p>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-white/20 transition-transform ${showInstallments ? "rotate-180" : ""}`} />
                    </button>

                    {showInstallments && (
                        <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                            {installmentOptions.map((opt) => (
                                <button
                                    key={opt.installments}
                                    onClick={() => { setInstallments(opt.installments); setShowInstallments(false); }}
                                    className={`w-full flex items-center justify-between p-3 px-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all ${
                                        installments === opt.installments ? "bg-primary/5" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-black w-6 ${installments === opt.installments ? "text-primary" : "text-white/40"}`}>
                                            {opt.installments}x
                                        </span>
                                        <span className="text-sm font-bold">R$ {opt.installmentValue.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-white/30 font-bold">
                                            {opt.fee > 0 ? `${opt.fee}% • R$ ${opt.total.toFixed(2)}` : "Sem juros"}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Order Summary */}
            <div className="p-4 mt-auto">
                <div className="bg-white/5 rounded-3xl p-6 flex flex-col gap-3 border border-white/5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        <span>Subtotal</span>
                        <span>R$ {product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        <span>Taxa de Entrega</span>
                        <span className={deliveryFee === 0 ? "text-green-400" : ""}>
                            {deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2)}`}
                        </span>
                    </div>
                    {paymentMethod === "card" && installments > 1 && selectedInstallment && (
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            <span>Taxa Cartão ({selectedInstallment.fee}%)</span>
                            <span>R$ {(selectedInstallment.total - total).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="h-px bg-white/5 my-2" />
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-[0.1em]">Total</span>
                        <span className="text-primary text-2xl font-black italic">
                            R$ {(paymentMethod === "card" && installments > 1 ? cardTotal : total).toFixed(2)}
                        </span>
                    </div>
                    {paymentMethod === "card" && installments > 1 && (
                        <p className="text-[9px] text-white/20 text-center font-bold">
                            {installments}x de R$ {(selectedInstallment?.installmentValue || 0).toFixed(2)} no cartão
                        </p>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background-dark/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8 z-50">
                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transform active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase tracking-[0.2em] text-xs h-16 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : paymentMethod === "pix" ? (
                        <QrCode className="w-5 h-5" />
                    ) : (
                        <Lock className="w-5 h-5" />
                    )}
                    {paymentMethod === "pix"
                        ? "Gerar QR Code PIX"
                        : paymentMethod === "card"
                        ? "Pagar com Cartão"
                        : paymentMethod === "pay_on_delivery"
                        ? "Confirmar Pedido"
                        : "Reservar para Retirada"}
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Checkout seguro por shopcrat.shop
                </div>
            </footer>

            {/* PIX QR Code Modal */}
            {showPixModal && pixData && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a242e] rounded-3xl w-full max-w-[400px] overflow-hidden border border-white/10">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <QrCode className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase">Pagamento PIX</h3>
                                    <p className="text-[9px] text-white/30 font-bold">Escaneie o QR Code</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPixModal(false);
                                    if (pixPollRef.current) clearInterval(pixPollRef.current);
                                }}
                                className="p-2 text-white/30 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* QR Code */}
                        <div className="p-6 flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-2xl">
                                {pixData.qrcode ? (
                                    <img
                                        src={pixData.qrcode}
                                        alt="QR Code PIX"
                                        className="w-52 h-52"
                                    />
                                ) : (
                                    <div className="w-52 h-52 flex items-center justify-center text-black/30">
                                        <QrCode className="w-20 h-20" />
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <p className="text-2xl font-black italic text-primary">
                                    R$ {total.toFixed(2)}
                                </p>
                                <div className="flex items-center gap-1.5 justify-center mt-1">
                                    <Clock className="w-3 h-3 text-white/20" />
                                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider">
                                        Expira em 1 hora
                                    </p>
                                </div>
                            </div>

                            {/* Copy Paste Code */}
                            <div className="w-full">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 text-center">
                                    Ou copie o código
                                </p>
                                <button
                                    onClick={copyPixCode}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex-1 text-[10px] font-mono text-white/40 truncate text-left">
                                        {pixData.copyPaste || "Código PIX Copia e Cola"}
                                    </div>
                                    <Copy className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 w-full">
                                {checkingPix ? (
                                    <>
                                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />
                                        <p className="text-[10px] font-bold text-yellow-400">
                                            Aguardando pagamento...
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                        <p className="text-[10px] font-bold text-green-400">
                                            Pagamento confirmado!
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
