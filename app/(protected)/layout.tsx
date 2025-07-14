'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { SessionProvider } from '@/components/SessionProvider';
import { useSession } from '@/components/SessionProvider';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    const { unauth, loading } = useSession();
    const router = useRouter();

    if (loading) return null; // optional spinner here
    if (unauth) {
        router.push('/login');
        return null;
    }

    return (
        <SessionProvider>
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
        </SessionProvider>
    );
}