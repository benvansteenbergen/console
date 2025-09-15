"use client";

import useSWR from "swr";
import Link from "next/link";

/* --------------------------------------------------------------------------
   Types match /api/content-automations (v_automation_board)
---------------------------------------------------------------------------- */
interface AutomationBoardRow {
  id: string;
  name: string;
  avatar?: string;
  units_label: string;        // e.g. "Descriptions"
  spark5: number[];           // last 5 days (oldest -> newest)
  avg_per_day_5d: number;     // average over spark5
  runs_today: number;
  units_today: number;
  runs_yesterday: number;
  units_yesterday: number;
  hours_saved_5d: number;
  credits_30d: number;
  dest_label: string;
  dest_url: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* --------------------------------------------------------------------------
   Tiny spark bar renderer
---------------------------------------------------------------------------- */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-8" aria-label="5-day spark bars">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-2 rounded-sm ${i === values.length - 1 ? "bg-blue-600" : "bg-blue-300"}`}
          style={{ height: `${(v / max) * 100}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Automations board component
---------------------------------------------------------------------------- */
export default function ContentautomationGrid() {
  const { data, error, isLoading } = useSWR<AutomationBoardRow[]>(
    "/api/content-automations",
    fetcher,
    { refreshInterval: 60_000 }
  );

  if (error) return <p className="p-4 text-red-600">No automations active</p>;

  // headline: sum units produced since midnight
  const overnight = (data ?? []).reduce((sum, a) => sum + (a.units_today || 0), 0);

  return (
    <section className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Automations</h2>
        <p className="text-sm text-gray-600">
          Goodmorning Chief. Your bots worked the night shift: {overnight}
          {" "}
          {overnight === 1 ? `${(data?.[0]?.units_label || "item").toLowerCase()} was` : `${(data?.[0]?.units_label || "items").toLowerCase()} were`} produced while you slept.
        </p>
      </header>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-12 items-center gap-2 border-b pb-2 text-xs font-semibold text-gray-600">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">{data?.[0]?.units_label || "Units"}/5‑day</div>
          <div className="col-span-2">Hours saved</div>
          <div className="col-span-2">Credits last 30d</div>
          <div className="col-span-1 text-right">Destination</div>
        </div>

        {/* skeleton rows */}
        {isLoading && !data && (
          <div className="space-y-2 py-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        {/* rows */}
        <div className="divide-y">
          {(data ?? []).map((a) => (
            <div key={a.id} className="grid grid-cols-12 items-center gap-2 py-3">
              {/* Name */}
              <div className="col-span-4">
                <div className="font-medium leading-tight">{a.name}</div>
                <div className="text-xs text-gray-500">
                  today {a.units_today} · yesterday {a.units_yesterday}
                </div>
              </div>

              {/* Descriptions/5-day */}
              <div className="col-span-3 flex items-center gap-3">
                <Spark values={a.spark5 || [0, 0, 0, 0, 0]} />
                <div className="text-sm"><span className="font-medium">{a.avg_per_day_5d}</span> per day</div>
              </div>

              {/* Hours saved */}
              <div className="col-span-2 text-sm">{a.hours_saved_5d}h</div>

              {/* Credits last 30d */}
              <div className="col-span-2 text-sm">{a.credits_30d}</div>

              {/* Destination */}
              <div className="col-span-1 text-right">
                {a.dest_url ? (
                  <Link href={a.dest_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                    {a.dest_label || "open"}
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}