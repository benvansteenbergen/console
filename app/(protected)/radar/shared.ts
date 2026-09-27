import useSWR from 'swr';

export interface RadarScout {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at?: string;
  has_priorities?: boolean;
  sources_followed?: number;
  sources_proposed?: number;
  sources_failing?: number;
  sources_suspended?: number;
  finds_week?: number;
  last_find_at?: string | null;
}

export interface RadarSource {
  id: string;
  url: string;
  name: string;
  category: string;
  tone_tag: string;
  because_quote: string;
  status: string;
  notes?: string | null;
  scout_id?: string | null;
  created_at: string;
}

export interface RadarConcept {
  id: string;
  source_id: string;
  scout_id?: string | null;
  scout_name?: string | null;
  article_url: string;
  headline: string;
  concept_body: string;
  alignment_quote: string;
  alignment_priority: string;
  alignment_why: string;
  verdict: string | null;
  verdict_body: string | null;
  verdict_writing_note: string | null;
  status: string;
  banner_seen: boolean;
  created_at: string;
}

export interface ScoutProfile {
  name?: string;
  industry?: string;
  tagline?: string;
  audience?: string;
  tone_keywords?: string[];
  content_types?: string[];
  recommendations?: Array<{ format?: string; topic?: string; reason?: string }>;
}

export const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

export const sourcesKey = (scoutId: string, status: string) =>
  `/api/radar/sources?status=${status}&scout_id=${scoutId}`;

export const SCOUTS_KEY = '/api/radar/scouts';

/** The profile the user already gave during the brand interview. Scout stands on this. */
export function useScoutProfile(): ScoutProfile {
  const { data } = useSWR<{
    profile_summary?: ScoutProfile;
    website_scan?: { recommendations?: ScoutProfile['recommendations'] };
  }>('/api/company-profile', fetcher);
  return {
    ...(data?.profile_summary || {}),
    recommendations: data?.website_scan?.recommendations || [],
  };
}
