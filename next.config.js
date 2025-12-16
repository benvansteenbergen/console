/** @type {import('next').NextConfig} */
module.exports = {
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
    webpack: (config, { isServer }) => {
        // Ignore canvas module (used by pdfjs-dist but not needed in browser)
        if (!isServer) {
            config.resolve.alias.canvas = false;
        }
        config.externals = config.externals || [];
        config.externals.push({
            canvas: 'commonjs canvas',
        });
        return config;
    },
};