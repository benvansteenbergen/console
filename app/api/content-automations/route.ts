import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AutomationBoardRow {
    id: string;
    name: string;
    avatar?: string;
    units_label: string;
    spark5: number[];
    avg_per_day_5d: number;
    runs_today: number;
    units_today: number;
    runs_yesterday: number;
    units_yesterday: number;
    hours_saved_5d: number;
    credits_30d: number;
    dest_label: string;
    dest_url: string;
    enabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  GET /api/content-automations                                      */
/* ------------------------------------------------------------------ */
export async function GET() {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    /* Proxy to n8n automation board webhook */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/webhook/portal-automations`,
        { headers: { cookie: `auth=${jwt};` }, cache: "no-store" },
    );
    if (res.status === 401) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!res.ok) {
        const body = await res.text();
        return NextResponse.json({ error: 'upstream error', detail: body }, { status: 502 });
    }
    const rows = (await res.json()) as AutomationBoardRow[];

    // Filter to only enabled automations
    const enabledRows = rows.filter(row => row.enabled !== false);

    return NextResponse.json(enabledRows);
}