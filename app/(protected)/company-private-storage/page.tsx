'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import { useBranding } from '@/components/BrandingProvider';
import DocumentLibrary from '@/components/DocumentLibrary';
import KnowledgeBaseOverview from '@/components/KnowledgeBaseOverview';
import PageLoader from '@/components/ui/PageLoader';

const CLUSTER_OPTIONS = [
  { value: 'general_company_info', label: 'General Company Info' },
  { value: 'product_sheets', label: 'Product Sheets' },
  { value: 'pricing_sales', label: 'Pricing & Sales' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'marketing_materials', label: 'Marketing Materials' },
  { value: 'case_studies', label: 'Case Studies' },
  { value: 'technical_specs', label: 'Technical Specs' },
  { value: 'training_materials', label: 'Training Materials' },
  { value: 'no_cluster', label: 'No Cluster' },
];

interface ClusterStat {
  docs: number;
  chunks: number;
}

export default function CompanyPrivateStorage() {
  const { loading } = useSession();
  const branding = useBranding();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cluster, setCluster] = useState('no_cluster');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clusterStats, setClusterStats] = useState<{ [key: string]: ClusterStat } | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = `${branding.name} - Private Storage`;
  }, [branding.name]);

  if (loading) {
    return <PageLoader />;
  }

  const validateFile = (file: File): string | null => {
    // Check file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 10MB.';
    }

    // Check file type
    const allowedTypes = ['.pdf'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return 'Invalid file type. Only PDF files are allowed.';
    }

    return null;
  };

  const extractPDFText = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/knowledge-base/extract-text', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.text) {
        return result.text;
      } else {
        console.error('Text extraction failed:', result.error);
        return '';
      }
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return '';
    }
  };

  const analyzeDocument = async (excerpt: string) => {
    try {
      const formData = new FormData();
      formData.append('excerpt', excerpt);

      const response = await fetch('/api/knowledge-base/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setDescription(result.description);
        setCluster(result.suggested_cluster);
      } else {
        setUploadStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setUploadStatus({ type: 'error', message: 'Cannot connect to helper agent. But can proceed.' });
    }
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadStatus({ type: 'error', message: error });
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^.]+$/, '')); // Remove extension for default title
    setUploadStatus(null);

    // Auto-analyze document
    setAnalyzing(true);
    const excerpt = await extractPDFText(file);
    if (excerpt) {
      await analyzeDocument(excerpt);
    } else {
      setUploadStatus({ type: 'error', message: 'Cannot connect to helper agent. But can proceed.' });
    }
    setAnalyzing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('cluster', cluster);
      formData.append('visibility', visibility);

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: 'Document uploaded successfully!'
        });
        // Reset form
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        setCluster('no_cluster');
        setVisibility('private');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Upload failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Upload failed. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Company Private Storage</h1>
      <p className="text-gray-600 mb-8">
        Upload your private documents to create a knowledge base for AI-powered content generation.
      </p>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Document</h2>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {selectedFile ? (
            <div>
              <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-sm text-gray-500 mt-2">Click to select a different file</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF only (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Analyzing State */}
        {selectedFile && analyzing && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-blue-900">Analyzing your document...</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Our AI is reading your document to suggest a description and category. This usually takes a few seconds.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Document uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Text extracted</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <span>Suggesting category...</span>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Fields */}
        {selectedFile && !analyzing && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Document title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Cluster *
              </label>
              <select
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CLUSTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 flex items-center">
                    <span className="text-gray-900 font-medium">🔒 Private</span>
                    <span className="ml-2 text-sm text-gray-500">(only you can access)</span>
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="shared"
                    checked={visibility === 'shared'}
                    onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 flex items-center">
                    <span className="text-gray-900 font-medium">👥 Organization</span>
                    <span className="ml-2 text-sm text-gray-500">(shared with your team)</span>
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!title || uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus && (
          <div
            className={`mt-4 p-4 rounded-md ${
              uploadStatus.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Knowledge Base Overview */}
      <KnowledgeBaseOverview clusterStats={clusterStats} />

      {/* Document Library */}
      <DocumentLibrary onDataLoaded={setClusterStats} />
    </div>
  );
}
