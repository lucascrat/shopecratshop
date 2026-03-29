// ==========================================
// Tipos compartilhados do Shopcrat
// ==========================================

// --- Database / Supabase types ---

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    role: "customer" | "merchant" | "admin";
    created_at: string;
}

export interface Store {
    id: string;
    name: string;
    description: string;
    logo_url: string;
    owner_id: string;
    merchant_id: string;
    created_at: string;
}

export interface Product {
    id: string;
    store_id: string;
    name: string;
    description: string;
    price: number;
    old_price?: number;
    category: string;
    stock: number;
    images: string[];
    created_at: string;
}

export interface Video {
    id: string;
    store_id: string;
    product_id: string;
    video_url: string;
    description: string;
    created_at: string;
}

export interface Like {
    id: string;
    video_id: string;
    user_id: string;
    created_at: string;
}

export interface Bookmark {
    id: string;
    video_id: string;
    user_id: string;
    created_at: string;
}

export interface Comment {
    id: string;
    video_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profile?: Pick<Profile, "username" | "avatar_url">;
}

export interface Order {
    id: string;
    user_id: string;
    product_id: string;
    store_id: string;
    quantity: number;
    total: number;
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
    payment_method: string;
    shipping_address: string;
    created_at: string;
}

// --- Frontend / UI types ---

export interface VideoFeedItem {
    id: string;
    url: string;
    merchant: {
        username: string;
        storeName: string;
        avatar: string;
    };
    description: string;
    product: {
        id: string;
        name: string;
        price: number;
        oldPrice?: number;
        image: string;
    };
    stats: {
        likes: number;
        comments: number;
        shares: number;
        bookmarks: number;
    };
    userLiked: boolean;
    userBookmarked: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    hasMore: boolean;
    nextCursor?: string;
}

export interface DashboardStats {
    totalSales: number;
    totalOrders: number;
    totalViews: number;
    recentProducts: Array<Product & { salesCount: number }>;
}

export interface CreateProductPayload {
    name: string;
    description: string;
    price: string;
    category: string;
    stock: string;
    videoFile: File;
    imageFiles: File[];
    storeId: string;
}

// ==========================================
// Admin & Wallet Types
// ==========================================

export interface Wallet {
    id: string;
    merchant_id: string;
    balance: number;
    total_received: number;
    total_withdrawn: number;
    pix_key: string | null;
    pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    order_id: string | null;
    type: "credit" | "debit" | "withdrawal" | "refund";
    amount: number;
    description: string;
    status: "pending" | "completed" | "failed" | "cancelled";
    created_at: string;
}

export interface WithdrawalRequest {
    id: string;
    wallet_id: string;
    merchant_id: string;
    amount: number;
    pix_key: string;
    pix_key_type: string;
    method: "automatic" | "manual";
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    admin_notes: string | null;
    processed_at: string | null;
    processed_by: string | null;
    efi_transfer_id: string | null;
    created_at: string;
    // joined fields
    merchant_name?: string;
    merchant_username?: string;
    store_name?: string;
}

export interface PaymentTransaction {
    id: string;
    order_id: string;
    method: "pix" | "card" | "pay_on_delivery" | "store_pickup";
    amount: number;
    status: "pending" | "processing" | "paid" | "failed" | "refunded" | "cancelled";
    efi_charge_id: string | null;
    efi_txid: string | null;
    pix_qrcode: string | null;
    pix_copy_paste: string | null;
    paid_at: string | null;
    created_at: string;
}

export interface StoreSettings {
    id: string;
    store_id: string;
    accept_pix: boolean;
    accept_card: boolean;
    accept_pay_on_delivery: boolean;
    accept_store_pickup: boolean;
    delivery_fee: number;
    free_delivery_above: number | null;
}

export interface AdminDashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalMerchants: number;
    totalCustomers: number;
    pendingWithdrawals: number;
    pendingWithdrawalsAmount: number;
    todayOrders: number;
    todayRevenue: number;
    recentOrders: Array<Order & {
        product_name?: string;
        customer_name?: string;
        store_name?: string;
    }>;
    recentWithdrawals: WithdrawalRequest[];
}
