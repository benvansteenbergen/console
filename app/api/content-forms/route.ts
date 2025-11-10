import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface N8nWorkflow {
    id: string;
    name: string;
    type: "chat" | "form" | "automation";
    url: string;
    avatar?: string;
    enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  GET /api/content-writers                                          */
/* ------------------------------------------------------------------ */
export async function GET() {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    /* n8n filters by tag=agent */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/webhook/portal-agents`,
        { headers: { cookie: `auth=${jwt};` }, cache: "no-store" },
    );
    if (!res.ok)
        return NextResponse.json({ error: "upstream error" }, { status: 502 });

    const rows = (await res.json())  as N8nWorkflow[];

    const forms = rows
        .filter((w) => w.type === "form" && w.enabled === true)
        .map((w) => {
            // Extract form slug from URL
            // e.g., "https://workflow.wingsuite.io/form/blogpost-demo" -> "blogpost-demo"
            const urlMatch = w.url.match(/\/form\/([^/?]+)/);
            const slug = urlMatch ? urlMatch[1] : w.id; // Fallback to id if pattern doesn't match

            return {
                id: w.id,
                slug,
                name: w.name,
                formUrl: `${w.url}`,
            };
        });

    return NextResponse.json(forms);
}