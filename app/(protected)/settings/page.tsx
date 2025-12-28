// app/(protected)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { useBranding } from "@/components/BrandingProvider";
import { useRouter } from "next/navigation";
import useSWR from "swr";

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
        linkedinPersonal: {
            connected: boolean;
            lastSynced?: string;
            slug?: string;
        };
        linkedinCompany: {
            connected: boolean;
            lastSynced?: string;
            slug?: string;
        };
        website: {
            connected: boolean;
            lastSynced?: string;
            url?: string;
        };
    };
}

interface CreditsData {
    plan: string;
    credits_used: number;
    plan_credits: number;
    over_limit: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SettingsPage() {
    const { loading: sessionLoading } = useSession();
    const branding = useBranding();
    const router = useRouter();

    const { data: settings, error: settingsError, mutate: mutateSettings } = useSWR<SettingsData>(
        "/api/settings",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    const { data: credits } = useSWR<CreditsData>(
        "/api/credits",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    // Connection states
    const [connectingLinkedinPersonal, setConnectingLinkedinPersonal] = useState(false);
    const [connectingLinkedinCompany, setConnectingLinkedinCompany] = useState(false);
    const [connectingWebsite, setConnectingWebsite] = useState(false);

    const [linkedinPersonalSlug, setLinkedinPersonalSlug] = useState('');
    const [linkedinCompanySlug, setLinkedinCompanySlug] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');

    const [showLinkedinPersonalInput, setShowLinkedinPersonalInput] = useState(false);
    const [showLinkedinCompanyInput, setShowLinkedinCompanyInput] = useState(false);
    const [showWebsiteInput, setShowWebsiteInput] = useState(false);

    useEffect(() => {
        document.title = `${branding.name} - Settings`;
    }, [branding.name]);

    if (sessionLoading || !settings) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading settings...</p>
                </div>
            </main>
        );
    }

    if (settingsError) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-red-600">Failed to load settings</p>
                </div>
            </main>
        );
    }

    const usagePercent = credits
        ? Math.min((credits.credits_used / credits.plan_credits) * 100, 100)
        : 0;

    const handleConnectLinkedinPersonal = async () => {
        if (!linkedinPersonalSlug.trim()) return;

        setConnectingLinkedinPersonal(true);
        try {
            const response = await fetch('/api/datasources/linkedin-personal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: linkedinPersonalSlug }),
            });

            if (response.ok) {
                await mutateSettings();
                setShowLinkedinPersonalInput(false);
                setLinkedinPersonalSlug('');
            }
        } catch (error) {
            console.error('Failed to connect LinkedIn personal:', error);
        } finally {
            setConnectingLinkedinPersonal(false);
        }
    };

    const handleConnectLinkedinCompany = async () => {
        if (!linkedinCompanySlug.trim()) return;

        setConnectingLinkedinCompany(true);
        try {
            const response = await fetch('/api/datasources/linkedin-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: linkedinCompanySlug }),
            });

            if (response.ok) {
                await mutateSettings();
                setShowLinkedinCompanyInput(false);
                setLinkedinCompanySlug('');
            }
        } catch (error) {
            console.error('Failed to connect LinkedIn company:', error);
        } finally {
            setConnectingLinkedinCompany(false);
        }
    };

    const handleConnectWebsite = async () => {
        if (!websiteUrl.trim()) return;

        setConnectingWebsite(true);
        try {
            const response = await fetch('/api/datasources/website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: websiteUrl }),
            });

            if (response.ok) {
                await mutateSettings();
                setShowWebsiteInput(false);
                setWebsiteUrl('');
            }
        } catch (error) {
            console.error('Failed to connect website:', error);
        } finally {
            setConnectingWebsite(false);
        }
    };

    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <button
                    onClick={() => router.push('/admin')}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                    Manage Agents
                </button>
            </div>

            {/* Two-column layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Organization Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <svg
                                className="h-6 w-6 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Organization</h2>
                    </div>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.client.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Domain</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.client.domain}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Member Since</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {new Date(settings.client.signedUpSince).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </dd>
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <dt className="text-xs font-medium text-gray-500 uppercase mb-2">Data Sources</dt>
                            <dd className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">LinkedIn Company</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.linkedinCompany.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.linkedinCompany.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">Company Website</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.website.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.website.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Your Account Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <svg
                                className="h-6 w-6 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Your Account</h2>
                    </div>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.user.email}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Role</dt>
                            <dd className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                    {settings.user.role}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Plan</dt>
                            <dd className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                    {settings.user.plan}
                                </span>
                            </dd>
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <dt className="text-xs font-medium text-gray-500 uppercase mb-2">Data Sources</dt>
                            <dd className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">LinkedIn Profile</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.linkedinPersonal.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.linkedinPersonal.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Active Tools Card */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <svg
                            className="h-6 w-6 text-purple-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Active Tools</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">📝</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeForms}</p>
                            <p className="text-xs text-gray-600">Forms</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">🤖</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeAgents}</p>
                            <p className="text-xs text-gray-600">Agents</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">⚡</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeAutomations}</p>
                            <p className="text-xs text-gray-600">Automations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage & Credits Card */}
            {credits && credits.credits_used !== undefined && credits.plan_credits !== undefined && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                            <svg
                                className="h-6 w-6 text-yellow-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Usage & Credits</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Credits Used</span>
                            <span className="font-semibold text-gray-900">
                                {(credits.credits_used || 0).toLocaleString()} / {(credits.plan_credits || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                                className={`h-full transition-all ${
                                    credits.over_limit
                                        ? "bg-red-600"
                                        : usagePercent > 80
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {credits.over_limit
                                ? "⚠️ You have exceeded your plan limit"
                                : `${Math.round(100 - usagePercent)}% remaining`}
                        </p>
                    </div>
                </div>
            )}

            {/* Data Sources Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <svg
                            className="h-6 w-6 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Data Sources</h2>
                </div>

                <div className="space-y-6">
                    {/* LinkedIn Personal */}
                    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">LinkedIn Profile</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your personal LinkedIn profile</p>
                            </div>
                            {settings.dataSources.linkedinPersonal.connected && settings.dataSources.linkedinPersonal.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.linkedinPersonal.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {!showLinkedinPersonalInput ? (
                            <button
                                onClick={() => setShowLinkedinPersonalInput(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                {settings.dataSources.linkedinPersonal.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={linkedinPersonalSlug}
                                        onChange={(e) => setLinkedinPersonalSlug(e.target.value)}
                                        placeholder="john-doe"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={connectingLinkedinPersonal}
                                    />
                                    <button
                                        onClick={handleConnectLinkedinPersonal}
                                        disabled={connectingLinkedinPersonal || !linkedinPersonalSlug.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {connectingLinkedinPersonal ? 'Connecting...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowLinkedinPersonalInput(false);
                                            setLinkedinPersonalSlug('');
                                        }}
                                        disabled={connectingLinkedinPersonal}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Enter your slug from linkedin.com/in/<span className="font-medium">your-slug-here</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* LinkedIn Company */}
                    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">LinkedIn Company Page</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your company LinkedIn page</p>
                            </div>
                            {settings.dataSources.linkedinCompany.connected && settings.dataSources.linkedinCompany.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.linkedinCompany.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {!showLinkedinCompanyInput ? (
                            <button
                                onClick={() => setShowLinkedinCompanyInput(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                {settings.dataSources.linkedinCompany.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={linkedinCompanySlug}
                                        onChange={(e) => setLinkedinCompanySlug(e.target.value)}
                                        placeholder="acme-corporation"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={connectingLinkedinCompany}
                                    />
                                    <button
                                        onClick={handleConnectLinkedinCompany}
                                        disabled={connectingLinkedinCompany || !linkedinCompanySlug.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {connectingLinkedinCompany ? 'Connecting...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowLinkedinCompanyInput(false);
                                            setLinkedinCompanySlug('');
                                        }}
                                        disabled={connectingLinkedinCompany}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Enter your company slug from linkedin.com/company/<span className="font-medium">company-name</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Company Website</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your company website</p>
                            </div>
                            {settings.dataSources.website.connected && settings.dataSources.website.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.website.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {!showWebsiteInput ? (
                            <button
                                onClick={() => setShowWebsiteInput(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                {settings.dataSources.website.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://yourcompany.com"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={connectingWebsite}
                                    />
                                    <button
                                        onClick={handleConnectWebsite}
                                        disabled={connectingWebsite || !websiteUrl.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {connectingWebsite ? 'Connecting...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowWebsiteInput(false);
                                            setWebsiteUrl('');
                                        }}
                                        disabled={connectingWebsite}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Enter your full website URL including https://
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
