import React, { useState, useMemo } from 'react';
import { Step2ArticleResult, PipelineExecutionMeta, RunErrorInfo } from '../types';
import {
  diffParagraphs,
  diffSingleText,
  calculateOverallSimilarity,
  DiffToken,
  DiffParagraph,
} from '../lib/diff';
import { Check, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface CompareTabProps {
  baselineArticle: Step2ArticleResult | null;
  customArticle: Step2ArticleResult | null;
  hasCustomRun: boolean;
  totalRuleChanges: number;
  isLoadingBaseline?: boolean;
  baselineMeta?: PipelineExecutionMeta | null;
  customMeta?: PipelineExecutionMeta | null;
  runError?: RunErrorInfo | null;
  baselineError?: RunErrorInfo | null;
  onRetry?: () => void;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  baselineArticle,
  customArticle,
  hasCustomRun,
  totalRuleChanges,
  isLoadingBaseline = false,
  baselineMeta,
  customMeta,
  runError,
  baselineError,
  onRetry,
}) => {
  const [highlightChanges, setHighlightChanges] = useState<boolean>(true);

  // Compute diffs
  const { headlineDiff, standfirstDiff, bodyDiff, similarityPct } = useMemo(() => {
    if (!baselineArticle || !customArticle || !hasCustomRun) {
      return {
        headlineDiff: null,
        standfirstDiff: null,
        bodyDiff: null,
        similarityPct: 100,
      };
    }

    const hDiff = diffSingleText(
      baselineArticle.headline || '',
      customArticle.headline || ''
    );
    const sDiff = diffSingleText(
      baselineArticle.standfirst || '',
      customArticle.standfirst || ''
    );
    const bDiff = diffParagraphs(
      baselineArticle.body || '',
      customArticle.body || ''
    );
    const pct = calculateOverallSimilarity(
      {
        headline: baselineArticle.headline || '',
        standfirst: baselineArticle.standfirst || '',
        body: baselineArticle.body || '',
      },
      {
        headline: customArticle.headline || '',
        standfirst: customArticle.standfirst || '',
        body: customArticle.body || '',
      }
    );

    return {
      headlineDiff: hDiff,
      standfirstDiff: sDiff,
      bodyDiff: bDiff,
      similarityPct: pct,
    };
  }, [baselineArticle, customArticle, hasCustomRun]);

  const renderTokens = (tokens: DiffToken[] = [], isLeft: boolean) => {
    return tokens.map((token, i) => {
      if (!highlightChanges) {
        if (isLeft && token.type === 'added') return null;
        if (!isLeft && token.type === 'removed') return null;
        return <span key={i}>{token.value}</span>;
      }

      if (token.type === 'removed') {
        if (!isLeft) return null;
        return (
          <span
            key={i}
            className="bg-rose-100 text-rose-900 line-through decoration-rose-600 rounded px-0.5 mx-0.2"
          >
            {token.value}
          </span>
        );
      }

      if (token.type === 'added') {
        if (isLeft) return null;
        return (
          <span
            key={i}
            className="bg-emerald-100 text-emerald-900 font-medium rounded px-0.5 mx-0.2"
          >
            {token.value}
          </span>
        );
      }

      return <span key={i}>{token.value}</span>;
    });
  };

  const renderParagraphs = (paragraphs: DiffParagraph[] = [], isLeft: boolean) => {
    return (
      <div className="space-y-3.5 text-xs text-neutral-800 leading-relaxed">
        {paragraphs.map((para, pIdx) => (
          <p key={pIdx}>{renderTokens(para.tokens, isLeft)}</p>
        ))}
      </div>
    );
  };

  // Model & timestamp formatting
  const baselineModelName =
    baselineMeta?.step2Model || baselineMeta?.modelUsed || 'gemini-3.8-flash';
  const baselineTime =
    baselineMeta?.writtenAt ||
    (baselineMeta?.durationSeconds ? `${baselineMeta.durationSeconds}s` : 'Just now');

  const customModelName =
    customMeta?.step2Model || customMeta?.modelUsed || 'gemini-3.8-flash';
  const customTime =
    customMeta?.writtenAt ||
    (customMeta?.durationSeconds ? `${customMeta.durationSeconds}s` : 'Just now');

  // Loading baseline state
  if (isLoadingBaseline || !baselineArticle) {
    if (baselineError) {
      return (
        <div className="bg-white rounded-md border border-rose-300 p-8 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 mx-auto flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-xs font-bold text-rose-950">
            Failed writing baseline without rules ({baselineError.step === 'facts' ? 'Facts analysis' : 'Article writing'} step · HTTP {baselineError.statusCode})
          </p>
          <p className="text-xs font-mono text-rose-900 bg-rose-50 p-2.5 rounded border border-rose-200 max-w-lg mx-auto break-all select-text">
            {baselineError.message}
          </p>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-md border border-neutral-200 p-12 text-center shadow-xs space-y-3">
        <div className="w-10 h-10 rounded-full bg-neutral-100 mx-auto flex items-center justify-center text-neutral-600 animate-spin">
          <RefreshCw className="w-5 h-5 text-neutral-700" />
        </div>
        <p className="text-sm font-semibold text-neutral-800 animate-pulse">
          Writing the version without rules with Gemini…
        </p>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          Gemini is synthesizing facts from the story&apos;s sources and drafting an objective baseline with no custom rules.
        </p>
      </div>
    );
  }

  const baselineBody = baselineArticle.body || '';
  const customBody = customArticle?.body || '';

  return (
    <div className="space-y-4">
      {/* Top control bar: similarity & highlight toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-100/70 border border-neutral-200/80 rounded-md px-3.5 py-2">
        <div className="flex items-center gap-2">
          {hasCustomRun ? (
            <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {similarityPct}% of the wording is the same.
            </span>
          ) : (
            <span className="text-xs text-neutral-500">
              Showing standard baseline. Configure rules and press Write this story to compare.
            </span>
          )}
        </div>

        {hasCustomRun && (
          <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highlightChanges}
              onChange={(e) => setHighlightChanges(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-3.5 h-3.5"
            />
            <span className="font-medium text-[11px]">Highlight changes</span>
          </label>
        )}
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left: WITHOUT RULES (Gemini) */}
        <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Baseline
              </span>
              <h3 className="text-xs font-bold text-neutral-700 mt-0.5">
                WITHOUT RULES (Gemini)
              </h3>
            </div>
            <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
              Standard Engine
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Headline
            </span>
            <h4 className="text-sm font-semibold text-neutral-950 leading-snug">
              {headlineDiff
                ? renderTokens(headlineDiff.leftTokens, true)
                : baselineArticle.headline}
            </h4>
          </div>

          {/* Standfirst */}
          <div className="space-y-1 bg-neutral-50/80 p-3 rounded border border-neutral-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Standfirst
            </span>
            <p className="text-xs text-neutral-700 leading-relaxed italic">
              {standfirstDiff
                ? renderTokens(standfirstDiff.leftTokens, true)
                : baselineArticle.standfirst}
            </p>
          </div>

          {/* Body */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Article Body
            </span>
            {bodyDiff ? (
              renderParagraphs(bodyDiff.leftParagraphs, true)
            ) : (
              <div className="space-y-3 text-xs text-neutral-800 leading-relaxed">
                {baselineBody.split(/\n\s*\n/).map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            )}
          </div>

          {/* Key points */}
          {baselineArticle.key_points && baselineArticle.key_points.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Key Points
              </span>
              <ul className="space-y-1.5 text-xs text-neutral-700">
                {baselineArticle.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Small line: Written by <model name> · <time> */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
            <span>
              Written by <span className="font-mono text-neutral-600 font-medium">{baselineModelName}</span> · {baselineTime}
            </span>
            {baselineMeta?.cached && (
              <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200">
                cached
              </span>
            )}
          </div>
        </div>

        {/* Right: WITH YOUR RULES (black border) */}
        <div className="bg-white rounded-md border-2 border-neutral-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                Custom Output
              </span>
              <h3 className="text-xs font-bold text-neutral-950 mt-0.5">
                WITH YOUR RULES
              </h3>
            </div>
            {hasCustomRun ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-neutral-900 text-white px-2 py-0.5 rounded">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                Rules Applied
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                Awaiting Run
              </span>
            )}
          </div>

          {!hasCustomRun || !customArticle ? (
            runError ? (
              <div className="py-12 px-2 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 mx-auto flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    Failed during {runError.step === 'facts' ? 'Facts analysis (Step 1)' : runError.step === 'writing' ? 'Article writing (Step 2)' : runError.step}
                  </span>
                  <h4 className="text-xs font-bold text-neutral-900 mt-2">
                    HTTP {runError.statusCode} Error
                  </h4>
                  <div className="mt-2 text-left bg-rose-50/90 border border-rose-200 rounded p-3 text-xs font-mono text-rose-900 break-all max-h-48 overflow-y-auto select-text">
                    {runError.message}
                  </div>
                </div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try again</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 mx-auto flex items-center justify-center text-neutral-400">
                  <Sparkles className="w-5 h-5 text-neutral-600" />
                </div>
                <p className="text-xs font-medium text-neutral-700">
                  Add a rule and press <span className="font-semibold text-neutral-950">Write this story</span>.
                </p>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                  {totalRuleChanges > 0
                    ? `You currently have ${totalRuleChanges} rule change(s) queued.`
                    : 'Try adding a banned word or changing the headline rule in the left column.'}
                </p>
              </div>
            )
          ) : (
            <>
              {/* Headline */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                  Headline
                </span>
                <h4 className="text-sm font-semibold text-neutral-950 leading-snug">
                  {headlineDiff
                    ? renderTokens(headlineDiff.rightTokens, false)
                    : customArticle.headline}
                </h4>
              </div>

              {/* Standfirst */}
              <div className="space-y-1 bg-neutral-50/80 p-3 rounded border border-neutral-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                  Standfirst
                </span>
                <p className="text-xs text-neutral-700 leading-relaxed italic">
                  {standfirstDiff
                    ? renderTokens(standfirstDiff.rightTokens, false)
                    : customArticle.standfirst}
                </p>
              </div>

              {/* Body */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                  Article Body
                </span>
                {bodyDiff ? (
                  renderParagraphs(bodyDiff.rightParagraphs, false)
                ) : (
                  <div className="space-y-3 text-xs text-neutral-800 leading-relaxed">
                    {customBody.split(/\n\s*\n/).map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Key points */}
              {customArticle.key_points && customArticle.key_points.length > 0 && (
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                    Key Points
                  </span>
                  <ul className="space-y-1.5 text-xs text-neutral-700">
                    {customArticle.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Small line: Written by <model name> · <time> */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <span>
                  Written by <span className="font-mono text-neutral-700 font-medium">{customModelName}</span> · {customTime}
                </span>
                {customMeta?.cached && (
                  <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200">
                    cached
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
