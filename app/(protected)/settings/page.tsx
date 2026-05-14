'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/components/SessionProvider';
import { useBranding } from '@/components/BrandingProvider';
import useSWR from 'swr';
import PageLoader from '@/components/ui/PageLoader';

interface SettingsData {
  client: {
    name: string;
    domain: string;
    signedUpSince: string;
  };
  user: {
    email: string;
    role: string;
    plan: string;
  };
  counts: {
    activeForms: number;
    activeAgents: number;
    activeAutomations: number;
  };
  dataSources: {
    linkedinPersonal: { connected: boolean };
    linkedinCompany: { connected: boolean };
    website: { connected: boolean; url?: string };
  };
}

interface CreditsData {
  plan: string;
  credits_used: number;
  plan_credits: number;
  over_limit: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { loading: sessionLoading } = useSession();
  const branding = useBranding();
  const [version, setVersion] = useState<'v1' | 'v2'>('v1');

  useEffect(() => {
    const stored = localStorage.getItem('wingsuite_version');
    if (stored === 'v2') setVersion('v2');
  }, []);

  const { data: settings, error: settingsError } = useSWR<SettingsData>(
    '/api/settings',
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  const { data: credits } = useSWR<CreditsData>(
    '/api/credits',
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  useEffect(() => {
    document.title = `${branding.name} - Settings`;
  }, [branding.name]);

  if (sessionLoading || !settings) {
    return <PageLoader />;
  }

  if (settingsError) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-red-600">Failed to load settings</p>
      </main>
    );
  }

  const usagePercent = credits
    ? Math.min((credits.credits_used / credits.plan_credits) * 100, 100)
    : 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Version toggle */}
      {version === 'v1' ? (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            Wingsuite 2.0 beschikbaar
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Probeer de nieuwe versie met Brand Identity, Content Studio en meer.
          </p>
          <button
            onClick={() => {
              localStorage.setItem('wingsuite_version', 'v2');
              window.location.href = '/profile';
            }}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-purple-700"
          >
            Activeer Wingsuite 2.0
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Je gebruikt Wingsuite 2.0
          </h2>
          <button
            onClick={() => {
              localStorage.setItem('wingsuite_version', 'v1');
              window.location.href = '/dashboard';
            }}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Terug naar klassieke versie
          </button>
        </div>
      )}

      {/* Account */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Account</h2>
        <dl className="space-y-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900">{settings.user.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Role</dt>
            <dd>
              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {settings.user.role}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Organization</dt>
            <dd className="text-sm text-gray-900">{settings.client.name}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Domain</dt>
            <dd className="text-sm text-gray-900">{settings.client.domain}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Member since</dt>
            <dd className="text-sm text-gray-900">
              {new Date(settings.client.signedUpSince).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Plan & Credits */}
      {credits && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Plan & Credits</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                {credits.plan}
              </span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-500">Credits used</span>
                <span className={`font-medium ${credits.over_limit ? 'text-red-600' : 'text-gray-900'}`}>
                  {credits.credits_used} / {credits.plan_credits}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    credits.over_limit ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            {credits.over_limit && (
              <p className="text-xs text-red-600">
                You have exceeded your plan limit. Contact your account manager to upgrade.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Language */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Language</h2>
        <p className="text-sm text-gray-500">
          Content language is configured in your brand profile and applied automatically to all content creation.
        </p>
        <a
          href="/profile"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Go to Brand Identity
        </a>
      </div>
    </main>
  );
}
