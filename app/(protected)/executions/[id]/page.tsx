// app/(protected)/execution/[id]/page.tsx
import { cookies } from "next/headers";
import JourneyCard from "@/components/JourneyCard";

export default async function ExecutionPage({params,}: { params: { id: string }; })
{
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;
    const execId = params.id;

    /* Optional: quick existence check so we 404 fast if the ID is bogus  */
    const res = await fetch(`${process.env.N8N_BASE_URL}/rest/executions/${execId}`, {
        headers: { cookie: `auth=${jwt};` },
        next: { revalidate: 0 }, // don't cache
    });

    if (!res.ok) throw new Error("upstream error");

    return (
        <main className="flex flex-1 flex-col p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Execution progress</h1>

            <section>
                <JourneyCard execId={execId} />
            </section>
        </main>
    );
}