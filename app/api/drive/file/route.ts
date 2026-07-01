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

    // Normalise fancy Unicode in titles: LLM-generated headlines often use Mathematical
    // Bold letters ("𝐌𝐚𝐥𝐭𝐚") and accents. NFKD folds those back to plain ASCII ("Malta")
    // so the download filename is readable instead of a row of underscores.
    const safeName =
        name
            .normalize("NFKD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\.(md|txt|pdf|docx?)$/i, "")
            .replace(/[^\w .-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100) || "document";

    // Download path: export the Google Doc as a real PDF through n8n (which holds the
    // Drive credential), so it works for every signed-in user regardless of their Google
    // session. The export-document webhook returns the raw PDF binary.
    if (download) {
        try {
            const res = await fetch(
                `${process.env.N8N_BASE_URL}/webhook/export-document?fileId=${fileId}`, {
                    method: "GET",
                    headers: { cookie: `auth=${jwt};` },
                    cache: "no-store",
                }
            );
            if (!res.ok) {
                return NextResponse.json({ error: "Upstream error" }, { status: 502 });
            }
            const buf = Buffer.from(await res.arrayBuffer());
            // Guard against the auth-error JSON ({"valid":"false"}) being streamed as a PDF.
            if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
                return NextResponse.json({ error: "Export failed" }, { status: 502 });
            }
            return new NextResponse(buf, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
                    "Cache-Control": "no-store",
                },
            });
        } catch (err: unknown) {
            console.error("Error exporting PDF via n8n:", err);
            return NextResponse.json({ error: "Failed to export document" }, { status: 500 });
        }
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