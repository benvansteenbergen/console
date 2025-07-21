import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface WriterMeta {
    avatarUrl?: string;
}

interface N8nWorkflow {
    id: string;
    name: string;
    meta?: WriterMeta;
}

/* ------------------------------------------------------------------ */
/*  GET /api/content-writers                                          */
/* ------------------------------------------------------------------ */
export async function GET() {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const params = encodeURIComponent("{\"tags\":[\"chat\"], \"active\":true, \"isArchived\":false}");
    /* n8n filters by tag=agent */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/workflows?filter=${params}`,
        { headers: { cookie: `n8n-auth=${jwt};` }, cache: "no-store" },
    );
    if (!res.ok)
        return NextResponse.json({ error: "upstream error" }, { status: 502 });

    const rows = (await res.json()).data as N8nWorkflow[];

    const writers = rows.map((w) => ({
        id: w.id,
        name: w.name,
        avatar:
            w.meta?.avatarUrl ??
            `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                w.name,
            )}`,
        chatUrl: `${process.env.N8N_BASE_URL}/webhook/${w.id}/chat`,
    }));

    return NextResponse.json(writers);
}