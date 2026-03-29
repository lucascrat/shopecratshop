import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        // Parallel queries for dashboard stats
        const [
            revenueResult,
            ordersResult,
            merchantsResult,
            customersResult,
            pendingWithdrawalsResult,
            todayResult,
            recentOrdersResult,
            recentWithdrawalsResult,
        ] = await Promise.all([
            // Total revenue (paid orders)
            query(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'`),
            // Total orders
            query(`SELECT COUNT(*) as count FROM orders`),
            // Total merchants
            query(`SELECT COUNT(*) as count FROM profiles WHERE role = 'merchant'`),
            // Total customers
            query(`SELECT COUNT(*) as count FROM profiles WHERE role = 'customer'`),
            // Pending withdrawals
            query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawal_requests WHERE status IN ('pending', 'processing')`),
            // Today stats
            query(`SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'`),
            // Recent orders with details
            query(`
                SELECT o.*,
                    p.name as product_name,
                    pr.full_name as customer_name,
                    pr.username as customer_username,
                    s.name as store_name
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN profiles pr ON o.user_id = pr.id
                LEFT JOIN stores s ON o.store_id = s.id
                ORDER BY o.created_at DESC
                LIMIT 10
            `),
            // Recent withdrawals
            query(`
                SELECT wr.*,
                    pr.full_name as merchant_name,
                    pr.username as merchant_username,
                    s.name as store_name
                FROM withdrawal_requests wr
                LEFT JOIN profiles pr ON wr.merchant_id = pr.id
                LEFT JOIN stores s ON s.merchant_id = wr.merchant_id
                ORDER BY wr.created_at DESC
                LIMIT 10
            `),
        ]);

        return NextResponse.json({
            totalRevenue: parseFloat(revenueResult.rows[0].total),
            totalOrders: parseInt(ordersResult.rows[0].count),
            totalMerchants: parseInt(merchantsResult.rows[0].count),
            totalCustomers: parseInt(customersResult.rows[0].count),
            pendingWithdrawals: parseInt(pendingWithdrawalsResult.rows[0].count),
            pendingWithdrawalsAmount: parseFloat(pendingWithdrawalsResult.rows[0].total),
            todayOrders: parseInt(todayResult.rows[0].orders),
            todayRevenue: parseFloat(todayResult.rows[0].revenue),
            recentOrders: recentOrdersResult.rows,
            recentWithdrawals: recentWithdrawalsResult.rows,
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
