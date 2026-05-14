'use client';

import { useState } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import {
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
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

      {/* Brand Guide Card */}
      {personaDocUrl && (
        <div
          className="flex items-center justify-between rounded-xl border p-6"
          style={{ borderColor: branding.primaryColor + '30', backgroundColor: branding.primaryColor + '05' }}
        >
          <div>
            <h3 className="font-medium text-gray-900">Brand Voice Guide</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your complete tone of voice document, generated from the brand interview
            </p>
          </div>
          <a
            href={personaDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Open guide
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      )}

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
