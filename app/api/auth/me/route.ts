import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) return new Response('Unauthorized', { status: 401 });
    const res = await fetch(`${process.env.N8N_BASE_URL}/webhook/portal-userinfo`, {
        "headers": {
            "cookie": `auth=${jwt};`
        },
    });

    if (!res.ok) return new Response('upstream error', { status: 502 });

    const json = await res.json();           // { client, role, email }
    return Response.json(json);
}