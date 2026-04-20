import { getToken } from "./api";
import type { CreateProductPayload } from "./types";

function getAuthToken(): string {
    const token = getToken();
    if (!token) throw new Error("Usuário não autenticado");
    return token;
}

async function uploadFileViaApi(file: File, folder: string): Promise<string> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("action", "upload-file");
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro no upload");
    }

    const data = await res.json();
    return data.url;
}

export async function createProductWithVideo(payload: CreateProductPayload) {
    const { name, description, price, oldPrice, category, stock, videoFile, imageFiles, storeId } = payload;

    // 1. Upload video via API
    const videoUrl = await uploadFileViaApi(videoFile, "videos");

    // 2. Upload images via API
    const imageUrls = await Promise.all(
        imageFiles.map((file: File) => uploadFileViaApi(file, "products"))
    );

    // 3. Create product + video via API
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("action", "create-product");
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    if (oldPrice && oldPrice.trim() !== "") {
        formData.append("oldPrice", oldPrice);
    }
    formData.append("category", category);
    formData.append("stock", stock);
    formData.append("storeId", storeId);
    formData.append("videoUrl", videoUrl);
    formData.append("imageUrls", JSON.stringify(imageUrls));

    const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar produto");
    }

    return await res.json();
}
