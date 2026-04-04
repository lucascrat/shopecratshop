import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        // Get stats in parallel
        const [
            revenueResult,
            ordersResult,
            merchantsResult,
            customersResult,
            pendingWithdrawalsResult,
            todayStatsResult,
            recentOrdersResult
        ] = await Promise.all([
            // Total Revenue (Only PAID orders)
            query("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = 'paid'"),
            // Total Orders count (All non-cancelled)
            query("SELECT COUNT(*) as count FROM orders WHERE status != 'cancelled'"),
            // Total Merchants
            query("SELECT COUNT(*) as count FROM profiles WHERE role = 'merchant'"),
            // Total Customers
            query("SELECT COUNT(*) as count FROM profiles WHERE role = 'customer'"),
            // Pending withdrawals (case-insensitive check for status)
            query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawal_requests WHERE LOWER(status) IN ('pending', 'processing', 'pendente')`),
            // Today stats (Orders created in the last 24 hours or today)
            query(`
                SELECT 
                    COUNT(*) as orders, 
                    COALESCE(SUM(total), 0) as revenue 
                FROM orders 
                WHERE created_at >= CURRENT_DATE 
                  AND payment_status = 'paid'
            `),
            // Recent orders for activity feed
            query(`
                SELECT o.*, p.name as product_name, pr.full_name as customer_name
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN profiles pr ON o.user_id = pr.id
                ORDER BY o.created_at DESC
                LIMIT 10
            `),
        ]);

        console.log("[Dashboard API] Debug:", {
            rawRevenue: revenueResult.rows[0].total,
            rawOrders: ordersResult.rows[0].count,
            rawPending: pendingWithdrawalsResult.rows[0].total,
            rowCountOrders: ordersResult.rowCount
        });

        return NextResponse.json({
            totalRevenue: parseFloat(revenueResult.rows[0].total),
            totalOrders: parseInt(ordersResult.rows[0].count),
            totalMerchants: parseInt(merchantsResult.rows[0].count),
            totalCustomers: parseInt(customersResult.rows[0].count),
            pendingWithdrawalsAmount: parseFloat(pendingWithdrawalsResult.rows[0].total),
            pendingWithdrawalsCount: parseInt(pendingWithdrawalsResult.rows[0].count),
            todayRevenue: parseFloat(todayStatsResult.rows[0].revenue),
            todayOrders: parseInt(todayStatsResult.rows[0].orders),
            recentOrders: recentOrdersResult.rows
        });
    } catch (err: any) {
        const status = err.message.includes("autorizado") || err.message.includes("negado") ? 403 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
