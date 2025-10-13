// apps/console/app/layout.tsx
import '@/globals.css';          // ✅ must come BEFORE the font import
import { Inter } from 'next/font/google';
import { headers } from "next/headers";
import { detectBranding } from "@/lib/branding";
import { BrandingProvider } from "@/components/BrandingProvider";

const inter = Inter({ subsets: ['latin'] });
export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const headerList = await headers();
    const host = headerList.get("host") || "console.wingsuite.io";
    const branding = detectBranding(host);

    return (
        <html lang="en" className={inter.className}>
        <body>
        <BrandingProvider value={branding}>
            {children}
        </BrandingProvider>
        </body>
        </html>
    );
}

export async function generateMetadata() {
    const headerList = await headers();
    const host = headerList.get("host") || "console.wingsuite.io";
    const branding = detectBranding(host);
    return {
        icons: {
            icon:      branding.logo,
            shortcut:  "/favicon-16x16.png",
            apple:     "/apple-icon.png",
        },
    };
}