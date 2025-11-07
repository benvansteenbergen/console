'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useBranding } from '@/components/BrandingProvider';
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

  const branding= useBranding();

  /* ------------------------------------------------------------------ */
  /*  JSX                                                               */
  /* ------------------------------------------------------------------ */
  return (
      <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
        {/* Welcome header with credits */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-8 shadow-sm">
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to {branding.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Create and manage your content with AI
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 rounded-xl bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm sm:items-end">
              {creditsLoading ? (
                <p className="text-sm text-gray-500">Loading plan info…</p>
              ) : creditsError ? (
                <p className="text-sm text-red-600">Could not load usage data.</p>
              ) : (
                <>
                  <p className="text-xs font-medium text-gray-500">
                    {credits[0].plan} Plan
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      credits[0].over_limit ? "text-red-600" : "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                    }`}
                  >
                    {credits[0].credits_used} / {credits[0].plan_credits}
                  </p>
                  <p className="text-xs text-gray-500">credits used</p>
                  {credits[0].over_limit && (
                    <button className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700">
                      Upgrade plan
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {/* Content types */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            What do you want to create?
          </h2>
          <ContentFormGrid showTitle={false} />
        </div>

        {/* Content Writers */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Content Writers
          </h2>
          <ContentWriterGrid />
        </div>
        {/* Content Storage (dynamic) */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Content Storage
          </h2>
          {storageError && (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              Could not load storage data.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Skeleton during first load */}
            {storageLoading && stats.length === 0 &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-gradient-to-br from-gray-100 to-gray-200"
                />
              ))}

            {/* Real tiles */}
            {!storageLoading &&
              stats.map(({ folder, unseen, items }) => (
                <Link
                  key={folder}
                  href={`/content/${toSlug(folder)}`}
                  className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                      <svg
                        className="h-6 w-6 text-purple-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 transition-colors group-hover:text-purple-700">
                      {folder}
                    </span>
                    <span className="text-xs text-gray-500">
                      {items.length ?? 0} file{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {unseen > 0 && (
                    <span className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 text-[10px] font-bold text-white shadow-md">
                      +{unseen}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </div>

        {/* Automations */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Automations
          </h2>
          <ContentautomationGrid showTitle={false} />
        </div>

        {/* APIs */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            APIs
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No API endpoints configured yet</p>
            </div>
          </div>
        </div>

        {/* Recent executions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          <RecentExecutions limit={5} showTitle={false} />
        </div>
      </section>
  );
}