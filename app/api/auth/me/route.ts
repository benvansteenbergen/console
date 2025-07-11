import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const n8nAuth = cookieStore.get('session')?.value;       // same cookie you set at login

    if (!n8nAuth) return new Response('Unauth', { status: 401 });

    const res = await fetch(`${process.env.N8N_BASE_URL}/webhook/portal-userinfo`, {
        headers: { cookie: `n8n-auth=${n8nAuth};` },
    });

    if (!res.ok) return new Response('Unauth', { status: 401 });

    const json = await res.json();           // { client, role, email }
    return Response.json(json);
}