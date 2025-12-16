'use client';

interface ClusterStat {
  docs: number;
  chunks: number;
}

interface ClusterStats {
  [key: string]: ClusterStat;
}

interface KnowledgeBaseOverviewProps {
  clusterStats?: ClusterStats;
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

function getQualityLabel(chunks: number): { text: string; color: string; icon: string } {
  if (chunks === 0) {
    return { text: 'Not available yet', color: 'text-gray-500', icon: '' };
  } else if (chunks < 51) {
    return { text: 'Limited - needs more documents', color: 'text-yellow-600', icon: '' };
  } else if (chunks < 201) {
    return { text: 'Good for basic content', color: 'text-green-600', icon: '✓' };
  } else {
    return { text: 'Excellent for content generation', color: 'text-green-600', icon: '✓' };
  }
}

export default function KnowledgeBaseOverview({ clusterStats }: KnowledgeBaseOverviewProps) {
  if (!clusterStats) {
    return null;
  }

  // Filter to only show clusters with content
  const activeClusters = Object.entries(clusterStats)
    .filter(([_, stat]) => stat.chunks > 0)
    .sort((a, b) => b[1].chunks - a[1].chunks); // Sort by chunk count descending

  if (activeClusters.length === 0) {
    return null;
  }

  const totalDocs = Object.values(clusterStats).reduce((sum, stat) => sum + stat.docs, 0);
  const totalChunks = Object.values(clusterStats).reduce((sum, stat) => sum + stat.chunks, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Knowledge Base Overview</h2>
        <div className="text-sm text-gray-600">
          {totalDocs} documents • {totalChunks} chunks
        </div>
      </div>

      <div className="space-y-3">
        {activeClusters.map(([cluster, stat]) => {
          const quality = getQualityLabel(stat.chunks);
          return (
            <div
              key={cluster}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {CLUSTER_LABELS[cluster] || cluster}
                </div>
                <div className="text-sm text-gray-500">
                  {stat.docs} {stat.docs === 1 ? 'document' : 'documents'} • {stat.chunks} chunks
                </div>
              </div>
              <div className={`text-sm font-medium ${quality.color} flex items-center gap-1`}>
                {quality.icon && <span>{quality.icon}</span>}
                <span>{quality.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
