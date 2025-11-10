// app/(protected)/settings/page.tsx
"use client";

import { useSession } from "@/components/SessionProvider";
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
    const router = useRouter();

    const { data: settings, error: settingsError } = useSWR<SettingsData>(
        "/api/settings",
        fetcher
    );

    const { data: credits } = useSWR<CreditsData>("/api/credits", fetcher);

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
        </main>
    );
}
