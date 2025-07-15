// app/(protected)/content/[folder]/page.tsx
import FolderGrid, { DriveFile } from "@/components/FolderGrid";
import {cookies} from "next/headers";

interface FolderStat {
    folder: string;
    unseen: number;
    items: DriveFile[];
}

export default async function Page(props: unknown) {
    const { params } = props as { params: { folder: string } };
    const folderName = decodeURIComponent(params.folder);
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    /* ---------- data ---------- */
    const res = await fetch(
        `${process.env.CONSOLE_BASE_URL}/api/content-storage?folder=${encodeURIComponent(folderName)}`,
        { headers: { cookie: `session=${jwt};` }}
    );

    if (!res.ok) throw new Error("Failed to load folder content");

    const stats = (await res.json()) as FolderStat[];
    const match = stats.find(
        (s) => s.folder.toLowerCase() === folderName.toLowerCase(),
    );
    const items = match?.items ?? [];

    /* ---------- render ---------- */
    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            <div className="text-sm text-slate-500">
                <a href="/dashboard" className="font-medium text-sky-700 hover:underline">
                    Content
                </a>
                <span className="mx-1">&gt;</span>
                <span className="font-semibold">{folderName}</span>
            </div>

            <h1 className="text-2xl font-semibold">
                {items.length} {folderName}
                {items.length === 1 ? "" : "s"} available
            </h1>

            <FolderGrid folder={folderName} initialItems={items} />
        </main>
    );
}
