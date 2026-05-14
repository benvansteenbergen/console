'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';

interface DraftCardProps {
  content: string;
  reviewSummary?: string;
  onSave: () => void;
  onRefine: (feedback: string) => void;
}

export default function DraftCard({ content, reviewSummary, onSave, onRefine }: DraftCardProps) {
  const branding = useBranding();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefine = () => {
    if (feedback.trim()) {
      onRefine(feedback.trim());
      setFeedback('');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Review badge */}
      {reviewSummary && (
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs font-medium text-gray-500">Review passed</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{reviewSummary}</p>
        </div>
      )}

      {/* Draft content */}
      <div className="px-5 py-4">
        <article className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
          Save to Drive
        </button>
      </div>

      {/* Refinement input */}
      <div className="border-t border-gray-100 px-5 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
            placeholder="Any changes? Tell me what to adjust..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
          />
          <button
            onClick={handleRefine}
            disabled={!feedback.trim()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Refine
          </button>
        </div>
      </div>
    </div>
  );
}
