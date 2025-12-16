'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import { useBranding } from '@/components/BrandingProvider';
import DocumentLibrary from '@/components/DocumentLibrary';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = `${branding.name} - Private Storage`;
  }, [branding.name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
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
      // Dynamic import to avoid server-side bundling issues
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let text = '';
      // Extract text from first 3 pages max
      const numPages = Math.min(pdf.numPages, 3);

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item): item is typeof item & { str: string } => 'str' in item)
          .map(item => item.str)
          .join(' ');
        text += pageText + '\n';
      }

      return text.substring(0, 2000); // First 2000 chars
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

        {/* Metadata Fields */}
        {selectedFile && (
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
                disabled={analyzing}
              >
                {CLUSTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {analyzing && (
                <p className="text-xs text-gray-500 mt-1">Analyzing document...</p>
              )}
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

      {/* Document Library */}
      <DocumentLibrary />

      {/* Coming Soon: Test Search */}
      <div className="bg-gray-50 rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
        <h2 className="text-xl font-semibold mb-2 text-gray-500">Test Search</h2>
        <p className="text-gray-400">Chat with your knowledge base to test search quality (coming soon)</p>
      </div>
    </div>
  );
}
