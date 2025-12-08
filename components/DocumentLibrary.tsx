'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface Document {
  documentId: string;
  title: string;
  description: string;
  tags: string[];
  filename: string;
  fileType: string;
  uploadedAt: string;
  totalChunks: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DocumentLibrary() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; documents: Document[] }>(
    '/api/knowledge-base/documents',
    fetcher,
    {
      refreshInterval: 0, // Only fetch on mount and manual refresh
    }
  );

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(documentId);

    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        mutate();
      } else {
        alert(result.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <div className="text-center py-8 text-red-600">
          Failed to load documents. Please try again.
        </div>
      </div>
    );
  }

  const documents = data?.documents || [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Documents</h2>
        <button
          onClick={() => mutate()}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents uploaded yet. Upload your first PDF above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-red-600 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                </div>
                {doc.description && (
                  <p className="text-sm text-gray-600 mt-1 truncate">{doc.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{doc.filename}</span>
                  <span>•</span>
                  <span>{doc.totalChunks} chunks</span>
                  <span>•</span>
                  <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(doc.documentId, doc.title)}
                disabled={deleting === doc.documentId}
                className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {deleting === doc.documentId ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
