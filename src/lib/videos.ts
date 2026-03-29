import { apiFetch } from "./api";
import type { VideoFeedItem } from "./types";

export async function getVideos(page: number = 0, userId?: string): Promise<{ videos: VideoFeedItem[]; hasMore: boolean }> {
    try {
        const data = await apiFetch<{ videos: any[]; hasMore: boolean }>(
            `/api/videos?page=${page}`
        );

        const videos: VideoFeedItem[] = (data.videos || []).map((v: any) => ({
            id: v.id,
            url: v.video_url,
            merchant: {
                username: v.store?.username || v.store?.profiles?.username || "loja",
                storeName: v.store?.name || v.store?.username || "Loja",
                avatar: v.store?.logo_url || v.store?.profiles?.avatar_url || "",
            },
            description: v.description,
            product: v.products ? {
                id: v.products.id,
                name: v.products.name,
                price: parseFloat(String(v.products.price || 0)),
                oldPrice: v.products.old_price ? parseFloat(String(v.products.old_price)) : undefined,
                image: (v.products.images || [])[0] || "",
            } : {
                id: "",
                name: "",
                price: 0,
                image: "",
            },
            stats: {
                likes: v.likes_count || 0,
                comments: v.comments_count || 0,
                shares: 0,
                bookmarks: v.bookmarks_count || 0,
            },
            userLiked: v.is_liked || false,
            userBookmarked: v.is_bookmarked || false,
        }));

        return { videos, hasMore: data.hasMore };
    } catch (error) {
        console.error("Error fetching videos:", error);
        return { videos: [], hasMore: false };
    }
}

export async function toggleLike(videoId: string, userId: string): Promise<boolean> {
    const data = await apiFetch<{ liked: boolean }>(`/api/videos/${videoId}/like`, {
        method: "POST",
    });
    return data.liked;
}

export async function toggleBookmark(videoId: string, userId: string): Promise<boolean> {
    const data = await apiFetch<{ bookmarked: boolean }>(`/api/videos/${videoId}/bookmark`, {
        method: "POST",
    });
    return data.bookmarked;
}

export async function addComment(videoId: string, userId: string, content: string) {
    const data = await apiFetch<{ comment: any }>(`/api/videos/${videoId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
    });
    return data.comment;
}

export async function getComments(videoId: string) {
    try {
        const data = await apiFetch<{ comments: any[] }>(`/api/videos/${videoId}/comments`);
        return data.comments || [];
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}
