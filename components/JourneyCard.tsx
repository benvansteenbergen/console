"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

/* ---------- types coming from /trace ---------- */
interface TraceStep {
    label: string;   // "Writer: June"
    summary: string; // "Wrote a 300-word post …"
    ts: string;      // ISO
}

/* ---------- helpers ---------- */
const fetcher = (url: string) => fetch(url).then(r => r.json());

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
    /* phases: dots → typed */
    const [phase, setPhase] = useState<"dots" | "typed">(fresh ? "dots" : "typed");
    const typed = useTypewriter(step.summary, 14);

    useEffect(() => {
        if (fresh) {
            const id = setTimeout(() => setPhase("typed"), 800);
            return () => clearTimeout(id);
        }
    }, [fresh]);

    return (
        <li className="mb-6 relative pl-4">
            <span className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-sky-600" />
            <p className="font-medium">{step.label}</p>
            <p className="text-sm text-slate-600 min-h-[1rem]">
                {phase === "dots" ? (
                    <span className="animate-pulse inline-block w-4 text-center">…</span>
                ) : (
                    typed
                )}
            </p>
        </li>
    );
}

/* ---------- main card ---------- */
export default function JourneyCard({ execId }: { execId: string }) {
    const { data: trace = [] } = useSWR<TraceStep[]>(
        `/api/executions/${execId}`,
        fetcher,
        { refreshInterval: 2000 }
    );

    /* detect which steps are new this tick */
    const prevRef = useRef<string[]>([]);
    const rows = trace
        .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
        .map((step) => ({
            step,
            fresh: !prevRef.current.includes(step.ts),
        }));

    useEffect(() => {
        prevRef.current = trace.map((s) => s.ts);
    }, [trace]);

    return (
        <ol className="relative border-l pl-4">
            {rows.map(({ step, fresh }) => (
                <StepRow key={step.ts} step={step} fresh={fresh} />
            ))}

            {/* pending spinner while workflow still running */}
            {!trace.at(-1)?.label.startsWith("Saving") && (
                <li className="mb-2 pl-4">
                    <span className="absolute -left-2 top-1 h-4 w-4 rounded-full border border-slate-300 animate-pulse" />
                    <p className="font-medium text-slate-400">waiting for next step…</p>
                </li>
            )}
        </ol>
    );
}