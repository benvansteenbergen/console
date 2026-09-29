'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranding } from '@/components/BrandingProvider';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/radar', label: 'Feed' },
  { href: '/radar/saved', label: 'Saved' },
  { href: '/radar/scouts', label: 'Scouts' },
];

export default function RadarLayout({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const pathname = usePathname();

  useEffect(() => {
    document.title = `${branding.name} - Radar`;
  }, [branding.name]);

  const activeHref = TABS.slice(1).find((t) => pathname.startsWith(t.href))?.href ?? '/radar';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end gap-8 border-b border-gray-200 px-6 pt-6">
        <h1 className="pb-3 text-2xl font-bold text-gray-900">Radar</h1>
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const active = tab.href === activeHref;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
                  active ? 'text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
                style={active ? { borderColor: branding.primaryColor } : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
