import React, { useState, KeyboardEvent } from 'react';
import {
  ArticleLengthRuleType,
  ConsensusCountRuleType,
  ConsensusThresholdType,
  DisputedClaimsRuleType,
  HeadlineRuleType,
  KeyPointsRuleType,
  OpeningRuleType,
  OutletFramingRuleType,
  PartialCoverageRuleType,
  RulesState,
  SentenceLengthRuleType,
  StandfirstRuleType,
  ToneRuleType,
} from '../types';
import { countRuleChanges, DEFAULT_RULES } from '../lib/rules';
import { X, RotateCcw, Plus } from 'lucide-react';

interface RulesPanelProps {
  rules: RulesState;
  onChangeRules: (newRules: RulesState) => void;
  disabled?: boolean;
}

interface ChoiceFieldProps<T extends string> {
  label: string;
  hint?: string;
  prefix: string;
  options: { id: T; label: string }[];
  currentValue: T;
  customText: string;
  customPlaceholder?: string;
  disabled?: boolean;
  onSelect: (id: T) => void;
  onChangeCustomText: (text: string) => void;
}

function ChoiceField<T extends string>({
  label,
  hint,
  prefix,
  options,
  currentValue,
  customText,
  customPlaceholder,
  disabled = false,
  onSelect,
  onChangeCustomText,
}: ChoiceFieldProps<T>) {
  const isCustom = currentValue === ('custom' as unknown as T);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-neutral-700">{label}</label>
        {hint && <span className="text-[11px] text-neutral-500">{hint}</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {options.map((opt) => {
          const active = currentValue === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border cursor-pointer ${
                active
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}

        {/* Thin amber "✎ Make your own rule" pill */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect('custom' as unknown as T)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors border cursor-pointer ${
            isCustom
              ? 'bg-neutral-900 text-white border-amber-400 shadow-xs'
              : 'bg-white text-neutral-800 border-amber-400 hover:bg-amber-50/50'
          }`}
        >
          ✎ Make your own rule
        </button>
      </div>

      {isCustom && (
        <div className="pt-1">
          <input
            type="text"
            disabled={disabled}
            value={customText}
            onChange={(e) => onChangeCustomText(e.target.value)}
            placeholder={customPlaceholder || `Rule line: "${prefix}: <your text>"`}
            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
          />
        </div>
      )}
    </div>
  );
}

export const RulesPanel: React.FC<RulesPanelProps> = ({
  rules,
  onChangeRules,
  disabled = false,
}) => {
  const [bannedInput, setBannedInput] = useState('');
  const [customRuleInput, setCustomRuleInput] = useState('');

  const { summaryText } = countRuleChanges(rules);

  // Banned words management
  const addBannedWord = (text: string) => {
    const trimmed = text.trim().replace(/^[,]+|[,]+$/g, '');
    if (!trimmed) return;

    const parts = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const updated = [...rules.bannedWords];
    for (const p of parts) {
      if (!updated.some((w) => w.toLowerCase() === p.toLowerCase())) {
        updated.push(p);
      }
    }
    onChangeRules({ ...rules, bannedWords: updated });
    setBannedInput('');
  };

  const removeBannedWord = (wordToRemove: string) => {
    onChangeRules({
      ...rules,
      bannedWords: rules.bannedWords.filter((w) => w !== wordToRemove),
    });
  };

  const handleBannedKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addBannedWord(bannedInput);
    } else if (e.key === 'Backspace' && !bannedInput && rules.bannedWords.length > 0) {
      removeBannedWord(rules.bannedWords[rules.bannedWords.length - 1]);
    }
  };

  // Custom writing rules list management
  const addCustomWritingRule = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const current = Array.isArray(rules.customWritingRules) ? rules.customWritingRules : [];
    if (!current.includes(trimmed)) {
      onChangeRules({
        ...rules,
        customWritingRules: [...current, trimmed],
      });
    }
    setCustomRuleInput('');
  };

  const removeCustomWritingRule = (index: number) => {
    const current = Array.isArray(rules.customWritingRules) ? rules.customWritingRules : [];
    onChangeRules({
      ...rules,
      customWritingRules: current.filter((_, i) => i !== index),
    });
  };

  const resetRules = () => {
    onChangeRules(DEFAULT_RULES);
    setBannedInput('');
    setCustomRuleInput('');
  };

  const customWritingRules = Array.isArray(rules.customWritingRules)
    ? rules.customWritingRules
    : [];

  return (
    <div className="space-y-4">
      {/* Summary line */}
      <div className="text-[11px] text-neutral-500 font-medium pb-1 border-b border-neutral-100 flex items-center justify-between">
        <span>{summaryText}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={resetRules}
          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors underline underline-offset-2 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset rules</span>
        </button>
      </div>

      {/* STEP 2 · Writing the article */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-violet-100/80 text-violet-800 border border-violet-200">
            STEP 2
          </span>
          <span className="text-xs font-semibold text-neutral-800">
            Writing the article
          </span>
        </div>

        {/* Words to never use */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-700">
            Words to never use
          </label>
          <div className="bg-white border border-neutral-200 rounded-md p-1.5 flex flex-wrap items-center gap-1.5 min-h-[38px] focus-within:ring-1 focus-within:ring-neutral-400 focus-within:border-neutral-400 transition-all">
            {rules.bannedWords.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 text-xs px-2 py-0.5 rounded border border-neutral-200"
              >
                <span>{word}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeBannedWord(word)}
                  className="text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              disabled={disabled}
              value={bannedInput}
              onChange={(e) => setBannedInput(e.target.value)}
              onKeyDown={handleBannedKeyDown}
              onBlur={() => addBannedWord(bannedInput)}
              placeholder={
                rules.bannedWords.length === 0
                  ? 'e.g. controversial, slammed, key (press Enter)'
                  : 'Add word...'
              }
              className="text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none flex-1 min-w-[120px] px-1 py-0.5"
            />
          </div>
          <div className="text-[10px] text-neutral-400">
            Press Enter or comma to add. Direct quotes from named persons are preserved.
          </div>
        </div>

        {/* Headline rule */}
        <ChoiceField<HeadlineRuleType>
          label="Headline rule"
          prefix="Headline"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'newest_fact', label: 'State newest fact' },
            { id: 'lead_with_changes', label: 'Lead with what changes' },
            { id: 'very_short', label: 'Very short (max 8 words)' },
          ]}
          currentValue={rules.headlineRule}
          customText={rules.headlineCustomText}
          customPlaceholder="e.g. Include the city name and primary dollar figure"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, headlineRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, headlineCustomText: text })
          }
        />

        {/* Tone */}
        <ChoiceField<ToneRuleType>
          label="Tone"
          prefix="Tone"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'conversational', label: 'Conversational' },
            { id: 'crisp_wire', label: 'Crisp wire style' },
            { id: 'energetic', label: 'Energetic' },
            { id: 'explain_context', label: 'Explain the context' },
          ]}
          currentValue={rules.toneRule}
          customText={rules.toneCustomText}
          customPlaceholder="e.g. Direct and analytical, for technical readers"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, toneRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, toneCustomText: text })
          }
        />

        {/* Standfirst */}
        <ChoiceField<StandfirstRuleType>
          label="Standfirst"
          hint="The line under the headline."
          prefix="Standfirst"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'one_short_sentence', label: 'One short sentence' },
            { id: 'say_why_it_matters', label: 'Say why it matters' },
          ]}
          currentValue={rules.standfirstRule}
          customText={rules.standfirstCustomText}
          customPlaceholder="e.g. Include key date and immediate consequence"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, standfirstRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, standfirstCustomText: text })
          }
        />

        {/* Opening */}
        <ChoiceField<OpeningRuleType>
          label="Opening"
          prefix="Opening"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'who_what_where_when', label: 'Who, what, where, when' },
            { id: 'say_why_it_matters', label: 'Say why it matters' },
            { id: 'human_impact_first', label: 'Human impact first' },
          ]}
          currentValue={rules.openingRule}
          customText={rules.openingCustomText}
          customPlaceholder="e.g. Start with the verified decision announced today"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, openingRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, openingCustomText: text })
          }
        />

        {/* Sentence length */}
        <ChoiceField<SentenceLengthRuleType>
          label="Sentence length"
          prefix="Sentences"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'max_20_words', label: 'Max 20 words per sentence' },
            { id: 'max_15_words', label: 'Max 15 words per sentence' },
          ]}
          currentValue={rules.sentenceLengthRule}
          customText={rules.sentenceLengthCustomText}
          customPlaceholder="e.g. Keep under 18 words with short active clauses"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, sentenceLengthRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, sentenceLengthCustomText: text })
          }
        />

        {/* Article length */}
        <ChoiceField<ArticleLengthRuleType>
          label="Article length"
          prefix="Length"
          options={[
            { id: 'standard', label: 'Standard (300–450 words)' },
            { id: 'shorter_200_300', label: 'Shorter (200–300 words)' },
            { id: 'short_150_220', label: 'Short (150–220 words)' },
          ]}
          currentValue={rules.articleLengthRule}
          customText={rules.articleLengthCustomText}
          customPlaceholder="e.g. Exactly 250 words"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, articleLengthRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, articleLengthCustomText: text })
          }
        />

        {/* Number of key points */}
        <ChoiceField<KeyPointsRuleType>
          label="Number of key points"
          prefix="Key points"
          options={[
            { id: 'standard', label: 'Standard (5–7)' },
            { id: 'points_4_6', label: '4–6' },
            { id: 'points_3_5', label: '3–5' },
          ]}
          currentValue={rules.keyPointsRule}
          customText={rules.keyPointsCustomText}
          customPlaceholder="e.g. Exactly 4 concise bullets"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, keyPointsRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, keyPointsCustomText: text })
          }
        />

        {/* Your own writing rules */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-neutral-700">
            Your own writing rules
          </label>
          <p className="text-[11px] text-neutral-500">
            Add custom rules inserted into the House Style Rules block.
          </p>

          {/* List of custom writing rules */}
          {customWritingRules.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {customWritingRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-800"
                >
                  <span className="font-mono text-[11px] break-words flex-1">
                    {rule}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeCustomWritingRule(idx)}
                    className="text-neutral-400 hover:text-neutral-700 transition-colors p-0.5 cursor-pointer shrink-0"
                    title="Remove rule"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              disabled={disabled}
              value={customRuleInput}
              onChange={(e) => setCustomRuleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomWritingRule(customRuleInput);
                }
              }}
              onBlur={() => addCustomWritingRule(customRuleInput)}
              placeholder="e.g. Never refer to the current year as 'this year'"
              className="flex-1 text-xs p-2 bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
            <button
              type="button"
              disabled={disabled || !customRuleInput.trim()}
              onClick={() => addCustomWritingRule(customRuleInput)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 1 · Finding the facts */}
      <div className="space-y-3.5 pt-3 border-t border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-sky-100/80 text-sky-800 border border-sky-200">
            STEP 1
          </span>
          <span className="text-xs font-semibold text-neutral-800">
            Finding the facts
          </span>
        </div>

        {/* When is a fact agreed? (Consensus threshold) */}
        <ChoiceField<ConsensusThresholdType>
          label='When is a fact "agreed"?'
          hint="Share of sources that must report a fact before the article can use it."
          prefix="Consensus threshold"
          options={[
            { id: 'standard', label: 'Standard (85%)' },
            { id: 'looser', label: 'Looser (75%)' },
            { id: 'stricter', label: 'Stricter (90%)' },
          ]}
          currentValue={rules.consensusThreshold}
          customText={rules.consensusThresholdCustomText}
          customPlaceholder="e.g. a fact is consensus when 80%+ of sources report it"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, consensusThreshold: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, consensusThresholdCustomText: text })
          }
        />

        {/* How many agreed facts to collect */}
        <ChoiceField<ConsensusCountRuleType>
          label="How many agreed facts to collect"
          prefix="Number of consensus claims"
          options={[
            { id: 'standard', label: 'Standard (8–12)' },
            { id: 'more_12_16', label: 'More (12–16)' },
            { id: 'fewer_5_8', label: 'Fewer (5–8)' },
          ]}
          currentValue={rules.consensusCountRule}
          customText={rules.consensusCountCustomText}
          customPlaceholder="e.g. Extract 10-14 consensus claims"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, consensusCountRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, consensusCountCustomText: text })
          }
        />

        {/* Partial coverage */}
        <ChoiceField<PartialCoverageRuleType>
          label="Partial coverage"
          hint="Facts only some sources report. Shown in Facts found, not the article."
          prefix="Partial coverage"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'stricter', label: 'Stricter' },
            { id: 'broader', label: 'Broader' },
          ]}
          currentValue={rules.partialCoverageRule}
          customText={rules.partialCoverageCustomText}
          customPlaceholder="e.g. only include key context reported by at least 2 sources"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, partialCoverageRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, partialCoverageCustomText: text })
          }
        />

        {/* Disputed facts */}
        <ChoiceField<DisputedClaimsRuleType>
          label="Disputed facts"
          hint="When sources report conflicting facts."
          prefix="Disputed claims"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'only_clear_conflicts', label: 'Only clear conflicts' },
            { id: 'flag_more_number_diffs', label: 'Flag more number differences' },
          ]}
          currentValue={rules.disputedClaimsRule}
          customText={rules.disputedClaimsCustomText}
          customPlaceholder="e.g. flag conflicts when numbers diverge by more than 15%"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, disputedClaimsRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, disputedClaimsCustomText: text })
          }
        />

        {/* How each outlet framed it */}
        <ChoiceField<OutletFramingRuleType>
          label="How each outlet framed it"
          hint="Shown in Facts found. Not in the article."
          prefix="Framing"
          options={[
            { id: 'standard', label: 'Standard' },
            { id: 'detailed', label: 'Detailed' },
            { id: 'contrasting_only', label: 'Clear differences only' },
          ]}
          currentValue={rules.outletFramingRule}
          customText={rules.outletFramingCustomText}
          customPlaceholder="e.g. emphasize geopolitical context and regional framing"
          disabled={disabled}
          onSelect={(id) => onChangeRules({ ...rules, outletFramingRule: id })}
          onChangeCustomText={(text) =>
            onChangeRules({ ...rules, outletFramingCustomText: text })
          }
        />

        <div className="text-[10px] text-neutral-400 italic">
          Changing Step 1 rules re-runs fact-finding from source articles.
        </div>
      </div>
    </div>
  );
};
