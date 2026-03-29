import StoreProfile from "@/components/StoreProfile";

export default function StorePage({ params }: { params: { username: string } }) {
    return (
        <main className="max-w-[430px] mx-auto min-h-screen bg-background-dark">
            <StoreProfile username={params.username} />
        </main>
    );
}
