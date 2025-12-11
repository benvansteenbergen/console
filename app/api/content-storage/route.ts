// app/api/content-storage/route.ts
import { cookies } from 'next/headers';
import { NextRequest } from "next/server";

// in-memory cache
const CACHE: Record<string, { expires: number; payload: FolderStat[] }> = {};
const TTL = 30_000;

/* ──────── helper types ──────── */
interface UpstreamFolder {
    items: unknown[];       // you can refine later if you need thumbnails, etc.
    newFiles: number;
}
type UpstreamPayload = { [folderName: string]: UpstreamFolder };

export interface FolderStat {
    folder: string;
    unseen: number;
    items: unknown[];
}

export async function GET(req: NextRequest) {
    /* grab token from session cookie */
    const token = (await cookies()).get('session')?.value;
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") ?? "";
    const refresh = searchParams.get("refresh"); // Force refresh parameter

    if (!token) return new Response('Unauthorized', { status: 401 });

    const cacheKey = `${token.slice(-16)}:${folder.toLowerCase() || "all"}`;

    // Skip cache if refresh parameter is present
    if (!refresh) {
        const hit = CACHE[cacheKey];
        if (hit && hit.expires > Date.now()) return Response.json(hit.payload);
    }


    /* proxy to n8n webhook */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/webhook/content-storage?folder=${encodeURIComponent(folder)}`,
        { headers: { cookie: `auth=${token};` } },
    );
    if (!res.ok) {
        console.error(`Content-storage API: n8n returned ${res.status}`);
        return new Response('upstream error', { status: 502 });
    }

    // Check if response has content
    const text = await res.text();
    if (!text || text.trim().length === 0) {
        console.error('Content-storage API: Empty response from n8n');
        return new Response('Empty response from upstream', { status: 502 });
    }

    // Try to parse JSON
    let raw: UpstreamPayload[];
    try {
        raw = JSON.parse(text);
    } catch {
        console.error('Content-storage API: Invalid JSON from n8n:', text.substring(0, 200));
        return new Response('Invalid response from upstream', { status: 502 });
    }
    const flat: FolderStat[] = raw.map((obj) => {
        const [key] = Object.keys(obj);
        return { folder: key, unseen: obj[key].newFiles, items: obj[key].items };
    });

    CACHE[cacheKey] = { expires: Date.now() + TTL, payload: flat };
    return Response.json(flat);
}