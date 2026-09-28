import React from 'react';
import { SourceArticle } from '../types';
import { X, ExternalLink, Globe } from 'lucide-react';
import { getOutletLean, getLeanBadgeStyles } from '../lib/outlets';

interface SourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  sources: SourceArticle[];
}

export const SourcesDrawer: React.FC<SourcesDrawerProps> = ({
  isOpen,
  onClose,
  storyTitle,
  sources,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-neutral-200">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-200 bg-neutral-50/70">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  Reporting Corpus
                </span>
                <h2 className="text-sm font-semibold text-neutral-900 mt-0.5">
                  {sources.length} Sources Analyzed
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2 line-clamp-2 italic">
              "{storyTitle}"
            </p>
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-4 sm:p-5 space-y-4">
            {sources.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                No sources loaded yet for this story.
              </div>
            ) : (
              sources.map((src, index) => {
                const lean = getOutletLean(src.outlet);
                const badgeStyles = getLeanBadgeStyles(lean);

                return (
                  <div key={src.id || index} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-950">
                          {src.outlet}
                        </span>

                        {/* Lean Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyles.dotBg}`} />
                          {lean}
                        </span>

                        {src.country && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                            <Globe className="w-2.5 h-2.5" />
                            {src.country}
                          </span>
                        )}
                      </div>

                      {src.published_at && (
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {new Date(src.published_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-medium text-neutral-800 leading-snug">
                      {src.title}
                    </h3>

                    {src.summary && (
                      <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50/60 p-2.5 rounded border border-neutral-100">
                        {src.summary}
                      </p>
                    )}

                    {src.url && (
                      <div className="pt-0.5">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          <span>Original coverage</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-center text-[11px] text-neutral-500">
            January only incorporates facts independently confirmed across this corpus.
          </div>
        </div>
      </div>
    </div>
  );
};
