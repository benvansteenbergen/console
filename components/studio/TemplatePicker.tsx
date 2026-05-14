'use client';

import useSWR from 'swr';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface FormatTemplate {
  id: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface TemplatePickerProps {
  onSelect: (format: FormatTemplate) => void;
  onFreeform: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TemplatePicker({ onSelect, onFreeform }: TemplatePickerProps) {
  const { data: formats, isLoading } = useSWR<FormatTemplate[]>('/api/studio/formats', fetcher);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What do you want to create?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick a format template or start writing freely
        </p>
      </div>

      {/* Freeform card */}
      <button
        onClick={onFreeform}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-left transition-all hover:border-gray-300 hover:shadow-sm"
      >
        <p className="text-sm font-medium text-gray-900">Write freely</p>
        <p className="mt-1 text-xs text-gray-500">
          No template — just tell me what you need and I&apos;ll write it
        </p>
      </button>

      {/* Format templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : formats && Array.isArray(formats) && formats.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => onSelect(fmt)}
              className="group rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <DocumentTextIcon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{fmt.name}</p>
                  {fmt.description && (
                    <p className="mt-1 text-xs text-gray-500">{fmt.description}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No format templates available yet</p>
      )}
    </div>
  );
}
