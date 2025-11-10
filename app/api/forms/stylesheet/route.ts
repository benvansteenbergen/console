// app/api/forms/stylesheet/route.ts
import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { detectBranding, BRAND } from '@/lib/branding';

export async function GET(req: NextRequest) {
    try {
        // Detect brand from hostname
        const hostname = req.headers.get('host') || '';
        const brandObj = detectBranding(hostname);

        // Find brand key from domain
        const brandKey = Object.entries(BRAND).find(([_, b]) => b.domain === brandObj.domain)?.[0] || 'wingsuite';

        // Map brand to CSS filename
        const cssFilename = `${brandKey}-form.css`;
        const cssPath = join(process.cwd(), 'public', 'forms', cssFilename);

        // Read the CSS file
        const cssContent = await readFile(cssPath, 'utf-8');

        // Return CSS with correct content type
        return new Response(cssContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/css',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error('Error serving form stylesheet:', error);

        // Fallback to wingsuite CSS if brand-specific file doesn't exist
        try {
            const fallbackPath = join(process.cwd(), 'public', 'forms', 'wingsuite-form.css');
            const cssContent = await readFile(fallbackPath, 'utf-8');

            return new Response(cssContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/css',
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        } catch {
            return new Response('/* CSS not found */', {
                status: 404,
                headers: { 'Content-Type': 'text/css' },
            });
        }
    }
}
