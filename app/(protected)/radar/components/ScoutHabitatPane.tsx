'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
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
  isConversationActive: boolean;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ScoutHabitatPane({ isConversationActive }: ScoutHabitatPaneProps) {
  const branding = useBranding();
  const pollInterval = isConversationActive ? 2_000 : 30_000;
  const [lastUpdatedSection, setLastUpdatedSection] = useState<string | null>(null);

  const { data: prioritiesData } = useSWR<{ success: boolean; markdown: string }>(
    '/api/radar/priorities',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const { data: followedData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=followed',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const { data: proposedData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=proposed',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const priorities = prioritiesData?.markdown || '';
  const followed = followedData?.sources || [];
  const proposed = proposedData?.sources || [];

  // Track which sections update during active conversation
  const prevPriorities = useState(priorities)[0];
  const prevFollowedLen = useState(followed.length)[0];
  const prevProposedLen = useState(proposed.length)[0];

  useEffect(() => {
    if (!isConversationActive) return;
    if (priorities !== prevPriorities) setLastUpdatedSection('priorities');
    else if (followed.length !== prevFollowedLen) setLastUpdatedSection('followed');
    else if (proposed.length !== prevProposedLen) setLastUpdatedSection('proposed');
  }, [priorities, followed.length, proposed.length, isConversationActive, prevPriorities, prevFollowedLen, prevProposedLen]);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (lastUpdatedSection) {
      const timer = setTimeout(() => setLastUpdatedSection(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdatedSection]);

  const sectionClass = (key: string, isFilled: boolean) => {
    const isHighlighted = lastUpdatedSection === key;
    if (isHighlighted) return 'border-amber-200 bg-amber-50/50 shadow-sm';
    if (isFilled) return 'border-gray-200 bg-white';
    return 'border-dashed border-gray-200 bg-transparent';
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Your Radar</h2>
        {isConversationActive && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <span className="text-xs text-gray-500">Updating live...</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {/* Priorities */}
          <motion.div
            key="priorities"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl border p-4 transition-all duration-500 ${sectionClass('priorities', !!priorities)}`}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
              Priorities
            </div>
            {priorities ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-2"
              >
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{priorities}</ReactMarkdown>
                </div>
              </motion.div>
            ) : (
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
            )}
          </motion.div>

          {/* Proposed sources */}
          <motion.div
            key="proposed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className={`rounded-xl border p-4 transition-all duration-500 ${sectionClass('proposed', proposed.length > 0)}`}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Proposed
              {proposed.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {proposed.length}
                </span>
              )}
            </div>
            {proposed.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-2 space-y-1.5"
              >
                {proposed.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="truncate">{source.name || source.url}</span>
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
            )}
          </motion.div>

          {/* Followed sources */}
          <motion.div
            key="followed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`rounded-xl border p-4 transition-all duration-500 ${sectionClass('followed', followed.length > 0)}`}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Following
              {followed.length > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  {followed.length}
                </span>
              )}
            </div>
            {followed.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-2 space-y-1.5"
              >
                {followed.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="truncate">{source.name || source.url}</span>
                    {source.tone_tag && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 flex-shrink-0">
                        {source.tone_tag}
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
