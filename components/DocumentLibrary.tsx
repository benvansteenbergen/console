'use client';

import { useState } from 'react';
import useSWR from 'swr';

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
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.document_id}
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
                  <span className="text-lg" title={doc.visibility === 'private' ? 'Private document' : 'Shared with organization'}>
                    {doc.visibility === 'private' ? '🔒' : '👥'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{doc.chunks} chunks</span>
                  <span>•</span>
                  <span>{new Date(doc.creationTimeUnix).toLocaleDateString()}</span>
                </div>
              </div>

              {doc.canDelete && (
                <button
                  onClick={() => handleDelete(doc.document_id, doc.title)}
                  disabled={deleting === doc.document_id}
                  className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {deleting === doc.document_id ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
