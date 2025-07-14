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
}

export async function GET(req: NextRequest) {
    /* grab token from session cookie */
    const token = (await cookies()).get('session')?.value;
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") ?? "";

    if (!token) return new Response('Unauthorized', { status: 401 });

    const cacheKey = token.slice(-16);
    const hit = CACHE[cacheKey];
    if (hit && hit.expires > Date.now()) return Response.json(hit.payload);


    /* proxy to n8n webhook */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/webhook/content-storage?folder=${encodeURIComponent(folder)}`,
        { headers: { cookie: `auth=${token};` } },
    );
    if (!res.ok)  return new Response('upstream error', { status: 502 });
    /* ──────── map [{ <folder>: {newFiles} }] ➜ { folder, unseen }[] ──────── */
    const raw: UpstreamPayload[] = await res.json();
    const flat: FolderStat[] = raw.map((obj) => {
        const [key] = Object.keys(obj);
        return { folder: key, unseen: obj[key].newFiles };
    });

    CACHE[cacheKey] = { expires: Date.now() + TTL, payload: flat };
    return Response.json(flat);
}