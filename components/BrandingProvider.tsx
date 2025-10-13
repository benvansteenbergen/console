// components/BrandingProvider.tsx
"use client";

import { createContext, useContext } from "react";

export interface Branding {
    name: string;
    logo: string;
    domain: string;
    loginImage: string;
    loginBg: string;
    primaryColor: string;
}

export const BrandingContext = createContext<Branding | null>(null);

export const useBranding = () => {
    const ctx = useContext(BrandingContext);
    if (!ctx) throw new Error("useBranding must be used inside a BrandingProvider");
    return ctx;
};

export const BrandingProvider = BrandingContext.Provider;