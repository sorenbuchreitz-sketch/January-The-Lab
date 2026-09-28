import React from 'react';
import { CheckItem } from '../types';
import { XCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ChecksTabProps {
  checks: CheckItem[];
  hasCustomRun: boolean;
}

export const ChecksTab: React.FC<ChecksTabProps> = ({ checks, hasCustomRun }) => {
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const passCount = checks.filter((c) => c.status === 'pass').length;

  return (
    <div className="space-y-5">
      {/* Checks Summary Banner */}
      <div className="bg-white rounded-md border border-neutral-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-800">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-900">
              Automated Policy & Quality Checks
            </h3>
            <p className="text-[11px] text-neutral-500">
              {hasCustomRun
                ? 'Auditing custom article output against January style rules & fact-binding'
                : 'Auditing baseline article against standard rules'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded font-semibold text-[11px]">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              {failCount} Fail{failCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {warnCount} Warning{warnCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {passCount} Passed
          </span>
        </div>
      </div>

      {/* Checks List */}
      <div className="bg-white rounded-md border border-neutral-200 divide-y divide-neutral-100 shadow-xs overflow-hidden">
        {checks.map((check) => {
          let statusBadge = (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PASS
            </span>
          );
          let bgClass = 'bg-white';

          if (check.status === 'fail') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <XCircle className="w-3.5 h-3.5" />
                FAIL
              </span>
            );
            bgClass = 'bg-rose-50/20';
          } else if (check.status === 'warn') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                WARN
              </span>
            );
            bgClass = 'bg-amber-50/20';
          }

          return (
            <div
              key={check.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${bgClass}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-neutral-900">
                    {check.label}
                  </h4>
                </div>
                <p className="text-xs text-neutral-600 leading-snug">
                  {check.detail}
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                {statusBadge}
              </div>
            </div>
          );
        })}
      </div>

      {/* Policy Explainer */}
      <div className="p-4 bg-neutral-100/60 rounded-md border border-neutral-200/80 text-[11px] text-neutral-600 space-y-1">
        <span className="font-semibold text-neutral-800">Quality Guardrail Standard:</span>
        <p>
          January enforces strict factual grounding. Articles must not introduce external numbers outside agreed consensus, must not parrot sensationalized conflict verbs, and must state verified facts directly without hiding behind outlet attributions.
        </p>
      </div>
    </div>
  );
};
