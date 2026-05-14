'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useBranding } from '@/components/BrandingProvider';
import BrandInterview from '@/components/BrandInterview';
import BrandIdentityView from '@/components/BrandIdentityView';
import WebsiteScanView from '@/components/WebsiteScanView';
import PageLoader from '@/components/ui/PageLoader';

interface CompanyProfile {
  status: 'empty' | 'interviewing' | 'scanning' | 'complete';
  profile_summary: ProfileSummary;
  persona_doc_id?: string;
  templates_folder_id?: string;
  interview_conversation_id?: string;
  website_url?: string;
  website_scan?: WebsiteScanResult;
}

interface ProfileSummary {
  name?: string;
  industry?: string;
  tagline?: string;
  audience?: string;
  tone_keywords?: string[];
  content_types?: string[];
  completeness?: number;
}

interface WebsiteScanResult {
  pagesScanned?: number;
  chunksIngested?: number;
  clusterBreakdown?: Record<string, number>;
  gaps?: Array<{ type: string; area: string; message: string }>;
  recommendations?: Array<{ format: string; topic: string; reason: string }>;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ProfilePage() {
  const branding = useBranding();
  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR<CompanyProfile>('/api/company-profile', fetcher);

  useEffect(() => {
    document.title = `${branding.name} - Brand Identity`;
  }, [branding.name]);

  if (isLoading) return <PageLoader />;

  // Treat errors (e.g. n8n workflow not deployed yet) as empty profile
  const status = error ? 'empty' : (profile?.status || 'empty');

  if (status === 'empty' || status === 'interviewing') {
    return (
      <BrandInterview
        conversationId={profile?.interview_conversation_id}
        profileSummary={profile?.profile_summary || {}}
        onComplete={() => mutate()}
      />
    );
  }

  if (status === 'scanning') {
    return (
      <WebsiteScanView
        scanResult={profile?.website_scan}
        onComplete={() => mutate()}
        onSkip={() => mutate()}
      />
    );
  }

  return (
    <BrandIdentityView
      profile={profile!}
      onUpdate={() => mutate()}
    />
  );
}
