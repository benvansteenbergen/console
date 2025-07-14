// app/(protected)/content/[folder]/page.tsx
import FolderGrid, { DriveFile } from "@/components/FolderGrid";

export default async function Page(props: unknown) {
    const { params } = props as { params: { folder: string } };
    const folderName = decodeURIComponent(params.folder);

    /* ---------- data ---------- */
    const res = await fetch(
        `/api/content-storage?folder=${encodeURIComponent(folderName)}`,
        { credentials: 'include' }
    );

    if (!res.ok) throw new Error("Failed to load folder content");

    const { items } = (await res.json()) as { items: DriveFile[] };

    /* ---------- render ---------- */
    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            <div className="text-sm text-slate-500">
                <a href="/" className="font-medium text-sky-700 hover:underline">Content</a>
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
