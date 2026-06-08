'use client';

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '@/components/BrandingProvider';

interface RadarSource {
  id: string;
  url: string;
  name: string;
  category: string;
  tone_tag: string;
  because_quote: string;
  status: string;
  created_at: string;
}

interface ScoutHabitatPaneProps {
  profile?: {
    name?: string;
    industry?: string;
    tagline?: string;
    audience?: string;
    tone_keywords?: string[];
    content_types?: string[];
    recommendations?: Array<{ format?: string; topic?: string; reason?: string }>;
  };
  /** True once Scout has closed the conversation and curation is running. */
  isComplete: boolean;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ScoutHabitatPane({ profile, isComplete }: ScoutHabitatPaneProps) {
  const branding = useBranding();

  // Only look for proposed sources once Scout has closed, polling until the first batch lands, then stop.
  const { data: proposedData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    isComplete ? '/api/radar/sources?status=proposed' : null,
    fetcher,
    { refreshInterval: (latest) => (latest?.sources?.length ? 0 : 4_000) },
  );

  const proposed = proposedData?.sources || [];

  const name = profile?.name?.trim();
  const audience = profile?.audience?.trim();
  const industry = profile?.industry?.trim();
  const tagline = profile?.tagline?.trim();
  const tone = (profile?.tone_keywords || []).filter(Boolean);
  const types = (profile?.content_types || []).filter(Boolean);
  const ideas = (profile?.recommendations || [])
    .map((r) => r.topic || r.format)
    .filter(Boolean)
    .slice(0, 4) as string[];

  const hasProfile = !!(name || industry || audience || tone.length || types.length);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900">Wat Scout van je weet</h2>
      <p className="mt-1 text-xs text-gray-500">
        Uit je merkprofiel. Hierop bouwt Scout verder.
      </p>

      {/* What Scout already knows, static and honest, no fake "live" */}
      <div className="mt-5 space-y-4">
        {hasProfile ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {(name || tagline) && (
              <div className="mb-3">
                {name && <p className="text-sm font-semibold text-gray-900">{name}</p>}
                {tagline && <p className="text-xs text-gray-500">{tagline}</p>}
              </div>
            )}
            <dl className="space-y-2.5 text-sm">
              {industry && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">Branche</dt>
                  <dd className="text-gray-700">{industry}</dd>
                </div>
              )}
              {audience && (
                <div>
                  <dt className="text-xs font-medium text-gray-400">Doelgroep</dt>
                  <dd className="text-gray-700">{audience}</dd>
                </div>
              )}
              {tone.length > 0 && (
                <div>
                  <dt className="mb-1 text-xs font-medium text-gray-400">Toon</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {tone.map((t) => (
                      <span
                        key={t}
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: branding.primaryColor + '14',
                          color: branding.primaryColor,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {types.length > 0 && (
                <div>
                  <dt className="mb-1 text-xs font-medium text-gray-400">Content die je maakt</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {types.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {t}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {ideas.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-xs font-medium text-gray-400">Ideeën uit je website-scan</p>
                <ul className="space-y-1">
                  {ideas.map((idea) => (
                    <li key={idea} className="flex items-start gap-2 text-xs text-gray-600">
                      <span
                        className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: branding.primaryColor }}
                      />
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400">
            Nog geen merkprofiel gevonden. Scout vraagt zo een paar dingen na.
          </div>
        )}

        {/* Proposed sources reveal, only after Scout closes */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              key="proposed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Voorgestelde bronnen
                {proposed.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{proposed.length}</span>
                )}
              </div>

              {proposed.length > 0 ? (
                <motion.ul layout className="mt-3 space-y-2">
                  {proposed.map((s, i) => (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                      className="text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                        <span className="truncate font-medium text-gray-800">{s.name || s.url}</span>
                        {s.tone_tag && (
                          <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {s.tone_tag}
                          </span>
                        )}
                      </div>
                      {s.because_quote && (
                        <p className="mt-0.5 pl-3.5 text-xs italic text-gray-400">
                          “{s.because_quote}”
                        </p>
                      )}
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  Scout zoekt nu bronnen voor je…
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
