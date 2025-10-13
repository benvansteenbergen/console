// components/BrandingProvider.tsx
"use client";

import { createContext, useContext } from "react";

export interface Branding {
    name: string;
    domain: string;
    logo: string;
    loginImage: string;
    loginBg: string;
    primaryColor: string;
}

/* the actual context + hook */
export const BrandingContext = createContext<Branding | null>(null);

export const useBranding = () => {
    const ctx = useContext(BrandingContext);
    if (!ctx) throw new Error("useBranding must be used inside BrandingProvider");
    return ctx;
};

/* a client‑only wrapper so server code never touches createContext */
export function BrandingProvider({
                                     value,
                                     children,
                                 }: {
    value: Branding;
    children: React.ReactNode;
}) {
    return (
        <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
    );
}