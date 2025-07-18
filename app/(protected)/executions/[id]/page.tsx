// app/(protected)/executions/[id]/page.tsx
import { cookies } from "next/headers";
import JourneyCard from "@/components/JourneyCard";

export default async function Page(props: unknown) {
    /* ---- narrow to what we actually expect -------------------------------- */
    const { params } = props as { params: { id: string } };
    const execId = params.id;

    /* ---- auth guard ------------------------------------------------------- */
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    /* ---- (optional) existence check on n8n ------------------------------- */
    const res = await fetch(
        `${process.env.N8N_BASE_URL}/rest/executions/${execId}`,
        { headers: { cookie: `auth=${jwt};` }, next: { revalidate: 0 } },
    );

    if (!res.ok) throw new Error("upstream error");

    /* ---- render ----------------------------------------------------------- */
    return (
        <main className="flex flex-1 flex-col p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Execution progress</h1>
            <JourneyCard execId={execId} />
        </main>
    );
}