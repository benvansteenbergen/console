// app/api/auth/me/route.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface PortalJwtPayload {
    sub: string;           // user email
    client: string;        // tenant id, e.g. "acme"
    role: string;          // "editor", "viewer", ...
    scopes: string[];      // ["folder:read", ...]  (optional to expose)
    exp: number;           // epoch seconds
}

export async function GET() {
    /* 1. Read the session cookie (portal token) */
    const cookieStore = await cookies();               // ← await is required
    const token = cookieStore.get('session')?.value;

    if (!token) {
        /* No cookie at all → user not logged in */
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        /* 2. Verify and decode the JWT */
        const payload = jwt.verify(
            token,
            process.env.PORTAL_JWT_SECRET!,      // keep secret in Railway env vars
        ) as PortalJwtPayload;

        /* 3. Return minimal identity info to the frontend */
        return Response.json({
            email : payload.sub,
            client: payload.client,
            role  : payload.role,
            // If you later need scopes on the client, expose them here
            // scopes: payload.scopes,
        });
    } catch (err) {
        /* Expired or tampered token → force re-login */
        console.error('JWT verify failed:', err);
        return new Response('Unauthorized', { status: 401 });
    }
}