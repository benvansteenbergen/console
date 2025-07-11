'use client';
// ---------------------------------------------------------------------------
// ⚡️  Wingsuite – Client Dashboard (Tailwind-only version)
// ---------------------------------------------------------------------------
// ESLint no-irregular-whitespace fix: replaced all non-ASCII spaces/dashes.
// ---------------------------------------------------------------------------

export default function Dashboard() {
  /* ----------------------------------------------------------------------- */
  /*  Demo placeholders – swap with SWR / fetch hooks later                   */
  /* ----------------------------------------------------------------------- */
  const creditsLeft = 2705; // ← pull from /api/credits
  const creditTotal = 3000;

  const agentPersonas = [
    {
      id: 'june',
      name: 'June',
      role: 'Senior Content Writer',
      chatUrl: 'https://workflow.wingsuite.io/webhook/june', // ← replace
    },
    {
      id: 'eva',
      name: 'Eva',
      role: 'Spelling Check / Feedback',
      chatUrl: 'https://workflow.wingsuite.io/webhook/eva', // ← replace
    },
  ];

  const storages = [
    { id: 'blog', label: 'Blogposts', items: 10 },
    { id: 'linkedin', label: 'LinkedIn', items: 2 },
    { id: 'news', label: 'Newsletters', items: 0 },
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

  const apis: { id: string; name: string }[] = [];

  /* ----------------------------------------------------------------------- */
  /*  Helpers                                                                */
  /* ----------------------------------------------------------------------- */
  const Panel = ({ children }: { children: React.ReactNode }) => (
      <div className="rounded-lg border bg-white shadow-sm">{children}</div>
  );

  /* ----------------------------------------------------------------------- */
  /*  JSX                                                                    */
  /* ----------------------------------------------------------------------- */
  return (
      <section className="mx-auto w-full max-w-6xl space-y-10 px-6 py-10">
        {/* Heading + Credits banner */}
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

        {/* Agent Personas */}
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

        {/* Content Storage */}
        <div>
          <h2 className="rounded-t-lg border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Content Storage (Google Drive)
          </h2>
          <div className="grid grid-cols-3 gap-6 border-x border-b bg-blue-100 p-6">
            {storages.map((s) => (
                <Panel key={s.id}>
                  <div className="flex flex-col items-center gap-1 p-6 text-center">
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-gray-500">({s.items} items)</p>
                  </div>
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
            {apis.length === 0 ? 'No API endpoints yet…' : 'TODO: list APIs'}
          </div>
        </div>
      </section>
  );
}
