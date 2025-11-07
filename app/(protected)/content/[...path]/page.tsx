// app/(protected)/content/[...path]/page.tsx
import FolderGrid, { DriveFile } from "@/components/FolderGrid";
import { cookies } from "next/headers";
import CreateFolderButton from "@/components/CreateFolderButton";

interface FolderStat {
    folder: string;
    unseen: number;
    items: DriveFile[];
}

export default async function Page(props: { params: Promise<{ path: string[] }> }) {
    const params = await props.params;
    const path = params.path || [];
    // Now path contains folder IDs, not names
    // For root folders: ['blogpost']
    // For subfolders: ['abc123def456'] (the Google Drive folder ID)
    const folderId = path[path.length - 1] || '';

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    /* ---------- data ---------- */
    // Fetch directly from n8n to avoid self-referencing issues
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/webhook/content-storage?folder=${encodeURIComponent(folderId)}`,
        {
            headers: { cookie: `auth=${jwt};` },
            cache: 'no-store'
        }
    );

    if (!res.ok) throw new Error("Failed to load folder content");

    // n8n returns: [{ "FolderName": { folderId, newFiles, items: [] } }]
    const raw = await res.json();

    // Transform the response
    interface UpstreamFolder {
        folderId?: string;
        newFiles: number;
        items: unknown[];
    }
    type UpstreamPayload = { [folderName: string]: UpstreamFolder };

    const stats: FolderStat[] = (raw as UpstreamPayload[]).map((obj) => {
        const [key] = Object.keys(obj);
        return { folder: key, unseen: obj[key].newFiles, items: obj[key].items as DriveFile[] };
    });

    const match = stats.find(
        (s) => s.folder.toLowerCase() === folderId.toLowerCase(),
    );
    const items = match?.items ?? [];
    const folderName = match?.folder || folderId;

    // Check if we're at root level (only 1 segment in path)
    const isRootLevel = path.length === 1;

    // Use the actual folder ID for creating subfolders
    const parentFolderId = folderId;

    /* ---------- breadcrumb ---------- */
    const breadcrumbs = path.map((segment, index) => ({
        name: segment,
        href: `/content/${path.slice(0, index + 1).join('/')}`,
        isLast: index === path.length - 1
    }));

    /* ---------- render ---------- */
    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-slate-600">
                <a href="/dashboard" className="font-medium text-sky-700 hover:underline">
                    Content
                </a>
                {breadcrumbs.map((crumb, idx) => (
                    <span key={idx} className="flex items-center">
                        <svg className="h-4 w-4 mx-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {crumb.isLast ? (
                            <span className="font-semibold capitalize text-gray-900">{crumb.name}</span>
                        ) : (
                            <a href={crumb.href} className="capitalize text-sky-700 hover:underline">
                                {crumb.name}
                            </a>
                        )}
                    </span>
                ))}
            </nav>

            {/* Title and Create button */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">
                    {items.length} item{items.length === 1 ? "" : "s"} in {folderName}
                </h1>

                {isRootLevel && (
                    <CreateFolderButton parentFolderId={parentFolderId} />
                )}
            </div>

            <FolderGrid folder={folderId} initialItems={items} />
        </main>
    );
}
