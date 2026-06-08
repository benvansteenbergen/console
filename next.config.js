/** @type {import('next').NextConfig} */
module.exports = {
    experimental: {
        // Lower peak memory during the production webpack build.
        // The Railway builder hit SIGBUS (out-of-memory) on `next build`.
        webpackMemoryOptimizations: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "api.dicebear.com",
                pathname: "/7.x/**",
            },
        ],
    },
};