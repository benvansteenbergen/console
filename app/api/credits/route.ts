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

    let data = await res.json();

    // n8n returns an array, take first element
    if (Array.isArray(data) && data.length > 0) {
        data = data[0];
    }

    // Ensure numbers are actually numbers (n8n might return strings)
    const credits: CreditsResponse = {
        plan: data.plan,
        credits_used: Number(data.credits_used) || 0,
        plan_credits: Number(data.plan_credits) || 0,
        over_limit: Boolean(data.over_limit),
    };

    return NextResponse.json(credits);
}