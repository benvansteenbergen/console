import { cookies } from 'next/headers';

interface N8nExecution {
    id: number;
    workflowId: number;
    workflowName: string ;
    status: 'success' | 'error' | 'waiting' | 'running';
    finished: boolean;          // older n8n; may be missing
    executionTime?: number;     // ms (older n8n)
    startedAt: string;          // ISO
    stoppedAt?: string | null;  // ← add this line
    mode: string;
}
interface Exec {
    id: number;
    workflowName: string;
    status: 'success' | 'error' | 'running';
    started: string;
    durationMs: number;
    mode: string;
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
        return new Response('Unauthorized', { status: 401 });
    }
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions?order=DESC&limit=10`,
        { headers: { cookie: `n8n-auth=${jwt};` } },
    );

    if (!res.ok) {
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
        mode: ex.mode
    }));

    return Response.json(mapped);
}