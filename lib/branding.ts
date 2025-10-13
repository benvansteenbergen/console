// lib/branding.ts
export interface Branding {
    name: string;
    domain: string;
    logo: string;
    loginImage: string;
    loginBg: string;
    primaryColor: string;
}
export const Branding = {
    wingsuite: {
        domain: "console.wingsuite.io",
        name: "Wingsuite",
        logo: "/wingsuite/logo.svg",
        loginImage: "/wingsuite/login.jpg",
        loginBg: "#ffffff",
        primaryColor: "#0c1d40",
    },
    moonlight: {
        domain: "emotion.wingsuite.io",
        name: "Emotion Digital",
        logo: "/emotion/logo.svg",
        loginImage: "/wingsuite/login.png",
        loginBg: "#32a852",
        primaryColor: "#2c3e50",
    },
};

export function detectBranding(hostname: string | undefined): Branding {
    if (!hostname) return Branding.wingsuite;

    return (
        Object.values(Branding).find((b) => hostname.includes(b.domain)) ??
        Branding.wingsuite
    );
}