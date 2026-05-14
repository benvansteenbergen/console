'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface ContentPreviewProps {
  file: {
    id: string;
    name: string;
    mimeType?: string;
    webViewLink?: string;
    content?: string;
    createdTime?: string;
    modifiedTime?: string;
  };
  onClose: () => void;
}

export default function ContentPreview({ file, onClose }: ContentPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (file.content) {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadUrl = file.id
    ? `/api/drive/file?fileId=${file.id}&download=true`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Slide-over */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-xl sm:w-[480px]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="truncate text-sm font-medium text-gray-900">{file.name}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
          {file.content && (
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
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Download
            </a>
          )}
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              Open in Drive
            </a>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {file.content ? (
            <article className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{file.content}</ReactMarkdown>
            </article>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">Preview not available</p>
              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Open in Google Drive
                </a>
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        {(file.createdTime || file.modifiedTime) && (
          <div className="border-t border-gray-100 px-6 py-4">
            <dl className="space-y-1 text-xs text-gray-400">
              {file.createdTime && (
                <div className="flex justify-between">
                  <dt>Created</dt>
                  <dd>{new Date(file.createdTime).toLocaleDateString()}</dd>
                </div>
              )}
              {file.modifiedTime && (
                <div className="flex justify-between">
                  <dt>Modified</dt>
                  <dd>{new Date(file.modifiedTime).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
