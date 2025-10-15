import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const fileId = req.nextUrl.searchParams.get("fileId");
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

        return NextResponse.json({
            fileId: doc.documentId ?? doc.fileId ?? "",
            content: doc.content ?? "",
        });
    } catch (err: unknown) {
        console.error("Error loading doc via n8n:", err);
        return NextResponse.json(
            { error: "Failed to load document" },
            { status: 500 }
        );
    }
}