// app/api/live-executions/route.ts
export async function GET() {
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions?order=DESC&limit=10`,
        { headers: { 'X-API-Key': process.env.N8N_API_KEY! } }
    );

    // Just stream back exactly what n8n returns.
    // Your React component should then map/transform it.
    return new Response(res.body, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
    });
}