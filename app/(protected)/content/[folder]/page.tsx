// ============================================================================
// File: app/content/[folder]/page.tsx   (Server Component)
// Description: Renders the folder view when the user clicks a tile on the
//              dashboard. Keeps the existing left‑hand nav via the default
//              layout. Authenticates exactly the same way as the rest of the
//              portal (extract JWT from the "session" cookie, forward it as
//              "auth=<jwt>") and then fetches Drive metadata from the existing
//              API route. The data is passed to a Client Component
//              (FolderGrid) that handles hover actions.
// ----------------------------------------------------------------------------
import { cookies } from "next/headers";
import FolderGrid, { DriveFile } from "@/components/FolderGrid";

interface FolderPageProps {
    params: { folder: string };
}

export default async function FolderPage({ params }: FolderPageProps) {
    const folderName = decodeURIComponent(params.folder);

    // --- Consistent auth pattern ---------------------------------------------
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    // -------------------------------------------------------------------------
    const res = await fetch(
        `${process.env.CONSOLE_BASE_URL}/api/content-storage?folder=${encodeURIComponent(
            folderName,
        )}`,
        {
            headers: {
                // forward as auth=<jwt>; just like the other internal API calls
                cookie: `auth=${jwt};`,
            },
            cache: "no-store", // always fresh so the NEW badge is accurate
        },
    );

    if (!res.ok) throw new Error("Failed to load folder content");

    const data = (await res.json()) as {
        items: DriveFile[];
        newFiles: number;
    };

    // -------------------------------------------------------------------------
    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            {/* breadcrumb */}
            <div className="text-sm text-slate-500">
                <a href="/" className="font-medium text-sky-700 hover:underline">
                    Content
                </a>
                <span className="mx-1">&gt;</span>
                <span className="font-semibold">{folderName}</span>
            </div>

            <h1 className="text-2xl font-semibold">
                {data.items.length} {folderName}
                {data.items.length === 1 ? "" : "s"} available
            </h1>

            {/* grid */}
            <FolderGrid items={data.items} />
        </main>
    );
}