import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface CreditsResponse {
    plan: string;
    credits_used: number;
    plan_credits: number;
    over_limit: boolean;
}

export async function GET() {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const res = await fetch(`${process.env.N8N_BASE_URL}/webhook/portal-usage`, {
        headers: { cookie: `auth=${jwt};` },
        cache: "no-store",
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const data = (await res.json()) as CreditsResponse;
    return NextResponse.json(data);
}