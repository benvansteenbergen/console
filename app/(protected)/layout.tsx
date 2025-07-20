'use client';
import { ReactNode } from 'react';
import { SessionProvider } from '@/components/SessionProvider';
import Sidebar from "@/components/Sidebar";
import AuthGate from "@/components/AuthGate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <AuthGate>
                {/* wrapper flex --------------------------------------------------- */}
                <div className="flex h-screen">
                    {/* desktop / mobile‑slide sidebar */}
                    <Sidebar />

                    {/* main scrollable area */}
                    <main className="flex-1 overflow-auto p-8 md:ml-60">{children}</main>
                </div>
            </AuthGate>
        </SessionProvider>
    );
}