// app/api/live-executions/[id]/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/* -------------------------------------------------------------------------
   Helper types – tighten later if you like
---------------------------------------------------------------------------*/
interface N8nExecResponse {
    data: {
        id: string;
        status: "success" | "error" | "running";
        startedAt: string;
        stoppedAt: string | null;
        customData?: Record<string, string>;            // our trace map
        /* many more fields we ignore for now */
    };
}

interface TraceStep {
    label: string;
    summary: string;
}

/* -------------------------------------------------------------------------
   GET /api/live-executions/:id
---------------------------------------------------------------------------*/
export async function GET(req: NextRequest, { params }: { params: { id: string } },) {
    /* 1 — auth (reuse cookie pattern) */
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 2 — always ask n8n for the full data payload */
    const n8nUrl =
        `${process.env.N8N_BASE_URL}/rest/executions/${params.id}` +
        `?includeData=true`;

    const upstream = await fetch(n8nUrl, {
        headers: { cookie: `auth=${jwt};` },
        cache: "no-store",
    });

    if (!upstream.ok) {
        return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }

    const raw = (await upstream.json()) as N8nExecResponse;

    /* 3 — flatten customData ➜ ordered trace array ------------------------- */
    const trace: TraceStep[] = [];
    if (raw.data.customData) {
        for (const [label, summary] of Object.entries(raw.data.customData)) {
            trace.push({ label, summary });
        }
        /* sort by the order you inserted them (JS preserves insertion order)   */
    }

    /* 4 — shape the response */
    return NextResponse.json({
        id: raw.data.id,
        status: raw.data.status,
        startedAt: raw.data.startedAt,
        stoppedAt: raw.data.stoppedAt,
        trace,                             //  ← [{ label, summary }, …]
    });
}