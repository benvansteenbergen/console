import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeJsonParse, fetchFromN8n } from "@/lib/api-utils";

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

    const res = await fetchFromN8n('/webhook/portal-usage', jwt, {
        cache: "no-store",
    });

    if (!res.ok) {
        console.error(`Credits API: n8n returned ${res.status}`);
        return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    let data = await safeJsonParse(res, 'Credits API');
    if (!data) {
        return NextResponse.json({ error: "Invalid response from upstream" }, { status: 502 });
    }

    // n8n returns an array, take first element
    if (Array.isArray(data) && data.length > 0) {
        data = data[0];
    }

    // Ensure numbers are actually numbers (n8n might return strings)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = data as any;
    const credits: CreditsResponse = {
        plan: rawData.plan,
        credits_used: Number(rawData.credits_used) || 0,
        plan_credits: Number(rawData.plan_credits) || 0,
        over_limit: Boolean(rawData.over_limit),
    };

    return NextResponse.json(credits);
}