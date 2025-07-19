'use client';
import useSWR from 'swr';
import Link from 'next/link';
import RecentExecutions from '@/components/RecentExecutions';

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

/* --------------------------------------------------------------------
   Demo placeholder data (credits, personas, automations) – swap later
-------------------------------------------------------------------- */
const creditsLeft = 2705;
const creditTotal = 3000;

const contentTypes = [
  {
    id: 'blogpost',
    name: 'Blogpost',
    formUrl: 'https://workflow.wingsuite.io/webhook/blogpost/n8n-form',
  },
];

const agentPersonas = [
  {
    id: 'june',
    name: 'June',
    role: 'Senior Content Writer',
    chatUrl: 'https://workflow.wingsuite.io/webhook/june',
  },
  {
    id: 'eva',
    name: 'Eva',
    role: 'Spelling Check / Feedback',
    chatUrl: 'https://workflow.wingsuite.io/webhook/eva',
  },
];

const automations = [
  {
    id: 'meta-gen',
    name: 'Product Meta Group Generator',
    schedule: 'Once per day',
    lastRun: '2025-01-01 03:00',
    avgCost: '$0.03',
    totalCost: '$13.59',
  },
];

export default function Dashboard() {
  /* live content-storage stats */
  const {
    data: stats = [],
    error: storageError,
    isLoading: storageLoading,
  } = useSWR<FolderStat[]>('/api/content-storage', fetcher, {
    refreshInterval: 60_000,
  });

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
              <p className="text-xs font-medium text-gray-500">Credits left this month</p>
              <p className="text-lg font-semibold text-blue-700">
                {creditsLeft.toLocaleString()} / {creditTotal.toLocaleString()}
              </p>
              <button className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50">
                Buy more
              </button>
            </div>
          </div>
        </Panel>
        {/* Content types */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            What do you want to create?
          </h2>
          <div className="grid grid-cols-2 gap-6 border-x border-b bg-blue-100 p-6 lg:grid-cols-4">
            {contentTypes.map((p) => (
                <Panel key={p.id}>
                  <div className="flex flex-col items-center gap-4 p-6">
                    <div className="space-y-1 text-center">
                      <p className="text-lg font-semibold">{p.name}</p>
                    </div>
                    <button
                        className="w-full rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
                        onClick={() =>
                            window.open(
                                p.formUrl,
                                'form',
                                'noopener,width=480,height=640'
                            )
                        }
                    >
                      New
                    </button>
                  </div>
                </Panel>
            ))}
          </div>
        </div>
            {/* + Add contenttype */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Available Agent Personas
          </h2>
          <div className="grid grid-cols-2 gap-6 border-x border-b bg-blue-100 p-6 lg:grid-cols-4">
            {agentPersonas.map((p) => (
                <Panel key={p.id}>
                  <div className="flex flex-col items-center gap-4 p-6">
                    <div className="space-y-1 text-center">
                      <p className="text-lg font-semibold">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.role}</p>
                    </div>
                    <button
                        className="w-full rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
                        onClick={() =>
                            window.open(
                                p.chatUrl,
                                'agentChat',
                                'noopener,width=480,height=640'
                            )
                        }
                    >
                      Chat
                    </button>
                  </div>
                </Panel>
            ))}
            {/* + Add persona */}
            <Panel>
              <div className="flex h-full w-full cursor-pointer items-center justify-center p-6 text-4xl text-gray-400 hover:text-gray-600">
                +
              </div>
            </Panel>
          </div>
        </div>
        {/* + Recent executions */}
        <RecentExecutions className="max-w-4xl" />

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

        {/* Automations */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Automations
          </h2>
          <div className="border-x border-b bg-blue-100 p-6">
            <div className="grid grid-cols-5 items-center gap-4 text-xs font-semibold text-gray-600">
              <span>Workflow</span>
              <span className="text-center">Schedule</span>
              <span className="text-center">Last run</span>
              <span className="col-span-2 text-center">Avg / Lifetime cost</span>
            </div>
            {automations.map((a) => (
                <div
                    key={a.id}
                    className="grid grid-cols-5 items-center gap-4 border-t py-2 text-sm"
                >
                  <span>{a.name}</span>
                  <span className="text-center">{a.schedule}</span>
                  <span className="text-center">{a.lastRun}</span>
                  <span className="text-center">
                {a.avgCost} <span className="text-xs text-gray-400">avg</span>
              </span>
                  <span className="text-center">{a.totalCost}</span>
                </div>
            ))}
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