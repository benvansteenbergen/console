import { cookies } from 'next/headers';

    interface N8nExecution {
    id: number;
    workflowId: number;
    workflow?: { name?: string };
    status: 'success' | 'error' | 'waiting' | 'running';
    finished: boolean;
    executionTime?: number; // ms
    startedAt: string;      // ISO
}

interface Exec {
    id: number;
    workflowName: string;
    status: 'success' | 'error' | 'running';
    started: string;
    durationMs: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Type guards for the three upstream shapes                                */
/* ────────────────────────────────────────────────────────────────────────── */
type UpstreamData   = { data: N8nExecution[] };
type UpstreamNested = { data: { results: N8nExecution[] } };

function isData(obj: unknown): obj is UpstreamData {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray((obj as UpstreamData).data)
    );
}

function isNested(obj: unknown): obj is UpstreamNested {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as UpstreamNested).data === 'object' &&
        (obj as UpstreamNested).data !== null &&
        Array.isArray((obj as UpstreamNested).data.results)
    );
}

/* ────────────────────────────────────────────────────────────────────────── */

export async function GET() {
    // 👈 await here
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
        return new Response('Not logged in', { status: 401 });
    }
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions?order=DESC&limit=10`,
        { headers: { cookie: `n8n-auth=${jwt};` } },
    );

    if (!res.ok) {
        console.error('n8n error', await res.text());
        return new Response('Upstream error', { status: 502 });
    }

    const upstreamJson: unknown = await res.json();

    let executions: N8nExecution[] = [];

    if (Array.isArray(upstreamJson)) {
        executions = upstreamJson;
    } else if (isData(upstreamJson)) {
        executions = upstreamJson.data;
    } else if (isNested(upstreamJson)) {
        executions = upstreamJson.data.results;
    } else {
        console.error('Unexpected upstream shape', upstreamJson);
    }

    const mapped: Exec[] = executions.map((ex) => ({
        id: ex.id,
        workflowName: ex.workflowName ?? `Workflow ${ex.workflowId}`,
        status:
            ex.status === 'running'
                ? 'running'
                : ex.status === 'error'
                    ? 'error'
                    : 'success',                 // assume anything else is success
        started: ex.startedAt,
        durationMs: ex.stoppedAt
            ? Date.parse(ex.stoppedAt) - Date.parse(ex.startedAt)
            : 0,
    }));

    return Response.json(mapped);
}