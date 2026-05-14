'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranding } from '@/components/BrandingProvider';

const tabs = [
  { href: '/radar', label: 'Feed' },
  { href: '/radar/sources', label: 'Sources' },
  { href: '/radar/scout', label: 'Scout' },
];

export default function RadarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();

  useEffect(() => {
    document.title = `${branding.name} - Radar`;
  }, [branding.name]);

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="border-b border-gray-200 px-6 pt-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Radar</h1>
        <nav className="flex gap-6">
          {tabs.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
