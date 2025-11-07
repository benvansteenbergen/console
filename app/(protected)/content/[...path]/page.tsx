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
    const folderPath = path.join('/');
    const folderName = path[path.length - 1] || '';

    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    /* ---------- data ---------- */
    // Use environment variable for base URL to avoid self-referencing issues
    const baseUrl = process.env.CONSOLE_BASE_URL || 'http://localhost:3000';
    const res = await fetch(
        `${baseUrl}/api/content-storage?folder=${encodeURIComponent(folderPath)}`,
        {
            headers: { cookie: `session=${jwt};` },
            cache: 'no-store'
        }
    );

    if (!res.ok) throw new Error("Failed to load folder content");

    const stats = (await res.json()) as FolderStat[];
    const match = stats.find(
        (s) => s.folder.toLowerCase() === folderPath.toLowerCase(),
    );
    const items = match?.items ?? [];

    // Check if we're at root level (only 1 segment in path)
    const isRootLevel = path.length === 1;

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
                    <CreateFolderButton parentFolder={folderPath} />
                )}
            </div>

            <FolderGrid folder={folderPath} initialItems={items} />
        </main>
    );
}
