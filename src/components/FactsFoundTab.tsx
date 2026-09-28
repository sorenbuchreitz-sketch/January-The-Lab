import React from 'react';
import { Step1AnalysisResult } from '../types';
import { CheckCircle2, AlertCircle, HelpCircle, Layers } from 'lucide-react';
import { getOutletLean, getLeanBadgeStyles } from '../lib/outlets';

interface FactsFoundTabProps {
  step1: Step1AnalysisResult | null;
  isLoading?: boolean;
}

export const FactsFoundTab: React.FC<FactsFoundTabProps> = ({
  step1,
  isLoading = false,
}) => {
  if (!step1) {
    if (isLoading) {
      return (
        <div className="bg-white rounded-md border border-neutral-200 p-12 text-center text-xs text-neutral-600 shadow-xs space-y-2">
          <p className="font-semibold text-neutral-800 animate-pulse">
            Writing the version without rules with Gemini…
          </p>
          <p className="text-[11px] text-neutral-400">
            Finding consensus facts and examining source reporting.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-md border border-neutral-200 p-8 text-center text-xs text-neutral-500">
        Run fact-finding or load a story to inspect agreed consensus facts.
      </div>
    );
  }

  const consensusClaims = (step1.claims || []).filter(
    (c) => c.type === 'consensus'
  );
  const partialClaims = (step1.claims || []).filter(
    (c) => c.type === 'partial_coverage'
  );
  const disputedClaims = (step1.claims || []).filter(
    (c) => c.type === 'disputed'
  );

  return (
    <div className="space-y-6">
      {/* Event Summary */}
      <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            Synthesis
          </span>
          <span className="text-xs font-semibold text-neutral-900">
            Neutral Event Summary
          </span>
        </div>
        <p className="text-xs text-neutral-700 leading-relaxed font-normal">
          {step1.event_summary}
        </p>
      </div>

      {/* Agreed Facts (Consensus 85%+) */}
      <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-950">Agreed Facts</h3>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              {step1.key_facts?.length || 0} verified
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 italic">
            These are the only facts the article may use
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-1">
          {step1.key_facts && step1.key_facts.length > 0 ? (
            step1.key_facts.map((fact, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-md bg-neutral-50/70 border border-neutral-100 text-xs text-neutral-800 leading-relaxed hover:bg-neutral-100/50 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100/80 text-emerald-800 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 font-normal">{fact}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400">No consensus key facts extracted.</p>
          )}
        </div>
      </div>

      {/* Partial Coverage */}
      <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-neutral-950">Partial Coverage</h3>
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full">
              {partialClaims.length} excluded claims
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 italic">
            Reported by some sources, but below consensus threshold
          </span>
        </div>

        {partialClaims.length === 0 ? (
          <p className="text-xs text-neutral-400 py-2">
            No secondary partial claims met inclusion filters.
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {partialClaims.map((claim, idx) => (
              <div
                key={idx}
                className="p-3 rounded-md bg-neutral-50/70 border border-neutral-100 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100/70 text-amber-900 border border-amber-200">
                    {claim.coverage_percentage}% of sources
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Excluded from article body
                  </span>
                </div>
                <p className="text-xs text-neutral-800 font-medium">
                  {claim.claim}
                </p>
                {claim.sources && claim.sources.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-neutral-400">Reported by:</span>
                    {claim.sources.map((s, sIdx) => {
                      const lean = getOutletLean(s);
                      const badgeStyles = getLeanBadgeStyles(lean);
                      return (
                        <span
                          key={sIdx}
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border}`}
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disputed Claims */}
      <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold text-neutral-950">Disputed Claims</h3>
            <span className="text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded-full">
              {disputedClaims.length} detected
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 italic">
            Contradictory factual statements across outlets
          </span>
        </div>

        {disputedClaims.length === 0 ? (
          <div className="p-4 rounded-md bg-neutral-50/60 border border-neutral-100 text-xs text-neutral-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              No factual contradictions identified among outlets (framing differences were reconciled into underlying facts).
            </span>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {disputedClaims.map((claim, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-md bg-rose-50/40 border border-rose-200/70 space-y-2.5"
              >
                <div className="font-semibold text-xs text-neutral-900">
                  {claim.claim}
                </div>
                {claim.views && claim.views.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {claim.views.map((v, vIdx) => (
                      <div
                        key={vIdx}
                        className="bg-white p-2.5 rounded border border-neutral-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-neutral-800">
                            Position {vIdx + 1}
                          </span>
                          <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                            {v.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700">{v.position}</p>
                        <div className="text-[10px] text-neutral-500 flex flex-wrap gap-1">
                          {v.sources.map((src, i) => (
                            <span key={i} className="bg-neutral-100 px-1 rounded">
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-700 space-y-1">
                    {claim.supporting_view && <div>• {claim.supporting_view}</div>}
                    {claim.contradicting_view && (
                      <div>• {claim.contradicting_view}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How Each Outlet Framed It */}
      <div className="bg-white rounded-md border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-bold text-neutral-950">
              How Each Outlet Framed It
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500 italic">
            Narrative lens, tone, and selective emphasis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {step1.outlet_analysis && step1.outlet_analysis.length > 0 ? (
            step1.outlet_analysis.map((analysis, idx) => {
              const lean = getOutletLean(analysis.outlet);
              const badgeStyles = getLeanBadgeStyles(lean);

              const toneColor =
                analysis.tone === 'critical'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : analysis.tone === 'alarmist'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : analysis.tone === 'supportive'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200';

              return (
                <div
                  key={idx}
                  className="bg-neutral-50/50 border border-neutral-200/80 rounded-md p-3 space-y-2.5 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-semibold text-xs text-neutral-950">
                      {analysis.outlet}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border}`}
                      >
                        {lean}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${toneColor}`}
                      >
                        {analysis.tone}
                      </span>
                    </div>
                  </div>

                  {/* Bias indicators as quoted phrases */}
                  {analysis.bias_indicators && analysis.bias_indicators.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        Framing Choices
                      </span>
                      <div className="space-y-1">
                        {analysis.bias_indicators.map((ind, iIdx) => (
                          <p
                            key={iIdx}
                            className="text-xs text-neutral-700 italic bg-white px-2 py-1 rounded border border-neutral-100"
                          >
                            "{ind}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emphasis tags */}
                  {analysis.emphasis && analysis.emphasis.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                        Primary Emphasis
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {analysis.emphasis.map((emp, eIdx) => (
                          <span
                            key={eIdx}
                            className="text-[10px] bg-neutral-200/70 text-neutral-700 px-1.5 py-0.5 rounded"
                          >
                            {emp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-neutral-400 col-span-2">
              No outlet analysis available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
