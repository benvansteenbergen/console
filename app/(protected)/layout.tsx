'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { SessionProvider, useSession } from '@/components/SessionProvider';
import { useRouter } from 'next/navigation';

function AuthGate({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { loading, unauth } = useSession();

    if (loading) return null; // replace with spinner if desired
    if (unauth) {
        if (typeof window !== 'undefined') router.push('/login');
        return null;
    }
    return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <AuthGate>
                <div className="flex h-screen">
                    <aside className="w-56 border-r p-4 space-y-2">
                        <Link href="/dashboard" className="block font-semibold">
                            Dashboard
                        </Link>
                        <Link href="/executions" className="block hover:underline">
                            Executions
                        </Link>
                        <a
                            href="https://workflow.wingsuite.io"
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                        >
                            Open n8n ↗
                        </a>
                    </aside>
                    <main className="flex-1 overflow-auto p-8">{children}</main>
                </div>
            </AuthGate>
        </SessionProvider>
    );
}