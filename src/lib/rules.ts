import { RulesState } from '../types';
import { injectRuleBlock, ANALYZE_PROMPT, GENERATE_PROMPT } from './prompts';

export const DEFAULT_RULES: RulesState = {
  // STEP 2 · Writing the article
  bannedWords: [],
  headlineRule: 'standard',
  headlineCustomText: '',
  toneRule: 'standard',
  toneCustomText: '',
  standfirstRule: 'standard',
  standfirstCustomText: '',
  openingRule: 'standard',
  openingCustomText: '',
  sentenceLengthRule: 'standard',
  sentenceLengthCustomText: '',
  articleLengthRule: 'standard',
  articleLengthCustomText: '',
  keyPointsRule: 'standard',
  keyPointsCustomText: '',
  customWritingRules: [],

  // STEP 1 · Finding the facts
  consensusThreshold: 'standard',
  consensusThresholdCustomText: '',
  consensusCountRule: 'standard',
  consensusCountCustomText: '',
  partialCoverageRule: 'standard',
  partialCoverageCustomText: '',
  disputedClaimsRule: 'standard',
  disputedClaimsCustomText: '',
  outletFramingRule: 'standard',
  outletFramingCustomText: '',
};

export const STEP1_BLOCK_HEADER =
  'LAB FACT-FINDING RULES (these adjust how you sort facts into consensus, partial coverage and disputed. Where they conflict with the rules above, follow these. Facts vs framing still applies):';

export const STEP2_BLOCK_HEADER =
  'HOUSE STYLE RULES (these adjust style only. Where they conflict with the style guidance above, follow these. They never override the facts-only, neutrality or claims rules above):';

/**
 * Returns rule lines for STEP 1 · Finding the facts
 */
export function getStep1RuleLines(rules: RulesState): string[] {
  const lines: string[] = [];

  // 1. When is a fact agreed? (Consensus threshold) - Prefix: "Consensus threshold"
  switch (rules.consensusThreshold) {
    case 'looser':
      lines.push(
        'Consensus threshold: a fact is consensus when 75%+ of sources report it (this replaces 85% everywhere above). Partial coverage is then anything below 75%.'
      );
      break;
    case 'stricter':
      lines.push(
        'Consensus threshold: a fact is consensus only when 90%+ of sources report it (this replaces 85% everywhere above). Partial coverage is then anything below 90%.'
      );
      break;
    case 'custom':
      if (rules.consensusThresholdCustomText.trim()) {
        lines.push(`Consensus threshold: ${rules.consensusThresholdCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // 2. How many agreed facts to collect - Prefix: "Number of consensus claims"
  switch (rules.consensusCountRule) {
    case 'more_12_16':
      lines.push(
        'Extract 12-16 consensus claims when they exist (instead of 8-12), so the article has more material.'
      );
      break;
    case 'fewer_5_8':
      lines.push(
        'Extract only the 5-8 most important consensus claims (instead of 8-12).'
      );
      break;
    case 'custom':
      if (rules.consensusCountCustomText.trim()) {
        lines.push(`Number of consensus claims: ${rules.consensusCountCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // 3. Partial coverage - Prefix: "Partial coverage"
  switch (rules.partialCoverageRule) {
    case 'stricter':
      lines.push(
        "Partial coverage: be stricter. Only include claims that clearly change a reader's understanding of the event, and at most 4."
      );
      break;
    case 'broader':
      lines.push(
        "Partial coverage: be broader. Also include relevant context, expert commentary and 'first time since' comparisons that some sources report, up to 10 claims. Still exclude trivia and biographical background."
      );
      break;
    case 'custom':
      if (rules.partialCoverageCustomText.trim()) {
        lines.push(`Partial coverage: ${rules.partialCoverageCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // 4. Disputed facts - Prefix: "Disputed claims"
  switch (rules.disputedClaimsRule) {
    case 'only_clear_conflicts':
      lines.push(
        'Disputed: only flag a dispute when at least two sources state each conflicting version. Otherwise treat it as partial coverage.'
      );
      break;
    case 'flag_more_number_diffs':
      lines.push(
        'Disputed: treat number differences above 10% (instead of 20%) as possible disputes when the number is central to the story. Timing, rounding and unit rules above still apply.'
      );
      break;
    case 'custom':
      if (rules.disputedClaimsCustomText.trim()) {
        lines.push(`Disputed claims: ${rules.disputedClaimsCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // 5. How each outlet framed it - Prefix: "Framing"
  switch (rules.outletFramingRule) {
    case 'detailed':
      lines.push(
        'Framing: analyze tone, bias indicators and emphasis for each major outlet in detail.'
      );
      break;
    case 'contrasting_only':
      lines.push(
        'Framing: only record framing differences when outlets take clearly contrasting positions on the event.'
      );
      break;
    case 'custom':
      if (rules.outletFramingCustomText.trim()) {
        lines.push(`Framing: ${rules.outletFramingCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  return lines;
}

/**
 * Returns rule lines for STEP 2 · Writing the article
 */
export function getStep2RuleLines(rules: RulesState): string[] {
  const lines: string[] = [];

  // a) Words to never use (Banned words)
  if (rules.bannedWords.length > 0) {
    const wordsList = rules.bannedWords.map((w) => `"${w.trim()}"`).join(', ');
    lines.push(
      `Never use these words or close variants in the headline, standfirst, body or key points: ${wordsList}. If a source uses one, state the underlying fact instead. Only keep such a word inside a direct quote from a named person, and attribute it.`
    );
  }

  // b) Headline - Prefix: "Headline"
  switch (rules.headlineRule) {
    case 'newest_fact':
      lines.push(
        'Headline: state the single newest fact plainly. No verbs of conflict or drama (slams, blasts, clashes, fires back).'
      );
      break;
    case 'lead_with_changes':
      lines.push(
        'Headline: lead with what changes and for whom (the concrete consequence), not with who said what.'
      );
      break;
    case 'very_short':
      lines.push('Headline: maximum 8 words.');
      break;
    case 'custom':
      if (rules.headlineCustomText.trim()) {
        lines.push(`Headline: ${rules.headlineCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // c) Tone - Prefix: "Tone"
  switch (rules.toneRule) {
    case 'conversational':
      lines.push(
        'Tone: warm and conversational, as if explaining to a smart friend. Still strictly neutral.'
      );
      break;
    case 'crisp_wire':
      lines.push(
        'Tone: crisp and economical, wire-service style. No scene-setting, no flourishes.'
      );
      break;
    case 'energetic':
      lines.push(
        'Tone: energetic and vivid. Strong verbs, momentum, scores and stakes up front. No hype adjectives (incredible, stunning, historic) unless quoted from a named person.'
      );
      break;
    case 'explain_context':
      lines.push(
        'Tone: explanatory. Add one short plain-language line of context for any concept or institution a general reader may not know.'
      );
      break;
    case 'custom':
      if (rules.toneCustomText.trim()) {
        lines.push(`Tone: ${rules.toneCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // d) Standfirst - Prefix: "Standfirst"
  switch (rules.standfirstRule) {
    case 'one_short_sentence':
      lines.push('Standfirst: one sentence, maximum 120 characters.');
      break;
    case 'say_why_it_matters':
      lines.push(
        'Standfirst: say why this matters to the reader right now, using only key facts.'
      );
      break;
    case 'custom':
      if (rules.standfirstCustomText.trim()) {
        lines.push(`Standfirst: ${rules.standfirstCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // e) Opening - Prefix: "Opening"
  switch (rules.openingRule) {
    case 'who_what_where_when':
      lines.push('Opening: the first sentence answers who, what, where and when.');
      break;
    case 'say_why_it_matters':
      lines.push(
        'Opening: the second sentence says why this matters to the reader, using only key facts.'
      );
      break;
    case 'human_impact_first':
      lines.push(
        'Opening: when the key facts include a concrete human impact, lead with it.'
      );
      break;
    case 'custom':
      if (rules.openingCustomText.trim()) {
        lines.push(`Opening: ${rules.openingCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // f) Sentence length - Prefix: "Sentences"
  switch (rules.sentenceLengthRule) {
    case 'max_20_words':
      lines.push('Sentences: maximum 20 words each.');
      break;
    case 'max_15_words':
      lines.push(
        'Sentences: maximum 15 words each. Use plain words a 15-year-old knows.'
      );
      break;
    case 'custom':
      if (rules.sentenceLengthCustomText.trim()) {
        lines.push(`Sentences: ${rules.sentenceLengthCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // g) Article length - Prefix: "Length"
  switch (rules.articleLengthRule) {
    case 'shorter_200_300':
      lines.push(
        'Length: the body is 200-300 words (this replaces the LENGTH rule above).'
      );
      break;
    case 'short_150_220':
      lines.push(
        'Length: the body is 150-220 words (this replaces the LENGTH rule above).'
      );
      break;
    case 'custom':
      if (rules.articleLengthCustomText.trim()) {
        lines.push(`Length: ${rules.articleLengthCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // h) Number of key points - Prefix: "Key points"
  switch (rules.keyPointsRule) {
    case 'points_4_6':
      lines.push('Key points: 4-6 items (this replaces the 5-7 rule above).');
      break;
    case 'points_3_5':
      lines.push(
        'Key points: 3-5 items (this replaces the 5-7 rule above). Keep only the most important.'
      );
      break;
    case 'custom':
      if (rules.keyPointsCustomText.trim()) {
        lines.push(`Key points: ${rules.keyPointsCustomText.trim()}`);
      }
      break;
    case 'standard':
    default:
      break;
  }

  // i) Your own writing rules
  if (Array.isArray(rules.customWritingRules)) {
    for (const rule of rules.customWritingRules) {
      const trimmed = rule.trim();
      if (trimmed) {
        lines.push(trimmed);
      }
    }
  }

  return lines;
}

export function compileAnalyzePrompt(rules: RulesState): string {
  const lines = getStep1RuleLines(rules);
  return injectRuleBlock(ANALYZE_PROMPT, STEP1_BLOCK_HEADER, lines);
}

export function compileGeneratePrompt(rules: RulesState): string {
  const lines = getStep2RuleLines(rules);
  return injectRuleBlock(GENERATE_PROMPT, STEP2_BLOCK_HEADER, lines);
}

export function countRuleChanges(rules: RulesState): {
  step1Count: number;
  step2Count: number;
  totalCount: number;
  summaryText: string;
} {
  let step1Count = 0;
  if (rules.consensusThreshold !== 'standard') {
    if (rules.consensusThreshold !== 'custom' || rules.consensusThresholdCustomText.trim().length > 0) {
      step1Count++;
    }
  }
  if (rules.consensusCountRule !== 'standard') {
    if (rules.consensusCountRule !== 'custom' || rules.consensusCountCustomText.trim().length > 0) {
      step1Count++;
    }
  }
  if (rules.partialCoverageRule !== 'standard') {
    if (rules.partialCoverageRule !== 'custom' || rules.partialCoverageCustomText.trim().length > 0) {
      step1Count++;
    }
  }
  if (rules.disputedClaimsRule !== 'standard') {
    if (rules.disputedClaimsRule !== 'custom' || rules.disputedClaimsCustomText.trim().length > 0) {
      step1Count++;
    }
  }
  if (rules.outletFramingRule !== 'standard') {
    if (rules.outletFramingRule !== 'custom' || rules.outletFramingCustomText.trim().length > 0) {
      step1Count++;
    }
  }

  let step2Count = 0;
  if (rules.bannedWords.length > 0) step2Count++;
  if (rules.headlineRule !== 'standard') {
    if (rules.headlineRule !== 'custom' || rules.headlineCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.toneRule !== 'standard') {
    if (rules.toneRule !== 'custom' || rules.toneCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.standfirstRule !== 'standard') {
    if (rules.standfirstRule !== 'custom' || rules.standfirstCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.openingRule !== 'standard') {
    if (rules.openingRule !== 'custom' || rules.openingCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.sentenceLengthRule !== 'standard') {
    if (rules.sentenceLengthRule !== 'custom' || rules.sentenceLengthCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.articleLengthRule !== 'standard') {
    if (rules.articleLengthRule !== 'custom' || rules.articleLengthCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (rules.keyPointsRule !== 'standard') {
    if (rules.keyPointsRule !== 'custom' || rules.keyPointsCustomText.trim().length > 0) {
      step2Count++;
    }
  }
  if (Array.isArray(rules.customWritingRules)) {
    const activeCustom = rules.customWritingRules.filter((r) => r.trim().length > 0);
    if (activeCustom.length > 0) {
      step2Count += activeCustom.length;
    }
  }

  const s1Text =
    step1Count === 0
      ? 'same as standard'
      : `${step1Count} change${step1Count > 1 ? 's' : ''}`;
  const s2Text =
    step2Count === 0
      ? 'same as standard'
      : `${step2Count} change${step2Count > 1 ? 's' : ''}`;

  return {
    step1Count,
    step2Count,
    totalCount: step1Count + step2Count,
    summaryText: `Your changes: Step 1 (facts): ${s1Text} · Step 2 (writing): ${s2Text}`,
  };
}

export function getRulesUsedDescription(rules: RulesState): string {
  const parts: string[] = [];

  if (rules.bannedWords.length > 0) {
    parts.push(
      `${rules.bannedWords.length} banned word${rules.bannedWords.length > 1 ? 's' : ''}`
    );
  }

  if (rules.headlineRule === 'newest_fact') parts.push('headline: State newest fact');
  else if (rules.headlineRule === 'lead_with_changes') parts.push('headline: Lead with changes');
  else if (rules.headlineRule === 'very_short') parts.push('headline: Max 8 words');
  else if (rules.headlineRule === 'custom' && rules.headlineCustomText.trim()) {
    parts.push(`headline: "${rules.headlineCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.toneRule === 'conversational') parts.push('tone: Conversational');
  else if (rules.toneRule === 'crisp_wire') parts.push('tone: Crisp wire');
  else if (rules.toneRule === 'energetic') parts.push('tone: Energetic');
  else if (rules.toneRule === 'explain_context') parts.push('tone: Explanatory');
  else if (rules.toneRule === 'custom' && rules.toneCustomText.trim()) {
    parts.push(`tone: "${rules.toneCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.standfirstRule === 'one_short_sentence') parts.push('standfirst: 1 short sentence');
  else if (rules.standfirstRule === 'say_why_it_matters') parts.push('standfirst: Why it matters');
  else if (rules.standfirstRule === 'custom' && rules.standfirstCustomText.trim()) {
    parts.push(`standfirst: "${rules.standfirstCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.openingRule === 'who_what_where_when') parts.push('opening: 5 Ws');
  else if (rules.openingRule === 'say_why_it_matters') parts.push('opening: Why it matters');
  else if (rules.openingRule === 'human_impact_first') parts.push('opening: Human impact first');
  else if (rules.openingRule === 'custom' && rules.openingCustomText.trim()) {
    parts.push(`opening: "${rules.openingCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.sentenceLengthRule === 'max_20_words') parts.push('sentences: Max 20 words');
  else if (rules.sentenceLengthRule === 'max_15_words') parts.push('sentences: Max 15 words');
  else if (rules.sentenceLengthRule === 'custom' && rules.sentenceLengthCustomText.trim()) {
    parts.push(`sentences: "${rules.sentenceLengthCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.articleLengthRule === 'shorter_200_300') parts.push('length: 200-300 words');
  else if (rules.articleLengthRule === 'short_150_220') parts.push('length: 150-220 words');
  else if (rules.articleLengthRule === 'custom' && rules.articleLengthCustomText.trim()) {
    parts.push(`length: "${rules.articleLengthCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.keyPointsRule === 'points_4_6') parts.push('key points: 4-6');
  else if (rules.keyPointsRule === 'points_3_5') parts.push('key points: 3-5');
  else if (rules.keyPointsRule === 'custom' && rules.keyPointsCustomText.trim()) {
    parts.push(`key points: "${rules.keyPointsCustomText.trim().slice(0, 18)}..."`);
  }

  if (Array.isArray(rules.customWritingRules)) {
    const active = rules.customWritingRules.filter((r) => r.trim().length > 0);
    if (active.length > 0) {
      parts.push(`${active.length} custom writing rule${active.length > 1 ? 's' : ''}`);
    }
  }

  if (rules.consensusThreshold === 'looser') parts.push('facts: 75% consensus');
  else if (rules.consensusThreshold === 'stricter') parts.push('facts: 90% consensus');
  else if (rules.consensusThreshold === 'custom' && rules.consensusThresholdCustomText.trim()) {
    parts.push(`facts: "${rules.consensusThresholdCustomText.trim().slice(0, 18)}..."`);
  }

  if (rules.consensusCountRule === 'more_12_16') parts.push('facts: 12-16 claims');
  else if (rules.consensusCountRule === 'fewer_5_8') parts.push('facts: 5-8 claims');

  if (rules.partialCoverageRule === 'stricter') parts.push('partial: Stricter');
  else if (rules.partialCoverageRule === 'broader') parts.push('partial: Broader');

  if (rules.disputedClaimsRule === 'only_clear_conflicts') parts.push('disputed: Clear conflicts only');
  else if (rules.disputedClaimsRule === 'flag_more_number_diffs') parts.push('disputed: 10% diffs');

  if (rules.outletFramingRule === 'detailed') parts.push('framing: Detailed');
  else if (rules.outletFramingRule === 'contrasting_only') parts.push('framing: Contrasting only');

  if (parts.length === 0) {
    return 'Standard rules';
  }

  return `Rules used: ${parts.join(' · ')}`;
}

export const STORAGE_RULES_KEY = 'the_lab_rules_v2';

export function loadSavedRules(): RulesState {
  try {
    const raw = localStorage.getItem(STORAGE_RULES_KEY);
    if (!raw) return DEFAULT_RULES;
    const parsed = JSON.parse(raw);
    return {
      bannedWords: Array.isArray(parsed.bannedWords) ? parsed.bannedWords : [],
      headlineRule: parsed.headlineRule || 'standard',
      headlineCustomText: parsed.headlineCustomText || '',
      toneRule: parsed.toneRule || 'standard',
      toneCustomText: parsed.toneCustomText || '',
      standfirstRule: parsed.standfirstRule || 'standard',
      standfirstCustomText: parsed.standfirstCustomText || '',
      openingRule: parsed.openingRule || 'standard',
      openingCustomText: parsed.openingCustomText || '',
      sentenceLengthRule: parsed.sentenceLengthRule || 'standard',
      sentenceLengthCustomText: parsed.sentenceLengthCustomText || '',
      articleLengthRule: parsed.articleLengthRule || 'standard',
      articleLengthCustomText: parsed.articleLengthCustomText || '',
      keyPointsRule: parsed.keyPointsRule || 'standard',
      keyPointsCustomText: parsed.keyPointsCustomText || '',
      customWritingRules: Array.isArray(parsed.customWritingRules)
        ? parsed.customWritingRules
        : [],

      consensusThreshold: parsed.consensusThreshold || 'standard',
      consensusThresholdCustomText: parsed.consensusThresholdCustomText || '',
      consensusCountRule: parsed.consensusCountRule || 'standard',
      consensusCountCustomText: parsed.consensusCountCustomText || '',
      partialCoverageRule: parsed.partialCoverageRule || 'standard',
      partialCoverageCustomText: parsed.partialCoverageCustomText || '',
      disputedClaimsRule: parsed.disputedClaimsRule || 'standard',
      disputedClaimsCustomText: parsed.disputedClaimsCustomText || '',
      outletFramingRule: parsed.outletFramingRule || 'standard',
      outletFramingCustomText: parsed.outletFramingCustomText || '',
    };
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRulesToStorage(rules: RulesState): void {
  try {
    localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch {
    // Ignore storage quota limits
  }
}
