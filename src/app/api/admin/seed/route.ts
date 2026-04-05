import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * POST /api/admin/seed
 * Populate database with demo data
 * WARNING: Only for development. Requires SEED_PASSWORD env var.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password, force = false } = body;

        // Safety check
        if (password !== process.env.SEED_PASSWORD) {
            return NextResponse.json({ error: "Invalid seed password" }, { status: 401 });
        }

        // Check if all expected merchants exist
        const existing = await query("SELECT COUNT(*) as count FROM profiles WHERE role = 'merchant' AND username IN ('loja1', 'loja2', 'loja3')");
        const seededMerchants = parseInt(existing.rows[0].count);

        if (seededMerchants >= 3 && !force) {
            return NextResponse.json({
                message: "Database fully seeded with all demo merchants.",
                existingMerchants: seededMerchants,
            });
        }

        if (force) {
            // Clear existing data if force=true
            console.log("🗑️  Force seeding enabled. Clearing existing data...");
            try {
                // Use TRUNCATE with CASCADE for PostgreSQL
                await query("TRUNCATE likes CASCADE");
                await query("TRUNCATE bookmarks CASCADE");
                await query("TRUNCATE comments CASCADE");
                await query("TRUNCATE videos CASCADE");
                await query("TRUNCATE orders CASCADE");
                await query("TRUNCATE products CASCADE");
                await query("TRUNCATE stores CASCADE");
                await query("TRUNCATE wallets CASCADE");
                await query("DELETE FROM profiles WHERE role IN ('merchant', 'customer')");
                console.log("✓ Cleared existing data");
            } catch (err) {
                console.error("Warning: Could not clear all data:", err);
                // Continue anyway - might be partially cleared
            }
        }

        // Create 3 demo merchants (or fetch existing ones)
        const merchants = [];
        for (let i = 1; i <= 3; i++) {
            // Check if merchant already exists
            const existingMerchant = await query(
                "SELECT id FROM profiles WHERE username = $1",
                [`loja${i}`]
            );

            let merchantId;
            if (existingMerchant.rows.length > 0) {
                merchantId = existingMerchant.rows[0].id;
                console.log(`✓ Merchant loja${i} already exists: ${merchantId}`);
            } else {
                const profileRes = await query(
                    `INSERT INTO profiles (full_name, username, role, avatar_url)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [`Loja ${i}`, `loja${i}`, "merchant", `https://i.pravatar.cc/150?img=${i}`]
                );
                merchantId = profileRes.rows[0].id;
                console.log(`✓ Created merchant loja${i}: ${merchantId}`);
            }
            merchants.push(merchantId);

            // Create store if it doesn't exist
            let storeId;
            const existingStore = await query(
                "SELECT id FROM stores WHERE merchant_id = $1",
                [merchantId]
            );
            if (existingStore.rows.length > 0) {
                storeId = existingStore.rows[0].id;
            } else {
                const storeRes = await query(
                    `INSERT INTO stores (merchant_id, name, description, username)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [merchantId, `Loja Premium ${i}`, `Loja de qualidade com produtos selecionados`, `loja${i}`]
                );
                storeId = storeRes.rows[0].id;
            }

            // Create wallet if it doesn't exist
            const existingWallet = await query(
                "SELECT id FROM wallets WHERE merchant_id = $1",
                [merchantId]
            );
            if (existingWallet.rows.length === 0) {
                await query(
                    `INSERT INTO wallets (merchant_id, balance, total_received)
                     VALUES ($1, $2, $3)`,
                    [merchantId, Math.random() * 5000, Math.random() * 50000]
                );
            }

            // Check if products already exist for this store
            const existingProducts = await query(
                `SELECT COUNT(*) as count FROM products WHERE store_id = $1`,
                [storeId]
            );

            if (parseInt(existingProducts.rows[0].count) === 0) {
                // Create 3 products per merchant
                for (let j = 1; j <= 3; j++) {
                    const productRes = await query(
                        `INSERT INTO products (store_id, name, description, price, old_price, stock, category, images)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         RETURNING id`,
                        [
                            storeId,
                            `Produto ${j} - Loja ${i}`,
                            `Descrição do produto ${j} da loja ${i}. Qualidade premium, entrega rápida.`,
                            Math.random() * 500 + 10,
                            Math.random() > 0.5 ? Math.random() * 600 + 50 : null,
                            Math.floor(Math.random() * 100),
                            ["Fashion", "Beauty", "Tech", "Home", "Sports"][Math.floor(Math.random() * 5)],
                            JSON.stringify([`https://picsum.photos/400/500?random=${Math.random()}`]),
                        ]
                    );

                    const productId = productRes.rows[0].id;

                    // Create video for product
                    const videoRes = await query(
                        `INSERT INTO videos (store_id, product_id, video_url, description)
                         VALUES ($1, $2, $3, $4)
                         RETURNING id`,
                        [
                            storeId,
                            productId,
                            `https://media.cdnjs.com/video/shorts/${Math.random().toString(36).substring(7)}.mp4`,
                            `Veja este produto incrível! ${j}`,
                        ]
                    );

                    const videoId = videoRes.rows[0].id;

                    // Add likes to videos
                    const likes = Math.floor(Math.random() * 500) + 50;
                    for (let k = 0; k < Math.min(likes, 10); k++) {
                        try {
                            await query(
                                `INSERT INTO likes (video_id, user_id)
                                 VALUES ($1, (SELECT id FROM profiles LIMIT 1 OFFSET $2))`,
                                [videoId, k]
                            );
                        } catch {
                            // User might not exist
                        }
                    }
                }
                console.log(`✓ Created 3 products for loja${i}`);
            }
        }

        // Create 5 demo customers (or fetch existing ones)
        for (let i = 1; i <= 5; i++) {
            // Check if customer already exists
            const existingCustomer = await query(
                "SELECT id FROM profiles WHERE username = $1",
                [`cliente${i}`]
            );

            let customerId;
            if (existingCustomer.rows.length > 0) {
                customerId = existingCustomer.rows[0].id;
            } else {
                const profileRes = await query(
                    `INSERT INTO profiles (full_name, username, role, avatar_url)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [`Cliente ${i}`, `cliente${i}`, "customer", `https://i.pravatar.cc/150?img=${100 + i}`]
                );
                customerId = profileRes.rows[0].id;
            }

            // Create some orders
            const orderCount = Math.floor(Math.random() * 5) + 1;
            for (let o = 0; o < orderCount; o++) {
                try {
                    const randomMerchantId = merchants[Math.floor(Math.random() * merchants.length)];
                    const storeRes = await query("SELECT id FROM stores WHERE merchant_id = $1", [randomMerchantId]);
                    if (storeRes.rows.length === 0) continue;
                    const storeId = storeRes.rows[0].id;

                    // Get a random product from that store
                    const productRes = await query(
                        "SELECT id FROM products WHERE store_id = $1 LIMIT 1",
                        [storeId]
                    );
                    if (productRes.rows.length === 0) continue;
                    const productId = productRes.rows[0].id;

                    const orderTotal = Math.random() * 500 + 20;
                    await query(
                        `INSERT INTO orders (user_id, product_id, store_id, quantity, total, status, payment_method, shipping_address)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            customerId,
                            productId,
                            storeId,
                            Math.floor(Math.random() * 3) + 1,
                            orderTotal,
                            ["pending", "confirmed", "shipped", "delivered"][Math.floor(Math.random() * 4)],
                            ["pix", "card", "pay_on_delivery"][Math.floor(Math.random() * 3)],
                            `Rua ${["Santos", "Paulista", "Brasil", "América"][Math.floor(Math.random() * 4)]}, ${Math.floor(Math.random() * 2000) + 1}`,
                        ]
                    );
                } catch (err) {
                    // Order creation might fail, continue
                    console.log(`Warning: Could not create order for customer ${i}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: "Database seeded successfully!",
            merchants: merchants.length,
            customers: 5,
        });
    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
