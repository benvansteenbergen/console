import { ReactNode } from 'react';
import Link from 'next/link';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r p-4">
        <Link href="/dashboard" className="block font-semibold mb-4">
          Dashboard
        </Link>
        <a href="https://workflow.wingsuite.io" target="_blank" rel="noreferrer">
          Open n8n ↗
        </a>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}

