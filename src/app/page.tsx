import VideoFeed from "@/components/VideoFeed";
import BottomNav from "@/components/BottomNav";

export default function Home() {
    return (
        <main className="h-screen w-full max-w-[430px] mx-auto bg-black shadow-2xl relative">
            <VideoFeed />
            <BottomNav />
        </main>
    );
}
