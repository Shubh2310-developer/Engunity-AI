import React, { useState } from 'react';
import { FileText, ExternalLink, X } from 'lucide-react';

export interface Source {
  filename: string;
  page?: number;
  section?: string;
  confidence?: number;
  chunk_text?: string;
  metadata?: Record<string, any>;
}

interface SourcesPanelProps {
  sources: Source[];
  className?: string;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ sources, className = '' }) => {
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <>
      <section className={`mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-4 ${className}`}>
        <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Sources ({sources.length})
        </h3>

        <ul className="space-y-2">
          {sources.map((source, index) => (
            <SourceChip
              key={index}
              source={source}
              index={index + 1}
              onPreview={() => setPreviewSource(source)}
            />
          ))}
        </ul>
      </section>

      {/* Source Preview Drawer */}
      {previewSource && (
        <SourceDrawer
          source={previewSource}
          onClose={() => setPreviewSource(null)}
        />
      )}
    </>
  );
};

// Individual source chip component
interface SourceChipProps {
  source: Source;
  index: number;
  onPreview: () => void;
}

const SourceChip: React.FC<SourceChipProps> = ({ source, index, onPreview }) => {
  const confidence = source.confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);

  // Color ramp: red -> amber -> green
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.75) return 'bg-emerald-500';
    if (conf >= 0.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <li className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700
      bg-white dark:bg-zinc-800/50
      hover:bg-zinc-50 dark:hover:bg-zinc-800/80
      hover:shadow-sm transition-all duration-150">

      {/* Icon and Index */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30
          flex items-center justify-center text-sky-700 dark:text-sky-300 font-semibold text-sm">
          {index}
        </div>
      </div>

      {/* Source Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {source.filename}
          </div>
        </div>

        {/* Page/Section info */}
        {(source.page || source.section) && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
            {source.page && `Page ${source.page}`}
            {source.page && source.section && ' • '}
            {source.section}
          </div>
        )}

        {/* Confidence Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className={`h-full ${getConfidenceColor(confidence)} transition-all duration-300`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 w-10 text-right">
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Preview Button */}
      <button
        onClick={onPreview}
        className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-md
          bg-zinc-100 dark:bg-zinc-700
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-200 dark:hover:bg-zinc-600
          border border-zinc-300 dark:border-zinc-600
          transition-colors flex items-center gap-1.5"
      >
        <ExternalLink className="w-3 h-3" />
        Preview
      </button>
    </li>
  );
};

// Source preview drawer/modal
interface SourceDrawerProps {
  source: Source;
  onClose: () => void;
}

const SourceDrawer: React.FC<SourceDrawerProps> = ({ source, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-zinc-900
        shadow-2xl z-50 overflow-y-auto animate-slide-in-right">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700
          px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Source Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Filename */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Document
            </label>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {source.filename}
            </p>
          </div>

          {/* Page/Section */}
          {(source.page || source.section) && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Location
              </label>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {source.page && `Page ${source.page}`}
                {source.page && source.section && ' • '}
                {source.section}
              </p>
            </div>
          )}

          {/* Confidence */}
          {source.confidence !== undefined && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Relevance Score
              </label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className={`h-full ${
                      source.confidence >= 0.75 ? 'bg-emerald-500' :
                      source.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(source.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {Math.round(source.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Chunk Text Preview */}
          {source.chunk_text && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Content Preview
              </label>
              <div className="mt-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {source.chunk_text}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          {source.metadata && Object.keys(source.metadata).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Metadata
              </label>
              <div className="mt-2 space-y-2">
                {Object.entries(source.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{key}:</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
