import { MarkReleaseNotesSeen } from '@/components/VersionBadge';
import { RELEASES, type ChangeKind } from '@/lib/releases';

const KIND_LABELS: Record<ChangeKind, string> = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
};
const KIND_ORDER: ChangeKind[] = ['new', 'improved', 'fixed'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ReleaseNotesPage() {
  return (
    <div className="h-full overflow-auto">
      <MarkReleaseNotesSeen />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">What&apos;s new</h1>
        <p className="mt-1 text-sm text-gray-500">Every change to the platform, newest first.</p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white px-8">
          {RELEASES.map((release, i) => (
            <section key={release.version} className="border-b border-gray-100 py-8 last:border-b-0">
              <p className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">Version {release.version}</span>
                {' · '}
                {formatDate(release.date)}
                {i === 0 && ' · Current'}
              </p>
              <h2 className="mt-1.5 text-lg font-bold leading-snug text-gray-900">{release.title}</h2>
              {release.summary && (
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{release.summary}</p>
              )}

              {KIND_ORDER.map((kind) => {
                const items = release.changes.filter((c) => c.kind === kind);
                if (items.length === 0) return null;
                return (
                  <div key={kind} className="mt-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {KIND_LABELS[kind]}
                    </h3>
                    <ul className="space-y-1.5">
                      {items.map((change) => (
                        <li key={change.text} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                          <span>{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
