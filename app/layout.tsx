// apps/console/app/layout.tsx
import '@/globals.css';          // ✅ must come BEFORE the font import
import { headers } from "next/headers";
import { detectBranding } from "@/lib/branding";
import { BrandingProvider } from "@/components/BrandingProvider"; // ✅ not a client file

export interface Branding {
    name: string;
    domain: string;
    logo: string;
    loginImage: string;
    loginBg: string;
    primaryColor: string;
}


export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const headerList = await headers();
    const host = headerList.get("host") || "console.wingsuite.io";
    const branding = detectBranding(host);

    return (
        <html lang="en">
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
        title: {
            template: `${branding.name} - %s`,
            default: branding.name,
        },
        icons: {
            icon:      branding.logo,
            shortcut:  "/favicon-16x16.png",
            apple:     "/apple-icon.png",
        },
    };
}