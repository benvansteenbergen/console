import { cookies } from 'next/headers';

interface N8nExecution {
    id: number;
    workflowId: number;
    workflow?: { name?: string };
    status: 'success' | 'error' | 'waiting' | 'running';
    finished: boolean;
    executionTime?: number;   // ms
    startedAt: string;        // ISO
}

interface Exec {
    id: number;
    workflowName: string;
    status: 'success' | 'error' | 'running';
    started: string;       // ISO
    durationMs: number;    // 0 while still running
}

/** n8n returns either an array (older versions) or { data: [...] } */
type Upstream = N8nExecution[] | { data: N8nExecution[] };

export async function GET() {
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;
    if (!jwt) return new Response('Not logged in', { status: 401 });

    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions?order=DESC&limit=10`,
        { headers: { cookie: `n8n-auth=${jwt};` } },
    );

    if (!res.ok) {
        console.error('n8n error', await res.text());
        return new Response('Upstream error', { status: 502 });
    }

    const upstreamJson: Upstream = await res.json();

    // ------------ SAFE: TypeScript now knows .data may exist -------------
    const executions =
        Array.isArray(upstreamJson) ? upstreamJson : upstreamJson.data ?? [];

    const mapped: Exec[] = executions.map((ex) => ({
        id: ex.id,
        workflowName: ex.workflow?.name ?? `Workflow ${ex.workflowId}`,
        status: ex.finished ? (ex.status === 'success' ? 'success' : 'error') : 'running',
        started: ex.startedAt,
        durationMs: ex.executionTime ?? 0,
    }));

    return Response.json(mapped);
}