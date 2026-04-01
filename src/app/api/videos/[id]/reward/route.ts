import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getUserFromRequest(request);
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const videoId = resolvedParams.id;
        if (!videoId) {
            return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
        }

        // Get platform settings for rewards
        const settingsRes = await query(`
            SELECT key, value 
            FROM platform_settings 
            WHERE key IN ('coin_reward_amount', 'coin_reward_seconds')
        `);

        // Default values if not set
        let rewardAmount = 5;
        let rewardSeconds = 5;

        settingsRes.rows.forEach(row => {
            if (row.key === 'coin_reward_amount') rewardAmount = parseInt(row.value) || 5;
            if (row.key === 'coin_reward_seconds') rewardSeconds = parseInt(row.value) || 5;
        });

        // Ensure user hasn't already collected the reward for this video
        const checkRes = await query(
            "SELECT id FROM video_rewards WHERE user_id = $1 AND video_id = $2",
            [user.id, videoId]
        );

        if (checkRes.rowCount && checkRes.rowCount > 0) {
            return NextResponse.json({ error: "Reward already collected for this video" }, { status: 400 });
        }

        // Start transaction
        await query('BEGIN');

        try {
            // 1. Insert into video_rewards (acts as a lock due to UNIQUE constraint)
            await query(
                "INSERT INTO video_rewards (user_id, video_id, coins_awarded) VALUES ($1, $2, $3)",
                [user.id, videoId, rewardAmount]
            );

            // 2. Increment coins balance in profiles
            const updateRes = await query(
                "UPDATE profiles SET coins_balance = coins_balance + $1 WHERE id = $2 RETURNING coins_balance",
                [rewardAmount, user.id]
            );

            await query('COMMIT');

            const newBalance = updateRes.rows[0].coins_balance;

            return NextResponse.json({
                success: true,
                awarded: rewardAmount,
                newBalance
            });
        } catch (e: any) {
            await query('ROLLBACK');
            
            // If the insert failed due to duplicate key, it means they already collected it concurrently
            if (e.code === '23505') {
                return NextResponse.json({ error: "Reward already collected for this video" }, { status: 400 });
            }
            throw e;
        }

    } catch (error) {
        console.error("Error claiming reward:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
