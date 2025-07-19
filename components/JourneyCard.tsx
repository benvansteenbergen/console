"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

/* ---------- types returned by /api/live-executions/[id] --------------- */
interface TraceStep {
    label: string;
    summary: string;
    ts?: string;
}
interface ExecData {
    status: "running" | "success" | "error";
    trace: TraceStep[];
}

/* ---------- fetcher: accepts both old & new shapes -------------------- */
const fetcher = async (url: string): Promise<ExecData> => {
    const raw = await fetch(url).then(r => r.json());

    /* new API shape { status, trace:[…] } */
    if ("status" in raw && Array.isArray(raw.trace)) {
        return raw as ExecData;
    }

    /* old shape just an array or { trace:[…] } */
    const trace: TraceStep[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.trace)
            ? raw.trace
            : [];

    return { status: "running", trace };
};

/* ---------- tiny type‑writer hook ------------------------------------- */
function useTypewriter(text: string, speed = 16) {
    const [out, setOut] = useState("");
    useEffect(() => {
        let i = 0;
        const id = setInterval(() => {
            setOut(text.slice(0, ++i));
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return out;
}

/* ---------- one animated row ------------------------------------------ */
function StepRow({ step, fresh }: { step: TraceStep; fresh: boolean }) {
    const [phase, setPhase] = useState<"dots" | "typed">(
        fresh ? "dots" : "typed",
    );
    const typed = useTypewriter(step.summary, 14);

    useEffect(() => {
        if (fresh) {
            const id = setTimeout(() => setPhase("typed"), 800);
            return () => clearTimeout(id);
        }
    }, [fresh]);

    return (
        <li className="relative mb-6 pl-4">
            <span className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-sky-600" />
            <p className="font-medium">{step.label}</p>
            <p className="min-h-[1rem] text-sm text-slate-600">
                {phase === "dots" ? (
                    <span className="inline-block w-4 animate-pulse text-center">…</span>
                ) : (
                    typed
                )}
            </p>
        </li>
    );
}

/* ---------- main JourneyCard ----------------------------------------- */
export default function JourneyCard({ execId }: { execId: string }) {
    const { data } = useSWR<ExecData>(
        `/api/live-executions/${execId}`,
        fetcher,
        {
            /* stop polling once status !== running */
            refreshInterval: (latest?: ExecData) =>
                latest?.status === "running" ? 2000 : 0,
        },
    );

    const trace = data?.trace ?? [];
    const running = data?.status === "running";
    const finished = data?.status === "success";

    /* detect “fresh” rows -------------------------------------------------- */
    const prevRef = useRef<string[]>([]);
    const rows = trace.map((step, idx) => {
        const key = step.ts ?? `idx-${idx}`;
        const fresh = !prevRef.current.includes(key);
        return { step, key, fresh, idx };
    });
    useEffect(() => {
        prevRef.current = rows.map((r) => r.key);
    }, [rows]);

    /* ---------- reorder: Start first, Finished last ---------- */
    rows.sort((a, b) => {
        const aLabel = a.step.label.toLowerCase();
        const bLabel = b.step.label.toLowerCase();

        if (aLabel.startsWith("start")) return -1;
        if (bLabel.startsWith("start")) return 1;

        if (aLabel.startsWith("finished")) return 1;
        if (bLabel.startsWith("finished")) return -1;

        return a.idx - b.idx; // preserve natural order otherwise
    });

    /* ---------- UI ------------------------------------------------------- */
    return (
        <div className="space-y-4">
            {/* title with spinner / check */}
            <ol className="relative border-l pl-4">
                {rows.map(({ step, fresh, key }) => (
                    <StepRow key={key} step={step} fresh={fresh} />
                ))}

                {/* waiting row only while still running */}
                {running && (
                    <li className="mb-2 pl-4">
                        <span className="absolute -left-2 top-1 h-4 w-4 animate-pulse rounded-full border border-slate-300" />
                        <p className="font-medium text-slate-400">
                            Waiting for next step…
                        </p>
                    </li>
                )}
            </ol>
            <div className="flex items-center gap-2">
                {running && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                )}
                {finished && (
                    <span className="inline-block h-4 w-4 text-green-600">✔</span>
                )}
                <h2 className="text-lg font-semibold">
                    {running ? "Workflow running…" : "Workflow finished"}
                </h2>
            </div>
        </div>
    );
}