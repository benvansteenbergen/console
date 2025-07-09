// app/api/live-executions/route.ts
import { cookies } from 'next/headers';

interface N8nExecution {
    id: number;
    status: 'success' | 'error' | 'waiting' | 'running';
    finished: boolean;
    executionTime?: number;      // ms
    startedAt: string;           // ISO
    workflowId: number;
    workflow: { name: string } | null;
}

interface Exec {
    id: number;
    workflowName: string;
    status: 'success' | 'error' | 'running';
    started: string;
    durationMs: number;
}

export async function GET() {
    // ①  Await the promise
    const cookieStore = await cookies();          // <- now a real object
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) return new Response('Not logged in', { status: 401 });

    const upstream = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions?order=DESC&limit=10`,
        {headers: {cookie: `n8n-auth=${jwt};`}},
    );

    if (!upstream.ok) {
        console.error('n8n error', await upstream.text());
        return new Response('Upstream error', {status: 502});
    }

    const raw: N8nExecution[] = await upstream.json();

    const mapped: Exec[] = raw.map((ex) => ({
        id: ex.id,
        workflowName: ex.workflow?.name ?? `Workflow ${ex.workflowId}`,
        status: ex.finished
            ? ex.status === 'success'
                ? 'success'
                : 'error'
            : 'running',
        started: ex.startedAt,
        durationMs: ex.executionTime ?? 0,
    }));

    return Response.json(mapped);
}