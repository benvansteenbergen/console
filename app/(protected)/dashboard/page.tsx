import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// ⚡️  Wingsuite – Client Dashboard
// ---------------------------------------------------------------------------
// This component is **static‑data ready**: replace the hard‑coded demo arrays
// (agentPersonas, storages, automations, apis) with real data fetched from
// your /api endpoints once they're ready.
// ---------------------------------------------------------------------------

export default function Dashboard() {
  /* ----------------------------------------------------------------------- */
  /*  Demo placeholders – substitute with props or SWR fetches later          */
  /* ----------------------------------------------------------------------- */
  const agentPersonas = [
    { id: "june",   name: "June", role: "Senior Content Writer" },
    { id: "eva",    name: "Eva",  role: "Spelling Check / Feedback" },
  ];

  const storages = [
    { id: "blog",      label: "Blogposts",  items: 10 },
    { id: "linkedin",  label: "Linkedin",  items: 2  },
    { id: "news",      label: "Newsletters", items: 0 },
  ];

  const automations = [
    {
      id: "meta-gen",
      name: "Product Meta Group Generator",
      schedule: "Once per day",
      lastRun: "2025‑01‑01 03:00",
      avgCost: "$0.03",
      totalCost: "$13.59",
    },
  ];

  const apis: { id: string; name: string }[] = [];

  /* ----------------------------------------------------------------------- */
  /*  JSX                                                                    */
  /* ----------------------------------------------------------------------- */
  return (
      <section className="mx-auto w-full max-w-6xl space-y-10 px-6 py-10">
        {/* ------------------------------------------------------------------ */}
        {/*  Heading                                                           */}
        {/* ------------------------------------------------------------------ */}
        <h1 className="rounded-xl border bg-blue-50 px-6 py-4 text-3xl font-bold shadow">
          Welcome to Wingsuite
        </h1>

        {/* ------------------------------------------------------------------ */}
        {/*  Agent Personas                                                    */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <h2 className="rounded-t-xl border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Available Agent Personas
          </h2>
          <div className="grid grid-cols-2 gap-6 border-x border-b bg-blue-100 p-6 lg:grid-cols-4">
            {agentPersonas.map((p) => (
                <Card key={p.id} className="flex flex-col items-center bg-white">
                  <CardContent className="flex flex-1 flex-col items-center justify-between gap-4 p-6">
                    <div className="space-y-1 text-center">
                      <p className="text-lg font-semibold">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.role}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Chat
                    </Button>
                  </CardContent>
                </Card>
            ))}
            {/* + Add persona */}
            <Card className="flex cursor-pointer items-center justify-center bg-white hover:bg-gray-50">
              <CardContent className="flex h-full w-full items-center justify-center p-6 text-4xl text-gray-300">
                +
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/*  Content Storage                                                   */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <h2 className="rounded-t-xl border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Content Storage (Google Drive)
          </h2>
          <div className="grid grid-cols-3 gap-6 border-x border-b bg-blue-100 p-6">
            {storages.map((s) => (
                <Card key={s.id} className="flex flex-col items-center bg-white p-6 text-center">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-gray-500">({s.items} items)</p>
                </Card>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/*  Automations                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <h2 className="rounded-t-xl border-x border-t bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Automations
          </h2>
          <div className="border-x border-b bg-blue-100 p-6">
            <div className="grid grid-cols-5 items-center gap-4 text-xs font-semibold text-gray-600">
              <span>Workflow</span>
              <span className="text-center">Schedule</span>
              <span className="text-center">Last run</span>
              <span className="text-center col-span-2">Avg / Lifetime cost</span>
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

        {/* ------------------------------------------------------------------ */}
        {/*  APIs                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <h2 className="rounded-xl border bg-blue-50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
            API’s
          </h2>
          <div className="border-x border-b bg-blue-100 p-6 text-center text-sm text-gray-500">
            {apis.length === 0 ? 'No API endpoints yet…' : 'TODO: list APIs'}
          </div>
        </div>
      </section>
  );
}