import type { Branding } from "@/components/BrandingProvider";

export const BRANDING: Record<string, Branding> = {
    wingsuite: {
        domain: "console.wingsuite.io",
        name: "Wingsuite",
        logo: "/wingsuite/logo.svg",
        loginImage: "/wingsuite/login.jpg",
        loginBg: "#ffffff",
        primaryColor: "#0c1d40",
    },
    emotion: {
        domain: "emotion.wingsuite.io",
        name: "Emotion Digital",
        logo: "/emotion/logo.svg",
        loginImage: "/wingsuite/login.png",
        loginBg: "#32a852",
        primaryColor: "#2c3e50",
    },
};

export function detectBranding(hostname: string | undefined): Branding {
    if (!hostname) return BRANDING.wingsuite;

    return (
        Object.values(BRANDING).find((b) => hostname.includes(b.domain)) ??
        BRANDING.wingsuite
    );
}