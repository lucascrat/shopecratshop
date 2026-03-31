-- ================================================
-- SHOPCRAT DATABASE SCHEMA - PostgreSQL 18
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. PROFILES
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'merchant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_username ON profiles(username);

-- ================================================
-- 2. STORES
-- ================================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_merchant ON stores(merchant_id);

-- ================================================
-- 3. PRODUCTS
-- ================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    old_price DECIMAL(10,2),
    category TEXT NOT NULL DEFAULT 'Moda',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('portuguese', name));

-- ================================================
-- 4. VIDEOS
-- ================================================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_store ON videos(store_id);
CREATE INDEX idx_videos_product ON videos(product_id);
CREATE INDEX idx_videos_created ON videos(created_at DESC);

-- ================================================
-- 5. LIKES
-- ================================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

CREATE INDEX idx_likes_video ON likes(video_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- ================================================
-- 6. BOOKMARKS
-- ================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

CREATE INDEX idx_bookmarks_video ON bookmarks(video_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ================================================
-- 7. COMMENTS
-- ================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_video ON comments(video_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- ================================================
-- 8. ORDERS
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    payment_method TEXT,
    shipping_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ================================================
-- 9. WALLETS (Carteira do Lojista)
-- ================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    total_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    pix_key TEXT,
    pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_merchant ON wallets(merchant_id);

-- ================================================
-- 10. WALLET TRANSACTIONS (Transações da Carteira)
-- ================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal', 'refund')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_order ON wallet_transactions(order_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- ================================================
-- 11. WITHDRAWAL REQUESTS (Solicitações de Saque)
-- ================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('automatic', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    admin_notes TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id),
    efi_transfer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_merchant ON withdrawal_requests(merchant_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawals_created ON withdrawal_requests(created_at DESC);

-- ================================================
-- 12. PAYMENT TRANSACTIONS (Transações de Pagamento - Efi Bank)
-- ================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('pix', 'card', 'pay_on_delivery', 'store_pickup')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
    efi_charge_id TEXT,
    efi_txid TEXT,
    pix_qrcode TEXT,
    pix_copy_paste TEXT,
    pix_expiration TIMESTAMPTZ,
    card_last_four TEXT,
    card_brand TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX idx_payment_tx_method ON payment_transactions(method);
CREATE INDEX idx_payment_tx_efi ON payment_transactions(efi_charge_id);

-- ================================================
-- 13. STORE SETTINGS (Configurações da Loja)
-- ================================================
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
    accept_pix BOOLEAN NOT NULL DEFAULT true,
    accept_card BOOLEAN NOT NULL DEFAULT true,
    accept_pay_on_delivery BOOLEAN NOT NULL DEFAULT false,
    accept_store_pickup BOOLEAN NOT NULL DEFAULT false,
    delivery_fee DECIMAL(10,2) DEFAULT 5.00,
    free_delivery_above DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_settings_store ON store_settings(store_id);

-- ================================================
-- 14. PLATFORM SETTINGS (Configurações da Plataforma - Admin)
-- ================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- ================================================
-- 15. COUPONS AND COINS
-- ================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    cost_in_coins INTEGER, -- Null means it cannot be bought with coins
    min_purchase DECIMAL(10,2),
    valid_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, coupon_id)
);

CREATE INDEX idx_user_coupons_user ON user_coupons(user_id);

CREATE TABLE IF NOT EXISTS video_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    coins_awarded INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, video_id) -- Only allow earning once per video per user
);

CREATE INDEX idx_video_rewards_user ON video_rewards(user_id);
CREATE INDEX idx_video_rewards_video ON video_rewards(video_id);

-- Default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
    ('platform_fee_percent', '3.00', 'Taxa da plataforma sobre cada venda (%)'),
    ('min_withdrawal', '1.00', 'Valor mínimo para saque (R$)'),
    ('auto_withdrawal_min', '100.00', 'Valor mínimo para saque automático via API Efi (R$)'),
    ('manual_withdrawal_deadline_hours', '24', 'Prazo máximo para processar saque manual (horas)'),
    ('efi_client_id', '', 'Client ID da API Efi Bank'),
    ('efi_client_secret', '', 'Client Secret da API Efi Bank'),
    ('efi_pix_key', '', 'Chave PIX da conta Efi Bank recebedora'),
    ('efi_sandbox', 'true', 'Modo sandbox da API Efi'),
    ('card_fee_1x', '2.99', 'Taxa cartão 1x (%)'),
    ('card_fee_2x', '4.49', 'Taxa cartão 2x (%)'),
    ('card_fee_3x', '5.49', 'Taxa cartão 3x (%)'),
    ('card_fee_4x', '6.49', 'Taxa cartão 4x (%)'),
    ('card_fee_5x', '7.49', 'Taxa cartão 5x (%)'),
    ('card_fee_6x', '8.49', 'Taxa cartão 6x (%)'),
    ('card_fee_7x', '9.99', 'Taxa cartão 7x (%)'),
    ('card_fee_8x', '10.99', 'Taxa cartão 8x (%)'),
    ('card_fee_9x', '11.99', 'Taxa cartão 9x (%)'),
    ('card_fee_10x', '12.99', 'Taxa cartão 10x (%)'),
    ('card_fee_11x', '13.99', 'Taxa cartão 11x (%)'),
    ('card_fee_12x', '14.99', 'Taxa cartão 12x (%)'),
    ('coin_reward_amount', '5', 'Quantidade de moedas ganhas por assistir um vídeo'),
    ('coin_reward_seconds', '5', 'Segundos necessários de vídeo para ganhar as moedas')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- Update profiles to support admin role
-- ================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'merchant', 'admin'));

-- ================================================
-- Update orders to support new payment methods
-- ================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

-- ================================================
-- DONE
-- ================================================
SELECT 'Schema criado com sucesso!' AS resultado;
