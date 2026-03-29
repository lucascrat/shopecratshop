"use client";

import { Video, Image as ImageIcon, X, ChevronRight, Plus, Check, Loader2, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { createProductWithVideo } from "@/lib/upload";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 5;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FormErrors {
    name?: string;
    description?: string;
    price?: string;
    stock?: string;
    video?: string;
    images?: string;
}

export default function ProductForm() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "Fashion",
        stock: "10",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const videoInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim() || formData.name.trim().length < 3) {
            newErrors.name = "Nome deve ter pelo menos 3 caracteres";
        }
        if (!formData.description.trim() || formData.description.trim().length < 10) {
            newErrors.description = "Descrição deve ter pelo menos 10 caracteres";
        }
        const price = parseFloat(formData.price);
        if (isNaN(price) || price <= 0) {
            newErrors.price = "Preço deve ser maior que zero";
        }
        if (price > 999999) {
            newErrors.price = "Preço muito alto";
        }
        const stock = parseInt(formData.stock);
        if (isNaN(stock) || stock < 0) {
            newErrors.stock = "Estoque deve ser um número válido";
        }
        if (!videoFile) {
            newErrors.video = "Vídeo é obrigatório";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
            toast.error("Formato de vídeo inválido. Use MP4, MOV ou WebM.");
            return;
        }
        if (file.size > MAX_VIDEO_SIZE) {
            toast.error("Vídeo muito grande. Máximo 100MB.");
            return;
        }

        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
        setErrors(prev => ({ ...prev, video: undefined }));
    };

    const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (imageFiles.length + files.length > MAX_IMAGES) {
            toast.error(`Máximo de ${MAX_IMAGES} imagens permitidas.`);
            return;
        }

        const validFiles = files.filter(file => {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                toast.error(`${file.name}: formato inválido. Use JPG, PNG ou WebP.`);
                return false;
            }
            if (file.size > MAX_IMAGE_SIZE) {
                toast.error(`${file.name}: muito grande. Máximo 10MB.`);
                return false;
            }
            return true;
        });

        setImageFiles(prev => [...prev, ...validFiles]);
        const urls = validFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...urls]);
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (authLoading) {
            toast.error("Carregando dados do perfil, aguarde...");
            return;
        }

        if (!profile) {
            toast.error("Faça login como vendedor primeiro");
            return;
        }

        if (!validateForm()) {
            toast.error("Corrija os erros no formulário");
            return;
        }

        setIsUploading(true);
        try {
            const storeRes = await apiFetch<{ store: { id: string } }>(
                `/api/stores?merchantId=${profile.id}`
            );

            if (!storeRes.store) {
                toast.error("Loja não encontrada. Crie uma loja primeiro.");
                return;
            }
            const store = storeRes.store;

            await createProductWithVideo({
                ...formData,
                videoFile: videoFile!,
                imageFiles,
                storeId: store.id,
            });

            toast.success("Produto publicado com sucesso!");
            router.push("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao publicar produto.";
            console.error(err);
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    };

    const FieldError = ({ message }: { message?: string }) => {
        if (!message) return null;
        return (
            <p className="text-red-400 text-[10px] font-bold flex items-center gap-1 mt-1 pl-1">
                <AlertCircle className="w-3 h-3" />
                {message}
            </p>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-24">
            {/* Media Uploads */}
            <div className="grid grid-cols-2 gap-4">
                {/* Video Upload */}
                <div
                    onClick={() => videoInputRef.current?.click()}
                    className={`aspect-[9/16] bg-white/5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${errors.video ? 'border-red-500/50' : 'border-white/10 hover:border-primary/50'}`}
                >
                    {videoPreview ? (
                        <>
                            <video src={videoPreview} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Video className="text-white w-10 h-10" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-primary/20 p-4 rounded-full mb-3 text-primary">
                                <Video className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-bold text-white/40">Adicionar Vídeo</p>
                            <p className="text-[10px] text-white/20 mt-1">MP4, MOV (max 100MB)</p>
                        </>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoChange} />
                </div>

                {/* Image Grid Upload */}
                <div className="grid grid-rows-2 gap-4">
                    <div
                        onClick={() => imageInputRef.current?.click()}
                        className="bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all"
                    >
                        <ImageIcon className="text-white/20 w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold text-white/40">Fotos ({imageFiles.length}/{MAX_IMAGES})</span>
                        <input ref={imageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagesChange} />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {imagePreviews.map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                                <Image src={url} alt="Preview" fill className="object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <FieldError message={errors.video} />

            {/* Product Details Card */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                <label className="block space-y-2">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Nome do Produto</span>
                    <input
                        type="text"
                        placeholder="ex: Jaqueta Jeans Vintage"
                        className={`w-full bg-white/5 border rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                        value={formData.name}
                        onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                        }}
                        maxLength={100}
                        required
                    />
                    <FieldError message={errors.name} />
                </label>

                <label className="block space-y-2">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Descrição</span>
                    <textarea
                        rows={3}
                        placeholder="Conte aos clientes sobre seu produto..."
                        className={`w-full bg-white/5 border rounded-xl p-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none ${errors.description ? 'border-red-500/50' : 'border-white/10'}`}
                        value={formData.description}
                        onChange={(e) => {
                            setFormData({ ...formData, description: e.target.value });
                            if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                        }}
                        maxLength={1000}
                        required
                    />
                    <div className="flex justify-between items-center">
                        <FieldError message={errors.description} />
                        <span className="text-[10px] text-white/20 pl-1">{formData.description.length}/1000</span>
                    </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Preço (R$)</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0,00"
                            className={`w-full bg-white/5 border rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10'}`}
                            value={formData.price}
                            onChange={(e) => {
                                setFormData({ ...formData, price: e.target.value });
                                if (errors.price) setErrors(prev => ({ ...prev, price: undefined }));
                            }}
                            required
                        />
                        <FieldError message={errors.price} />
                    </label>
                    <label className="block space-y-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Estoque</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className={`w-full bg-white/5 border rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.stock ? 'border-red-500/50' : 'border-white/10'}`}
                            value={formData.stock}
                            onChange={(e) => {
                                setFormData({ ...formData, stock: e.target.value });
                                if (errors.stock) setErrors(prev => ({ ...prev, stock: undefined }));
                            }}
                            required
                        />
                        <FieldError message={errors.stock} />
                    </label>
                </div>

                {/* Category Select */}
                <label className="block space-y-2">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Categoria</span>
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="Fashion">Moda</option>
                        <option value="Beauty">Beleza</option>
                        <option value="Tech">Tech</option>
                        <option value="Home">Casa</option>
                        <option value="Sports">Esportes</option>
                    </select>
                </label>
            </div>

            <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        Publicando...
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        Salvar Produto e Listar Vídeo
                    </>
                )}
            </button>
        </form>
    );
}
