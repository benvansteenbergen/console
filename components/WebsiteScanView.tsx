'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBranding } from '@/components/BrandingProvider';

interface WebsiteScanResult {
  pagesScanned?: number;
  chunksIngested?: number;
  clusterBreakdown?: Record<string, number>;
  gaps?: Array<{ type: string; area: string; message: string }>;
  recommendations?: Array<{ format: string; topic: string; reason: string }>;
}

interface WebsiteScanViewProps {
  scanResult?: WebsiteScanResult;
  onComplete: () => void;
  onSkip: () => void;
}

const CLUSTER_LABELS: Record<string, string> = {
  product_sheets: 'Product Sheets',
  general_company_info: 'Company Info',
  marketing_materials: 'Marketing',
  case_studies: 'Case Studies',
  pricing_sales: 'Pricing & Sales',
  documentation: 'Documentation',
  technical_specs: 'Technical Specs',
  training_materials: 'Training',
};

export default function WebsiteScanView({ scanResult, onComplete, onSkip }: WebsiteScanViewProps) {
  const branding = useBranding();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<WebsiteScanResult | undefined>(scanResult);
  const [error, setError] = useState<string | null>(null);

  const startScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError(null);

    try {
      const res = await fetch('/api/company-profile/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: WebsiteScanResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Scan error:', err);
      setError('Scan failed. Check the URL and try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleSkip = async () => {
    try {
      await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'complete' }),
      });
      onSkip();
    } catch (err) {
      console.error('Skip error:', err);
    }
  };

  // Show results if scan completed
  if (result && !scanning) {
    const breakdown = result.clusterBreakdown || {};
    const maxChunks = Math.max(...Object.values(breakdown), 1);

    return (
      <section className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Scan Complete</h1>
          <p className="mt-1 text-sm text-gray-500">
            {result.pagesScanned} pages scanned, {result.chunksIngested} knowledge chunks added
          </p>
        </div>

        {/* Cluster breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-900">Knowledge Base Coverage</h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([cluster, count]) => (
              <div key={cluster} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-gray-500">
                  {CLUSTER_LABELS[cluster] || cluster}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: branding.primaryColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxChunks) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-xs font-medium text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps */}
        {result.gaps && result.gaps.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
            <h3 className="mb-3 text-sm font-medium text-amber-900">Content Gaps</h3>
            <ul className="space-y-2">
              {result.gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {gap.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-900">Recommended First Content</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.recommendations.map((rec, i) => (
                <a
                  key={i}
                  href={`/studio?format=${encodeURIComponent(rec.format)}&topic=${encodeURIComponent(rec.topic)}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {rec.format.replace(/-/g, ' ')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {rec.topic}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{rec.reason}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Continue CTA */}
        <div className="text-center">
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Continue to your profile
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  // Input + scanning state
  return (
    <section className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {scanning ? 'Scanning your website...' : 'One more thing'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {scanning
              ? 'Extracting content and building your knowledge base'
              : 'Nu ken ik je stem. Laat me nu je website bekijken, dan weet ik ook wat je de wereld al vertelt — en wat je nog mist.'
            }
          </p>
        </div>

        {scanning ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-current" style={{ color: branding.primaryColor }} />
            <p className="text-xs text-gray-400">This may take a moment</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startScan()}
                placeholder="https://yourcompany.com"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <button
                onClick={startScan}
                disabled={!url.trim()}
                className="rounded-xl px-5 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Scan
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </section>
  );
}
