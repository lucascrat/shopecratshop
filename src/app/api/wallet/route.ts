import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch coins balance
        const accRes = await query("SELECT coins_balance FROM profiles WHERE id = $1", [user.id]);
        
        // Fetch all active coupons and user ownership
        const couponsRes = await query(`
            SELECT 
                c.id, c.code, c.discount_amount, c.discount_type, c.cost_in_coins, 
                c.min_purchase, c.valid_until,
                CASE WHEN uc.id IS NOT NULL THEN true ELSE false END as owned,
                uc.used
            FROM coupons c
            LEFT JOIN user_coupons uc ON c.id = uc.coupon_id AND uc.user_id = $1
            WHERE c.active = true
            ORDER BY c.cost_in_coins ASC, c.created_at DESC
        `, [user.id]);

        return NextResponse.json({
            coins: accRes.rows[0]?.coins_balance || 0,
            coupons: couponsRes.rows
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Redeem coupon
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { couponId } = body;

        if (!couponId) {
            return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
        }

        await query('BEGIN');
        
        try {
            // Check coupon
            const couponRes = await query(
                "SELECT id, cost_in_coins, active FROM coupons WHERE id = $1 FOR UPDATE", 
                [couponId]
            );
            
            const coupon = couponRes.rows[0];
            if (!coupon || !coupon.active) {
                await query('ROLLBACK');
                return NextResponse.json({ error: "Cupom inválido ou inativo" }, { status: 400 });
            }

            // Check if user already owns it
            const ownedRes = await query("SELECT id FROM user_coupons WHERE user_id = $1 AND coupon_id = $2", [user.id, couponId]);
            if (ownedRes.rowCount && ownedRes.rowCount > 0) {
                await query('ROLLBACK');
                return NextResponse.json({ error: "Você já resgatou este cupom" }, { status: 400 });
            }

            // Check balance
            const accRes = await query("SELECT coins_balance FROM profiles WHERE id = $1 FOR UPDATE", [user.id]);
            const currentCoins = accRes.rows[0].coins_balance;

            const cost = coupon.cost_in_coins || 0;

            if (currentCoins < cost) {
                await query('ROLLBACK');
                return NextResponse.json({ error: "Saldo de moedas insuficiente" }, { status: 400 });
            }

            // Deduct coins and award coupon
            if (cost > 0) {
                await query("UPDATE profiles SET coins_balance = coins_balance - $1 WHERE id = $2", [cost, user.id]);
            }

            await query(
                "INSERT INTO user_coupons (user_id, coupon_id) VALUES ($1, $2)",
                [user.id, couponId]
            );

            await query('COMMIT');

            return NextResponse.json({ success: true, newBalance: currentCoins - cost });

        } catch (e) {
            await query('ROLLBACK');
            throw e;
        }
        
    } catch (error) {
        console.error("Error redeeming coupon:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
