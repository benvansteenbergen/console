'use client';
import useSWR from 'swr';
import Link from 'next/link';
import RecentExecutions from '@/components/RecentExecutions';
import ContentWriterGrid from "@/components/Agents/ContentwriterGrid";
import ContentFormGrid from "@/components/Agents/ContentformGrid";
import ContentautomationGrid from "@/components/Agents/ContentautomationGrid";

/* --------------------------------------------------------------------
   Helper types
-------------------------------------------------------------------- */
interface FolderStat {
  folder: string;
  unseen: number;
  items: unknown[];
}

const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });

const toSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface Credits {
    plan: string;
    credits_used: number;
    plan_credits: number;
    over_limit: boolean;
}

export default function Dashboard() {
  /* live content-storage stats */
  const {
    data: stats = [],
    error: storageError,
    isLoading: storageLoading,
  } = useSWR<FolderStat[]>('/api/content-storage', fetcher, {
    refreshInterval: 60_000,
  });

  const {
        data: credits = [],
        error: creditsError,
        isLoading: creditsLoading,
  } = useSWR<Credits>("/api/credits", fetcher);

  const Panel = ({ children }: { children: React.ReactNode }) => (
      <div className="rounded-lg border bg-white shadow-sm">{children}</div>
  );

  /* ------------------------------------------------------------------ */
  /*  JSX                                                               */
  /* ------------------------------------------------------------------ */
  return (
      <section className="mx-auto w-full max-w-6xl space-y-10 px-6 py-10">
        {/* Credits banner */}
          <Panel>
              <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
                  <h1 className="col-span-2 text-3xl font-bold text-blue-900">
                      Welcome to Wingsuite
                  </h1>

                  <div className="flex flex-col items-start justify-center gap-2 sm:items-end">
                      {creditsLoading ? (
                          <p className="text-sm text-gray-500">Loading plan info…</p>
                      ) : creditsError ? (
                          <p className="text-sm text-red-600">Could not load usage data.</p>
                      ) : (
                          <>
                              <p className="text-xs font-medium text-gray-500">Plan: {credits[0].plan}</p>
                              <p
                                  className={`text-lg font-semibold ${
                                      credits[0].over_limit ? "text-red-600" : "text-blue-700"
                                  }`}
                              >
                                  {credits[0].credits_used} / {credits[0].plan_credits} credits
                              </p>
                              {credits[0].over_limit ? (
                                  <button className="rounded-md border border-red-600 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                                      Upgrade plan
                                  </button>
                              ) : (
                                  <button className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50">
                                      Buy more
                                  </button>
                              )}
                          </>
                      )}
                  </div>
              </div>
          </Panel>
        {/* Content types */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            What do you want to create?
          </h2>
            <ContentFormGrid showTitle={false} />
        </div>
          {/* Content Writers */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
          Content Writers
          </h2>
          <ContentWriterGrid />
        </div>
          {/* Content Storage (dynamic) */}
          <div>
              <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
                  Content Storage (Google Drive)
              </h2>
              {storageError && (
                  <p className="rounded bg-red-50 p-4 text-sm text-red-700">
                      Could not load storage data.
                  </p>
              )}
              <div className="grid grid-cols-3 gap-6 border-x border-b bg-blue-100 p-6">
                  {/* Skeleton during first load */}
                  {storageLoading && stats.length === 0 &&
                      Array.from({ length: 3 }).map((_, i) => (
                          <div
                              key={i}
                              className="h-24 animate-pulse rounded-lg border bg-gray-100"
                          />
                      ))}

                  {/* Real tiles */}
                  {!storageLoading &&
                      stats.map(({ folder, unseen, items }) => (
                          <Panel key={folder}>
                              <Link
                                  href={`/content/${toSlug(folder)}`}
                                  className="relative flex flex-col items-center gap-1 p-6 text-center"
                              >
                                  <span className="font-medium">{folder}</span>
                                  <span className="text-xs text-gray-500">
                    {items.length ?? 0} file{items.length === 1 ? '' : 's'}
                  </span>

                                  {unseen > 0 && (
                                      <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                      +{unseen}
                    </span>
                                  )}
                              </Link>
                          </Panel>
                      ))}
              </div>
          </div>
        {/* + Recent executions */}
        <RecentExecutions limit={5} className="max-w-4xl" />
        {/* Automations */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Automations
          </h2>
          <div className="border-x border-b bg-blue-100 p-6">
              <ContentautomationGrid />
          </div>
        </div>

        {/* APIs */}
        <div>
          <h2 className="rounded-lg border bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            APIs
          </h2>
          <div className="border-x border-b bg-blue-100 p-6 text-center text-sm text-gray-500">
            No API endpoints yet…
          </div>
        </div>
      </section>
  );
}