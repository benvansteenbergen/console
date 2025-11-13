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
        domain: "ai.emotion.nl",
        name: "Emotion AI Studio",
        logo: "/emotion/logo.svg",
        loginImage: "/emotion/hero.png",
        loginBg: "#03c38b",
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