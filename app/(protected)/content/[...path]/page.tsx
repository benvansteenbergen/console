// app/(protected)/content/[...path]/page.tsx
import FolderGrid, { DriveFile } from "@/components/FolderGrid";
import { cookies } from "next/headers";
import CreateFolderButton from "@/components/CreateFolderButton";

interface FolderStat {
    folder: string;
    unseen: number;
    items: DriveFile[];
    folderId?: string;
}

export default async function Page(props: { params: Promise<{ path: string[] }> }) {
    const params = await props.params;
    const path = params.path || [];

    // For root folders, path is like ['blogpost']
    // For subfolders, path is like ['blogpost', '1sd4MTHRJ72...'] (parent name, then child ID)
    const isRootLevel = path.length === 1;
    const queryParam = path[path.length - 1] || ''; // Last segment (name for root, ID for subfolders)

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    /* ---------- data ---------- */
    // Fetch directly from n8n to avoid self-referencing issues
    let res;
    let raw;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        res = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/content-storage?folder=${encodeURIComponent(queryParam)}`,
            {
                headers: { cookie: `auth=${jwt};` },
                cache: 'no-store',
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error('N8N fetch failed:', res.status, await res.text());
            throw new Error(`Failed to load folder content: ${res.status}`);
        }

        // n8n returns: [{ "FolderName": { folderId, newFiles, items: [] } }]
        raw = await res.json();
    } catch (error) {
        console.error('Fetch error:', error);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout - n8n took too long to respond');
        }
        throw error;
    }

    // Transform the response
    interface UpstreamFolder {
        folderId?: string;
        newFiles: number;
        items: unknown[];
    }
    type UpstreamPayload = { [folderName: string]: UpstreamFolder };

    const stats: FolderStat[] = (raw as UpstreamPayload[]).map((obj) => {
        const [key] = Object.keys(obj);
        return {
            folder: key,
            unseen: obj[key].newFiles,
            items: obj[key].items as DriveFile[],
            folderId: obj[key].folderId
        };
    });

    // n8n returns a single folder in the response
    const match = stats[0];
    const items = match?.items ?? [];
    const folderName = match?.folder || queryParam;
    const currentFolderId = match?.folderId;

    // Use the actual Google Drive folder ID for creating subfolders
    const parentFolderId = currentFolderId || queryParam;

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

            <FolderGrid
                folder={path.join('/')}
                folderId={currentFolderId}
                initialItems={items}
            />
        </main>
    );
}
