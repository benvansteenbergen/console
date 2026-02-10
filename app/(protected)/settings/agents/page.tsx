// app/(protected)/settings/agents/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "@/components/SessionProvider";
import PageLoader from "@/components/ui/PageLoader";

interface Agent {
    id: string;
    name: string;
    type: 'chat' | 'form' | 'automation';
    url: string;
    avatar?: string;
    enabled: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AgentsPage() {
    const router = useRouter();
    const { loading: sessionLoading } = useSession();
    const [toggling, setToggling] = useState<string | null>(null);

    const { data: agents, error } = useSWR<Agent[]>(
        '/api/portal-agents',
        fetcher
    );

    const handleToggle = async (agentId: string, currentEnabled: boolean) => {
        setToggling(agentId);
        try {
            const res = await fetch('/api/settings/toggle-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, enabled: !currentEnabled }),
            });

            if (res.ok) {
                // Optimistically update the UI
                mutate('/api/portal-agents');
            } else {
                alert('Failed to toggle agent status');
            }
        } catch (error) {
            console.error('Toggle error:', error);
            alert('Failed to toggle agent status');
        } finally {
            setToggling(null);
        }
    };

    if (sessionLoading) {
        return <PageLoader />;
    }

    if (error) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-red-600">Failed to load agents</p>
                </div>
            </main>
        );
    }

    if (!agents) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading agents...</p>
                </div>
            </main>
        );
    }

    // Group agents by type
    const forms = agents.filter(a => a.type === 'form');
    const agentsList = agents.filter(a => a.type === 'chat');
    const automations = agents.filter(a => a.type === 'automation');

    const renderAgentCard = (agent: Agent) => {
        const isToggling = toggling === agent.id;
        const iconByType = {
            form: '📝',
            chat: '🤖',
            automation: '⚡',
        };

        return (
            <div
                key={agent.id}
                className={`rounded-xl border p-4 shadow-sm transition-all ${
                    agent.enabled
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 bg-gray-50 opacity-60'
                }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{iconByType[agent.type]}</span>
                            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                            {agent.enabled && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    Active
                                </span>
                            )}
                        </div>
                        <code className="text-xs text-gray-500 bg-white px-2 py-1 rounded block mb-2">
                            {agent.url}
                        </code>
                        <div className="text-xs text-gray-600">
                            Type: <span className="font-medium capitalize">{agent.type}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle(agent.id, agent.enabled)}
                        disabled={isToggling}
                        className={`ml-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                            agent.enabled
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                        {isToggling && toggling === agent.id ? 'Saving...' : agent.enabled ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage My Agents</h1>
                    <p className="text-sm text-gray-600 mt-1">Organize your agents by type: forms, chat, or automation</p>
                </div>
                <button
                    onClick={() => router.push('/settings')}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                    Back to Settings
                </button>
            </div>

            {/* Forms Section */}
            <div>
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-xl">📝</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Forms</h2>
                        <p className="text-xs text-gray-600">
                            {forms.filter(f => f.enabled).length} of {forms.length} enabled
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {forms.map(renderAgentCard)}
                </div>
            </div>

            {/* Agents Section */}
            <div>
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Content Writers</h2>
                        <p className="text-xs text-gray-600">
                            {agentsList.filter(a => a.enabled).length} of {agentsList.length} enabled
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {agentsList.map(renderAgentCard)}
                </div>
            </div>

            {/* Automations Section */}
            <div>
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                        <span className="text-xl">⚡</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Automations</h2>
                        <p className="text-xs text-gray-600">
                            {automations.filter(a => a.enabled).length} of {automations.length} enabled
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {automations.map(renderAgentCard)}
                </div>
            </div>
        </main>
    );
}
