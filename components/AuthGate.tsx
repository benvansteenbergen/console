"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

export default function AuthGate({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { loading, unauth } = useSession();

    /* redirect only as a side‑effect */
    useEffect(() => {
        if (!loading && unauth) router.replace("/login");
    }, [loading, unauth, router]);

    /* loading state */
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
            </div>
        );
    }

    /* unauth → the useEffect will navigate; render nothing */
    if (unauth) return null;

    /* auth OK */
    return <>{children}</>;
}