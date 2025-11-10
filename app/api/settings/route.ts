// app/api/settings/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    try {
        // Fetch settings data from n8n
        const res = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/portal-settings`,
            {
                headers: { cookie: `auth=${jwt};` },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            console.error('N8N settings fetch failed:', res.status, await res.text());
            return NextResponse.json({ error: 'Failed to load settings' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Settings API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
