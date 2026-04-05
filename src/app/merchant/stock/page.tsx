"use client";

import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Package, Plus, Search, Loader2, ChevronDown, Edit2, Trash2,
    Save, X, QrCode, CreditCard, Truck, Store, TrendingUp,
    LayoutDashboard, Video, BarChart3, ArrowLeft, AlertTriangle, Flame,
} from "lucide-react";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    old_price: number | null;
    stock: number;
    category: string;
    images: string[];
    sales_count: number;
    created_at: string;
    promo_price: number | null;
    promo_start: string | null;
    promo_end: string | null;
    promo_label: string | null;
}

interface StoreSettings {
    accept_pix: boolean;
    accept_card: boolean;
    accept_pay_on_delivery: boolean;
    accept_store_pickup: boolean;
}

export default function MerchantStock() {
    const { user, profile } = useAuth();
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);

    // Store payment settings
    const [storeSettings, setStoreSettings] = useState<StoreSettings>({
        accept_pix: true,
        accept_card: true,
        accept_pay_on_delivery: false,
        accept_store_pickup: false,
    });
    const [showPaymentSettings, setShowPaymentSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "",
        price: "",
        oldPrice: "",
        stock: "",
        description: "",
        promoEnabled: false,
        promoPrice: "",
        promoStart: "",
        promoEnd: "",
        promoLabel: "",
        promoLabelCustom: "",
    });

    const PROMO_LABEL_PRESETS = [
        "Flash Sale",
        "Queima de Estoque",
        "Oferta Relâmpago",
        "Black Friday",
    ];

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<{ products: any[]; storeId: string }>(
                "/api/merchant/products"
            );
            setProducts(
                (res.products || []).map((p) => ({
                    ...p,
                    price: parseFloat(String(p.price || 0)),
                    old_price: p.old_price ? parseFloat(String(p.old_price)) : null,
                    sales_count: parseInt(String(p.sales_count || 0)),
                    promo_price: p.promo_price ? parseFloat(String(p.promo_price)) : null,
                    promo_start: p.promo_start || null,
                    promo_end: p.promo_end || null,
                    promo_label: p.promo_label || null,
                }))
            );
            setStoreId(res.storeId || null);

            // Fetch store settings
            if (res.storeId) {
                try {
                    const sRes = await apiFetch<{ settings: StoreSettings }>(
                        `/api/merchant/store-settings`
                    );
                    if (sRes.settings) setStoreSettings(sRes.settings);
                } catch {
                    // store_settings may not exist yet — defaults are fine
                }
            }
        } catch (err: any) {
            toast.error("Erro ao carregar produtos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchProducts();
    }, [user]);

    const startEdit = (product: Product) => {
        setEditingId(product.id);
        const hasPromo = !!(product.promo_price || product.promo_start || product.promo_end || product.promo_label);
        const labelIsPreset = product.promo_label && PROMO_LABEL_PRESETS.includes(product.promo_label);
        setEditForm({
            name: product.name,
            price: product.price.toFixed(2),
            oldPrice: product.old_price ? product.old_price.toFixed(2) : "",
            stock: String(product.stock),
            description: product.description || "",
            promoEnabled: hasPromo,
            promoPrice: product.promo_price ? product.promo_price.toFixed(2) : "",
            promoStart: product.promo_start ? product.promo_start.slice(0, 16) : "",
            promoEnd: product.promo_end ? product.promo_end.slice(0, 16) : "",
            promoLabel: labelIsPreset ? product.promo_label! : (product.promo_label ? "__custom__" : ""),
            promoLabelCustom: labelIsPreset ? "" : (product.promo_label || ""),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", price: "", oldPrice: "", stock: "", description: "", promoEnabled: false, promoPrice: "", promoStart: "", promoEnd: "", promoLabel: "", promoLabelCustom: "" });
    };

    const saveProduct = async (productId: string) => {
        setSaving(true);
        try {
            const resolvedLabel = editForm.promoLabel === "__custom__" ? editForm.promoLabelCustom : editForm.promoLabel;
            const res = await apiFetch<{ product: any }>("/api/merchant/products", {
                method: "PATCH",
                body: JSON.stringify({
                    productId,
                    name: editForm.name,
                    price: editForm.price,
                    oldPrice: editForm.oldPrice || null,
                    stock: editForm.stock,
                    description: editForm.description,
                    promoPrice: editForm.promoEnabled && editForm.promoPrice ? editForm.promoPrice : null,
                    promoStart: editForm.promoEnabled && editForm.promoStart ? new Date(editForm.promoStart).toISOString() : null,
                    promoEnd: editForm.promoEnabled && editForm.promoEnd ? new Date(editForm.promoEnd).toISOString() : null,
                    promoLabel: editForm.promoEnabled && resolvedLabel ? resolvedLabel : null,
                }),
            });
            setProducts((prev) =>
                prev.map((p) =>
                    p.id === productId
                        ? {
                            ...p,
                            name: res.product.name,
                            price: parseFloat(String(res.product.price)),
                            old_price: res.product.old_price ? parseFloat(String(res.product.old_price)) : null,
                            stock: parseInt(String(res.product.stock)),
                            description: res.product.description,
                            promo_price: res.product.promo_price ? parseFloat(String(res.product.promo_price)) : null,
                            promo_start: res.product.promo_start || null,
                            promo_end: res.product.promo_end || null,
                            promo_label: res.product.promo_label || null,
                        }
                        : p
                )
            );
            toast.success("Produto atualizado!");
            cancelEdit();
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (productId: string) => {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;
        setDeleting(productId);
        try {
            await apiFetch(`/api/merchant/products?id=${productId}`, { method: "DELETE" });
            setProducts((prev) => prev.filter((p) => p.id !== productId));
            toast.success("Produto excluído!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao excluir");
        } finally {
            setDeleting(null);
        }
    };

    const savePaymentSettings = async () => {
        setSavingSettings(true);
        try {
            await apiFetch("/api/merchant/products", {
                method: "PATCH",
                body: JSON.stringify({
                    productId: products[0]?.id || "__settings__",
                    acceptPix: storeSettings.accept_pix,
                    acceptCard: storeSettings.accept_card,
                    acceptPayOnDelivery: storeSettings.accept_pay_on_delivery,
                    acceptStorePickup: storeSettings.accept_store_pickup,
                }),
            });
            toast.success("Formas de pagamento salvas!");
            setShowPaymentSettings(false);
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setSavingSettings(false);
        }
    };

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const totalSales = products.reduce((s, p) => s + p.sales_count, 0);
    const lowStock = products.filter((p) => p.stock <= 3 && p.stock > 0).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;

    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark text-white pb-28">
            {/* Header */}
            <header className="p-5 pt-10 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-5">
                    <button onClick={() => router.push("/merchant/dashboard")} className="p-2 -ml-2 text-white/40 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <Link
                        href="/merchant/add-product"
                        className="flex items-center gap-2 bg-primary px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Produto
                    </Link>
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">Estoque</h1>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                    {products.length} produto(s) cadastrado(s)
                </p>
            </header>

            <div className="px-4 py-5 space-y-5">
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-lg font-black italic">{products.length}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mt-0.5">Produtos</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-lg font-black italic">{totalStock}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mt-0.5">Itens</p>
                    </div>
                    <div className={`rounded-2xl p-3 text-center border ${lowStock > 0 || outOfStock > 0 ? "bg-yellow-400/10 border-yellow-400/20" : "bg-white/5 border-white/5"}`}>
                        <p className={`text-lg font-black italic ${lowStock > 0 || outOfStock > 0 ? "text-yellow-400" : ""}`}>
                            {outOfStock + lowStock}
                        </p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mt-0.5">Crítico</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-lg font-black italic text-green-400">{totalSales}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mt-0.5">Vendas</p>
                    </div>
                </div>

                {/* Payment Settings Toggle */}
                <button
                    onClick={() => setShowPaymentSettings(!showPaymentSettings)}
                    className="w-full flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black">Formas de Pagamento</p>
                            <p className="text-[9px] text-white/30 font-bold">
                                {[
                                    storeSettings.accept_pix && "PIX",
                                    storeSettings.accept_card && "Cartão",
                                    storeSettings.accept_pay_on_delivery && "Na entrega",
                                    storeSettings.accept_store_pickup && "Na loja",
                                ].filter(Boolean).join(" • ") || "Nenhuma ativa"}
                            </p>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/20 transition-transform ${showPaymentSettings ? "rotate-180" : ""}`} />
                </button>

                {showPaymentSettings && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 -mt-3">
                        {[
                            { key: "accept_pix" as const, icon: QrCode, label: "PIX", sub: "QR Code · Sem taxa extra", color: "text-green-400" },
                            { key: "accept_card" as const, icon: CreditCard, label: "Cartão de Crédito", sub: "Débito e crédito · Até 12x", color: "text-blue-400" },
                            { key: "accept_pay_on_delivery" as const, icon: Truck, label: "Pagar ao Receber", sub: "Maquininha na porta", color: "text-yellow-400" },
                            { key: "accept_store_pickup" as const, icon: Store, label: "Retirar na Loja", sub: "Pague na retirada · Frete grátis", color: "text-purple-400" },
                        ].map((method) => {
                            const Icon = method.icon;
                            const active = storeSettings[method.key];
                            return (
                                <div key={method.key} className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-white/10" : "bg-white/5"}`}>
                                        <Icon className={`w-5 h-5 ${active ? method.color : "text-white/20"}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${active ? "text-white" : "text-white/40"}`}>{method.label}</p>
                                        <p className="text-[9px] text-white/20 font-bold">{method.sub}</p>
                                    </div>
                                    <button
                                        onClick={() => setStoreSettings((prev) => ({ ...prev, [method.key]: !prev[method.key] }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${active ? "bg-primary" : "bg-white/10"}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? "left-7" : "left-1"}`} />
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            onClick={savePaymentSettings}
                            disabled={savingSettings}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider mt-2 disabled:opacity-50"
                        >
                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Configurações
                        </button>
                    </div>
                )}

                {/* Low Stock Alert */}
                {(lowStock > 0 || outOfStock > 0) && (
                    <div className="flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                        <p className="text-[10px] text-yellow-400 font-bold">
                            {outOfStock > 0 && `${outOfStock} sem estoque`}
                            {outOfStock > 0 && lowStock > 0 && " · "}
                            {lowStock > 0 && `${lowStock} com estoque crítico (≤ 3)`}
                        </p>
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Products List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/20 text-sm mb-4">
                            {search ? "Nenhum produto encontrado" : "Nenhum produto cadastrado ainda"}
                        </p>
                        {!search && (
                            <Link href="/merchant/add-product" className="text-primary text-sm font-bold hover:underline">
                                Adicionar primeiro produto
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((product) => {
                            const isExpanded = expandedId === product.id;
                            const isEditing = editingId === product.id;
                            const stockStatus =
                                product.stock === 0
                                    ? { label: "Sem estoque", color: "text-red-400 bg-red-400/10" }
                                    : product.stock <= 3
                                    ? { label: `${product.stock} restantes`, color: "text-yellow-400 bg-yellow-400/10" }
                                    : { label: `${product.stock} em estoque`, color: "text-green-400 bg-green-400/10" };

                            const promoActive = !!(product.promo_price && product.promo_start && product.promo_end &&
                                new Date(product.promo_start) <= new Date() && new Date(product.promo_end) >= new Date());

                            return (
                                <div key={product.id} className={`bg-white/5 rounded-2xl border overflow-hidden ${promoActive ? "border-orange-500/40" : "border-white/5"}`}>
                                    {/* Product Row */}
                                    <button
                                        onClick={() => {
                                            if (isEditing) return;
                                            setExpandedId(isExpanded ? null : product.id);
                                        }}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/30 shrink-0 relative">
                                                {product.images?.[0] ? (
                                                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-6 h-6 text-white/10" />
                                                    </div>
                                                )}
                                                {promoActive && (
                                                    <div className="absolute top-0 right-0 bg-orange-500 p-0.5 rounded-bl-lg">
                                                        <Flame className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold truncate">{product.name}</p>
                                                    {promoActive && product.promo_label && (
                                                        <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg whitespace-nowrap">
                                                            <Flame className="w-2.5 h-2.5" />
                                                            {product.promo_label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {promoActive ? (
                                                        <>
                                                            <p className="text-orange-400 font-black text-sm italic">
                                                                R$ {product.promo_price!.toFixed(2)}
                                                            </p>
                                                            <p className="text-white/20 text-[10px] line-through">
                                                                R$ {product.price.toFixed(2)}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-primary font-black text-sm italic">
                                                                R$ {product.price.toFixed(2)}
                                                            </p>
                                                            {product.old_price && (
                                                                <p className="text-white/20 text-[10px] line-through">
                                                                    R$ {product.old_price.toFixed(2)}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${stockStatus.color}`}>
                                                        {stockStatus.label}
                                                    </span>
                                                    <span className="text-[8px] text-white/20 font-bold">
                                                        {product.sales_count} vendas
                                                    </span>
                                                </div>
                                            </div>
                                            {!isEditing && (
                                                <ChevronDown className={`w-4 h-4 text-white/20 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded / Edit */}
                                    {isExpanded && !isEditing && (
                                        <div className="border-t border-white/5 p-4 space-y-3">
                                            <p className="text-[9px] text-white/30 line-clamp-2">{product.description}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase text-white/20 bg-white/5 px-2 py-1 rounded-lg">
                                                    {product.category}
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-white/20 bg-white/5 px-2 py-1 rounded-lg">
                                                    <TrendingUp className="w-3 h-3 inline mr-1" />
                                                    {product.sales_count} vendas
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => startEdit(product)}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    disabled={deleting === product.id}
                                                    className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-30"
                                                >
                                                    {deleting === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit Form */}
                                    {isEditing && (
                                        <div className="border-t border-white/5 p-4 space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Editando produto</p>

                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Nome</label>
                                                <input
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Preço (R$)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editForm.price}
                                                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Preço Antigo</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editForm.oldPrice}
                                                        onChange={(e) => setEditForm((f) => ({ ...f, oldPrice: e.target.value }))}
                                                        placeholder="Opcional"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/10"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">
                                                    Estoque (unidades)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={editForm.stock}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Descrição</label>
                                                <textarea
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                                    rows={2}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
                                                />
                                            </div>

                                            {/* Promo Section */}
                                            <div className="border-t border-white/5 pt-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Flame className="w-4 h-4 text-orange-400" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400">Promoção</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm((f) => ({ ...f, promoEnabled: !f.promoEnabled }))}
                                                        className={`w-12 h-6 rounded-full transition-all relative ${editForm.promoEnabled ? "bg-orange-500" : "bg-white/10"}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.promoEnabled ? "left-7" : "left-1"}`} />
                                                    </button>
                                                </div>

                                                {editForm.promoEnabled && (
                                                    <div className="space-y-3 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Preço Promocional (R$)</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={editForm.promoPrice}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, promoPrice: e.target.value }))}
                                                                placeholder="Ex: 49.90"
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-white/10"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Início</label>
                                                                <input
                                                                    type="datetime-local"
                                                                    value={editForm.promoStart}
                                                                    onChange={(e) => setEditForm((f) => ({ ...f, promoStart: e.target.value }))}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Fim</label>
                                                                <input
                                                                    type="datetime-local"
                                                                    value={editForm.promoEnd}
                                                                    onChange={(e) => setEditForm((f) => ({ ...f, promoEnd: e.target.value }))}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-wider text-white/30 block mb-1">Etiqueta</label>
                                                            <select
                                                                value={editForm.promoLabel}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, promoLabel: e.target.value }))}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
                                                            >
                                                                <option value="">Sem etiqueta</option>
                                                                {PROMO_LABEL_PRESETS.map((label) => (
                                                                    <option key={label} value={label}>{label}</option>
                                                                ))}
                                                                <option value="__custom__">Personalizada...</option>
                                                            </select>
                                                            {editForm.promoLabel === "__custom__" && (
                                                                <input
                                                                    type="text"
                                                                    maxLength={50}
                                                                    value={editForm.promoLabelCustom}
                                                                    onChange={(e) => setEditForm((f) => ({ ...f, promoLabelCustom: e.target.value }))}
                                                                    placeholder="Digite a etiqueta..."
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-white/10 mt-2"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => saveProduct(product.id)}
                                                    disabled={saving}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 rounded-xl py-3 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                                                >
                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                                                >
                                                    <X className="w-5 h-5 text-white/40" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Merchant Bottom Nav */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background-dark/95 backdrop-blur-3xl border-t border-white/5 h-24 flex items-center justify-around px-8 pb-6 z-50">
                <Link href="/merchant/dashboard" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
                </Link>
                <div className="flex flex-col items-center gap-1.5 text-primary">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full -mb-0.5" />
                    <Package className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Estoque</span>
                </div>
                <Link href="/merchant/add-product" className="bg-primary hover:bg-primary/90 p-3 rounded-2xl -mt-10 shadow-lg shadow-primary/20 transform active:scale-95 transition-all outline outline-4 outline-black/80">
                    <Plus className="w-7 h-7 text-white stroke-[3px]" />
                </Link>
                <Link href="/" className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors">
                    <Video className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Feed</span>
                </Link>
                <div className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white transition-colors cursor-pointer">
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Analítico</span>
                </div>
            </nav>
        </main>
    );
}
