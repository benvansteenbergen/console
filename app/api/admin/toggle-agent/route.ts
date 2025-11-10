// app/api/admin/toggle-agent/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
        return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
    }

    try {
        const { agentId, enabled } = await req.json();

        // Send toggle request to n8n
        const res = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/toggle-agent-enabled`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    cookie: `auth=${jwt};`,
                },
                body: JSON.stringify({ agentId, enabled }),
            }
        );

        if (!res.ok) {
            console.error('N8N toggle agent enabled failed:', res.status, await res.text());
            return NextResponse.json({ error: 'Failed to toggle agent' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Toggle agent API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
