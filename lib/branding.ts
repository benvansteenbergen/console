import type { Branding } from "@/components/BrandingProvider";

export const BRAND: Record<string, Branding> = {
    wingsuite: {
        domain: "console.wingsuite.io",
        name: "Wingsuite",
        logo: "/wingsuite/logo.svg",
        loginImage: "/wingsuite/hero.jpg",
        loginBg: "#ffffff",
        primaryColor: "#0c1d40",
    },
    emotion: {
        domain: "emotion.wingsuite.io",
        name: "Emotion Digital",
        logo: "/emotion/logo.svg",
        loginImage: "/wingsuite/hero.png",
        loginBg: "#32a852",
        primaryColor: "#2c3e50",
    },
};

export function detectBranding(hostname: string | undefined): Branding {
    if (!hostname) return BRAND.wingsuite;
    return (
        Object.values(BRAND).find((b) => hostname.includes(b.domain)) ??
        BRAND.wingsuite
    );
}