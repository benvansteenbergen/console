import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const fileId = req.nextUrl.searchParams.get("fileId");
    const download = req.nextUrl.searchParams.get("download") === "true";
    const name = req.nextUrl.searchParams.get("name") || "document";
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt)
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!fileId) {
        return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    try {
        const res = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/load-document?fileId=${fileId}`, {
                method: "GET",
                headers: { cookie: `auth=${jwt};` },
                cache: "no-store"
            }
        );

        if (!res.ok) {
            return NextResponse.json({ error: "Upstream error" }, { status: 502 });
        }

        const data = await res.json();
        const doc = Array.isArray(data) ? data[0] : data;
        const content: string = doc.content ?? "";

        // Stream the document content as a downloadable Markdown file instead of JSON.
        if (download) {
            const safeName =
                name
                    .replace(/\.(md|txt|pdf|docx?)$/i, "")
                    .replace(/[^a-zA-Z0-9 ._-]/g, "_")
                    .trim()
                    .slice(0, 100) || "document";
            return new NextResponse(content, {
                headers: {
                    "Content-Type": "text/markdown; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${safeName}.md"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        return NextResponse.json({
            fileId: doc.documentId ?? doc.fileId ?? "",
            content,
        });
    } catch (err: unknown) {
        console.error("Error loading doc via n8n:", err);
        return NextResponse.json(
            { error: "Failed to load document" },
            { status: 500 }
        );
    }
}