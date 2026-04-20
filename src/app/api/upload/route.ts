import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// Server-side only clients - credentials never exposed to browser
const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function uploadToR2(buffer: Buffer, contentType: string, folder: string): Promise<string> {
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!publicUrl || publicUrl === "undefined") {
        throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL não está configurado no servidor");
    }
    if (!bucket) {
        throw new Error("CLOUDFLARE_R2_BUCKET_NAME não está configurado no servidor");
    }

    const ext = contentType.split("/")[1];
    const fileName = `${folder}/${uuidv4()}.${ext}`;

    console.log("[uploadToR2] Uploading to bucket:", bucket, "folder:", folder, "ext:", ext);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
    });

    await r2.send(command);
    const url = `${publicUrl}/${fileName}`;
    console.log("[uploadToR2] Stored URL:", url);
    return url;
}

export async function POST(request: NextRequest) {
    try {
        // Verify auth via JWT
        console.log("[upload] Verificando auth...");
        const user = requireAuth(request);
        console.log("[upload] User:", user.id, user.role);

        const formData = await request.formData();
        const action = formData.get("action") as string;
        console.log("[upload] Action:", action);

        if (action === "upload-file") {
            const file = formData.get("file") as File;
            const folder = formData.get("folder") as string;

            if (!file || !folder) {
                return NextResponse.json({ error: "Arquivo e pasta são obrigatórios" }, { status: 400 });
            }

            console.log("[upload] File:", file.name, "type:", file.type, "size:", file.size, "folder:", folder);

            // Validate file type and size
            const isVideo = folder === "videos";
            const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
            const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
            }

            if (file.size > maxSize) {
                return NextResponse.json({
                    error: `Arquivo muito grande. Máximo: ${isVideo ? "100MB" : "10MB"}`
                }, { status: 400 });
            }

            console.log("[upload] Convertendo para buffer...");
            const buffer = Buffer.from(await file.arrayBuffer());
            console.log("[upload] Enviando para R2... bucket:", process.env.CLOUDFLARE_R2_BUCKET_NAME);
            const url = await uploadToR2(buffer, file.type, folder);
            console.log("[upload] Upload R2 OK:", url);

            return NextResponse.json({ url });
        }

        if (action === "create-product") {
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;
            const price = parseFloat(formData.get("price") as string);
            const oldPriceRaw = formData.get("oldPrice") as string | null;
            const oldPrice = oldPriceRaw && oldPriceRaw.trim() !== "" ? parseFloat(oldPriceRaw) : null;
            const category = formData.get("category") as string;
            const stock = parseInt(formData.get("stock") as string);
            const storeId = formData.get("storeId") as string;
            const videoUrl = formData.get("videoUrl") as string;
            const imageUrlsJson = formData.get("imageUrls") as string;
            const imageUrls = JSON.parse(imageUrlsJson || "[]");

            console.log("[create-product] Dados:", { name, price, oldPrice, category, stock, storeId, videoUrl, imageUrls });

            // Validate
            if (!name || !description || isNaN(price) || price <= 0) {
                return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
            }
            if (oldPrice !== null && (isNaN(oldPrice) || oldPrice <= price)) {
                return NextResponse.json({ error: "Preço antigo deve ser maior que o preço promocional" }, { status: 400 });
            }

            // Verify store ownership
            console.log("[create-product] Verificando loja...");
            const { rows: storeRows } = await query(
                "SELECT id, merchant_id FROM stores WHERE id = $1",
                [storeId]
            );
            console.log("[create-product] Store found:", storeRows.length, "merchant_id:", storeRows[0]?.merchant_id, "user.id:", user.id);

            if (storeRows.length === 0 || storeRows[0].merchant_id !== user.id) {
                return NextResponse.json({ error: "Loja não encontrada ou sem permissão" }, { status: 403 });
            }

            // Create product
            console.log("[create-product] Inserindo produto...");
            const { rows: productRows } = await query(
                `INSERT INTO products (store_id, name, description, price, old_price, category, stock, images)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [storeId, name, description, price, oldPrice, category, stock, JSON.stringify(imageUrls)]
            );

            const product = productRows[0];
            console.log("[create-product] Produto criado:", product.id);

            // Create video
            console.log("[create-product] Inserindo video...");
            const { rows: videoRows } = await query(
                `INSERT INTO videos (store_id, product_id, video_url, description)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [storeId, product.id, videoUrl, description]
            );
            console.log("[create-product] Video criado:", videoRows[0]?.id);

            return NextResponse.json({ product, video: videoRows[0] });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Não autorizado") {
            return NextResponse.json({ error: "Token inválido" }, { status: 401 });
        }
        console.error("[upload] ERRO COMPLETO:", error);
        console.error("[upload] Stack:", error instanceof Error ? error.stack : "no stack");
        return NextResponse.json({ error: `Erro no servidor: ${message}` }, { status: 500 });
    }
}
