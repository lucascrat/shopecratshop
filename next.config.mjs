/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'pub-855d004e6f2d4b47804b1941f9b5cc75.r2.dev',
            },
            {
                protocol: 'https',
                hostname: 'v1.pinimg.com',
            }
        ],
    },
};

export default nextConfig;
