'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface Document {
  document_id: string;
  title: string;
  chunks: number;
  creationTimeUnix: number;
  visibility: 'private' | 'shared';
  canDelete: boolean;
  cluster?: string;
}

interface ClusterStat {
  docs: number;
  chunks: number;
}

interface DocumentLibraryProps {
  onDataLoaded?: (clusterStats: { [key: string]: ClusterStat }) => void;
}

const CLUSTER_LABELS: { [key: string]: string } = {
  general_company_info: 'General Company Info',
  product_sheets: 'Product Sheets',
  pricing_sales: 'Pricing & Sales',
  documentation: 'Documentation',
  marketing_materials: 'Marketing Materials',
  case_studies: 'Case Studies',
  technical_specs: 'Technical Specs',
  training_materials: 'Training Materials',
  no_cluster: 'Uncategorized',
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Mirror the Content Library's relative-date style.
function relativeDate(unix: number): string {
  if (!unix) return '';
  const ms = unix < 1e12 ? unix * 1000 : unix;
  const diffDays = Math.floor((Date.now() - ms) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  if (diffDays < 30) return 'This month';
  if (diffDays < 60) return 'Last month';
  return new Date(ms).toLocaleDateString();
}

export default function DocumentLibrary({ onDataLoaded }: DocumentLibraryProps) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    documents: Document[];
    clusterStats?: { [key: string]: ClusterStat };
  }>(
    '/api/knowledge-base/documents',
    fetcher,
    {
      refreshInterval: 0,
      onSuccess: (data) => {
        if (data?.clusterStats && onDataLoaded) {
          onDataLoaded(data.clusterStats);
        }
      },
    }
  );

  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');

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

  const allDocuments = data?.documents || [];

  // Filter documents by selected cluster
  const documents = selectedCluster === 'all'
    ? allDocuments
    : allDocuments.filter(doc => doc.cluster === selectedCluster);

  // Get unique clusters from documents for filter dropdown
  const availableClusters = Array.from(
    new Set(allDocuments.map(doc => doc.cluster).filter(Boolean))
  ).sort();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Documents</h2>
        <div className="flex items-center gap-4">
          {availableClusters.length > 0 && (
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Clusters</option>
              {availableClusters.map((cluster) => (
                <option key={cluster} value={cluster}>
                  {CLUSTER_LABELS[cluster as string] || cluster}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => mutate()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {allDocuments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents uploaded yet. Upload your first PDF above to get started.
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents found in this cluster.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const clusterLabel = CLUSTER_LABELS[doc.cluster as string] || 'Uncategorized';
            return (
              <div
                key={doc.document_id}
                className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-300 group-hover:text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-words text-sm font-medium text-gray-900" title={doc.title}>
                        {doc.title}
                      </p>
                      <span className="ml-1 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                        {clusterLabel}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                      <span title={doc.visibility === 'private' ? 'Private' : 'Shared with organization'}>
                        {doc.visibility === 'private' ? '🔒' : '👥'}
                      </span>
                      <span>{relativeDate(doc.creationTimeUnix)}</span>
                    </p>
                  </div>
                </div>

                {doc.canDelete && (
                  <button
                    onClick={() => handleDelete(doc.document_id, doc.title)}
                    disabled={deleting === doc.document_id}
                    title="Delete document"
                    className="absolute bottom-2 right-2 rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deleting === doc.document_id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h4a1 1 0 001-1V7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
