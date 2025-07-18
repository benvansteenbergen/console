// app/api/live-executions/[id]/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* --------------------------------------------------------------------- */
/*  Helper interfaces                                                    */
/* --------------------------------------------------------------------- */
interface N8nExecResponse {
    data: {
        id: string;
        status: "success" | "error" | "running";
        startedAt: string;
        stoppedAt: string | null;
        customData?: Record<string, string>;
    };
}

interface TraceStep {
    label: string;
    summary: string;
}

/* --------------------------------------------------------------------- */
/*  GET /api/live-executions/:id                                         */
/* --------------------------------------------------------------------- */
export async function GET(props: unknown) {

    const { params } = props as { params: { id: string } };
    /* Auth (reuse cookie pattern) */
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Proxy to n8n with includeData=true */
    const n8nUrl =
        `${process.env.N8N_BASE_URL}/rest/executions/${params.id}` +
        `?includeData=true`;

    const upstream = await fetch(n8nUrl, {
        headers: { cookie: `auth=${jwt};` },
        cache: "no-store",
    });

    if (upstream.status === 404) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!upstream.ok) {
        return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }

    const raw = (await upstream.json()) as N8nExecResponse;

    /* Flatten customData → ordered trace array */
    const trace: TraceStep[] = Object.entries(raw.data.customData ?? {}).map(
        ([label, summary]) => ({ label, summary }),
    );

    /* Shape response */
    return NextResponse.json({
        id: raw.data.id,
        status: raw.data.status,
        startedAt: raw.data.startedAt,
        stoppedAt: raw.data.stoppedAt,
        trace,             // [{ label, summary }, …]
    });
}