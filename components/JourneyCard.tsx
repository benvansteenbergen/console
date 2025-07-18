"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

/* ---------- typing ---------- */
interface TraceStep {
    label: string;
    summary: string;
    ts?: string;           // optional (API may omit it)
}

/* ---------- fetcher normalises both shapes ---------- */
const fetcher = async (url: string): Promise<TraceStep[]> => {
    const raw = await fetch(url).then(r => r.json());

    if (Array.isArray(raw)) return raw;          // already an array
    if (Array.isArray(raw.trace)) return raw.trace;

    return [];                                   // fallback
};

/* ---------- little typewriter hook ---------- */
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

/* ---------- one animated row ---------- */
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

/* ---------- main card ---------- */
export default function JourneyCard({ execId }: { execId: string }) {
    /* poll until we detect a “finished” step */
    const { data: trace = [] } = useSWR<TraceStep[]>(
        `/api/live-executions/${execId}`,
        fetcher,
        {
            refreshInterval: (latestTrace?: TraceStep[]) => {
                const last = latestTrace?.at(-1)?.label.toLowerCase() ?? "";
                return last.startsWith("saving") || last.startsWith("finished")
                    ? 0
                    : 2000; // keep polling
            },
        },
    );

    /* new-step detection */
    const prevRef = useRef<string[]>([]);
    const rows = trace.map((step, idx) => {
        /* fall back to index if ts missing */
        const key = step.ts ?? `idx-${idx}`;
        const fresh = !prevRef.current.includes(key);
        return { step, fresh, key };
    });

    useEffect(() => {
        prevRef.current = rows.map((r) => r.key);
    }, [rows]);

    const doneLabel =
        trace.at(-1)?.label.toLowerCase() ?? /* empty array */ "";

    return (
        <ol className="relative border-l pl-4">
            {rows.map(({ step, fresh, key }) => (
                <StepRow key={key} step={step} fresh={fresh} />
            ))}

            {/* always show while nothing yet, or still running */}
            {(trace.length === 0 ||
                (!doneLabel.startsWith("saving") &&
                    !doneLabel.startsWith("finished"))) && (
                <li className="mb-2 pl-4">
                    <span className="absolute -left-2 top-1 h-4 w-4 animate-pulse rounded-full border border-slate-300" />
                    <p className="font-medium text-slate-400">
                        Waiting for next step…
                    </p>
                </li>
            )}
        </ol>
    );
}