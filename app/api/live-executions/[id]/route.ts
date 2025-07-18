// app/api/live-executions/[id]/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* helper interfaces --------------------------------------------------- */
interface N8nExecResponse {
    data: {
        id: string;
        status: "success" | "error" | "running";
        startedAt: string;
        stoppedAt: string | null;
        customData: Record<string, string>;
    };
}
interface TraceStep {
    label: string;
    summary: string;
}

/* GET /api/live-executions/[id] --------------------------------------- */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }
) {
    /* auth */
    const { id } = await params;
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    /* proxy to n8n (includeData=true so customData is present) */
    const upstream = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions/${id}`,
        {
            headers: { cookie: `n8n-auth=${jwt};` },
            cache: "no-store",
        },
    );

    if (upstream.status === 404)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!upstream.ok)
        return NextResponse.json({ error: "upstream error" }, { status: 502 });

    const raw = (await upstream.json()) as N8nExecResponse;

    /* flatten customData → trace array */
    const trace: TraceStep[] = Object.entries(raw.data?.customData ?? {}).map(
        ([label, summary]) => ({ label, summary }),
    );

    /* response */
    return NextResponse.json({
        id: raw.data.id,
        status: raw.data.status,
        startedAt: raw.data.startedAt,
        stoppedAt: raw.data.stoppedAt,
        trace,
    });
}