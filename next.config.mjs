/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
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
                hostname: 'pub-e3ab5b2aa965482abff2ada469511215.r2.dev',
            },
            {
                protocol: 'https',
                hostname: 'v1.pinimg.com',
            },
            {
                protocol: 'https',
                hostname: '*.r2.dev',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'unsafe-none',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
