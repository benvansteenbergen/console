'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useBranding } from '@/components/BrandingProvider';
import {
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface ProfileSummary {
  name?: string;
  industry?: string;
  tagline?: string;
  audience?: string;
  tone_keywords?: string[];
  content_types?: string[];
  completeness?: number;
}

interface CompanyProfile {
  status: string;
  profile_summary: ProfileSummary;
  persona_doc_id?: string;
  templates_folder_id?: string;
}

interface BrandIdentityViewProps {
  profile: CompanyProfile;
  onUpdate: () => void;
}

interface ToneOption {
  value: string;
  label: string;
}

interface ToneResponse {
  success: boolean;
  tones: ToneOption[];
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const SECTIONS = [
  { key: 'name', label: 'Company Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'audience', label: 'Target Audience' },
  { key: 'tone_keywords', label: 'Voice & Tone' },
  { key: 'content_types', label: 'Content Types' },
] as const;

export default function BrandIdentityView({ profile, onUpdate }: BrandIdentityViewProps) {
  const branding = useBranding();
  const summary = profile.profile_summary;
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: toneData } = useSWR<ToneResponse>('/api/tone-of-voice', fetcher, {
    revalidateOnFocus: false,
  });

  const tones = toneData?.tones || [];

  const handleRerun = async () => {
    if (!window.confirm('Are you sure you want to reset your profile?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'empty' }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error('Failed to reset profile:', res.status);
        setResetting(false);
        return;
      }
      onUpdate();
    } catch (err) {
      console.error('Failed to reset profile:', err);
      setResetting(false);
    }
  };

  const handleSelectTone = async (docId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ persona_doc_id: docId, status: profile.status }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error('Failed to save persona doc:', res.status);
      } else {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to save persona doc:', err);
    } finally {
      setSaving(false);
    }
  };

  const personaDocUrl = profile.persona_doc_id
    ? `https://docs.google.com/document/d/${profile.persona_doc_id}/edit`
    : null;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brand Identity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your brand profile powers all content creation
        </p>
      </div>

      {/* Brand Voice Document */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Brand Voice Document</h3>
            <p className="mt-1 text-sm text-gray-500">
              {profile.persona_doc_id
                ? 'This document defines your writing style for all content'
                : 'Select a tone-of-voice document to personalize your content'}
            </p>
          </div>
          {personaDocUrl && (
            <a
              href={personaDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Open
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          )}
        </div>

        {tones.length > 0 && (
          <div className="mt-4 space-y-2">
            {tones.map((tone) => {
              const isActive = tone.value === profile.persona_doc_id;
              return (
                <button
                  key={tone.value}
                  onClick={() => handleSelectTone(tone.value)}
                  disabled={saving || isActive}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    isActive
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-60`}
                >
                  <DocumentTextIcon className="h-5 w-5 shrink-0 text-gray-400" />
                  <span className="flex-1">{tone.label}</span>
                  {isActive && <CheckIcon className="h-4 w-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        )}

        {tones.length === 0 && !profile.persona_doc_id && toneData && (
          <p className="mt-4 text-sm text-gray-400">
            No tone-of-voice documents found in your Drive folder.
          </p>
        )}
      </div>

      {/* Profile Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, label }) => {
          const value = summary[key as keyof ProfileSummary];
          const isFilled = Array.isArray(value) ? value.length > 0 : !!value;

          return (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
              </p>
              {isFilled ? (
                <div className="mt-2 text-sm text-gray-700">
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(value as string[]).map((item, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="leading-relaxed">{value as string}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-300">Not set</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <a
          href="/studio"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: branding.primaryColor }}
        >
          Go to Content Studio
        </a>
        <button
          onClick={handleRerun}
          disabled={resetting}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting...' : 'Re-run interview'}
        </button>
      </div>
    </section>
  );
}
