import StoreProfile from "@/components/StoreProfile";

// Next.js 15: params is a Promise, must be awaited
export default async function StorePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    return (
        <main className="max-w-[430px] mx-auto min-h-screen" style={{ backgroundColor: '#0d0d0d' }}>
            <StoreProfile username={username} />
        </main>
    );
}
