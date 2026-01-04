'use client';
import { ReactNode } from 'react';
import { SessionProvider } from '@/components/SessionProvider';
import { NavigationProgressProvider } from '@/components/NavigationProgress';
import Sidebar from "@/components/Sidebar";
import AuthGate from "@/components/AuthGate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <AuthGate>
                <NavigationProgressProvider>
                    {/* wrapper flex --------------------------------------------------- */}
                    <div className="flex h-screen">
                        {/* desktop / mobile‑slide sidebar */}
                        <Sidebar />

                        {/* main scrollable area */}
                        <main className="flex-1 overflow-auto md:ml-10">{children}</main>
                    </div>
                </NavigationProgressProvider>
            </AuthGate>
        </SessionProvider>
    );
}