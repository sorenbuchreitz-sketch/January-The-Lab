import { CheckItem, RulesState, SourceArticle, Step1AnalysisResult, Step2ArticleResult } from '../types';

export const LOADED_WORDS = [
  'slammed',
  'blasted',
  'chaos',
  'tragic',
  'controversial',
  'sparked outrage',
  'amid',
  'crackdown',
  'fueled',
  'senseless',
  'slams',
  'blasts',
];

/**
 * Removes text inside quotation marks to allow quoted words.
 */
function removeQuotes(text: string): string {
  if (!text) return '';
  return text
    .replace(/"[^"]*"/g, ' ')
    .replace(/“[^”]*”/g, ' ')
    .replace(/‘[^’]*’/g, ' ')
    .replace(/'[^']*'/g, ' ');
}

export function runArticleChecks(
  article: Step2ArticleResult | null,
  rules: RulesState,
  step1: Step1AnalysisResult | null,
  sources: SourceArticle[] = []
): CheckItem[] {
  if (!article) return [];

  const checks: CheckItem[] = [];

  const headline = article.headline || '';
  const standfirst = article.standfirst || '';
  const body = article.body || '';
  const keyPoints = Array.isArray(article.key_points) ? article.key_points : [];
  const fullText = `${headline} ${standfirst} ${body} ${keyPoints.join(' ')}`;
  const unquotedFullText = removeQuotes(fullText);

  // 1. Headline length: max 12 words (8 if "Very short")
  const maxHeadlineWords = rules?.headlineRule === 'very_short' ? 8 : 12;
  const headlineWords = headline
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const headlineCount = headlineWords.length;

  if (headlineCount > maxHeadlineWords) {
    checks.push({
      id: 'headline_length',
      label: 'Headline length',
      status: 'fail',
      detail: `${headlineCount} words (exceeds limit of ${maxHeadlineWords} words)`,
    });
  } else {
    checks.push({
      id: 'headline_length',
      label: 'Headline length',
      status: 'pass',
      detail: `${headlineCount} words (within limit of ${maxHeadlineWords} words)`,
    });
  }

  // 2. Standfirst: max 160 characters (120 if "One short sentence")
  const maxStandfirstChars =
    rules?.standfirstRule === 'one_short_sentence' ? 120 : 160;
  const standfirstChars = standfirst.trim().length;
  if (standfirstChars > maxStandfirstChars) {
    checks.push({
      id: 'standfirst_length',
      label: 'Standfirst length',
      status: 'fail',
      detail: `${standfirstChars} characters (exceeds ${maxStandfirstChars} char limit by ${standfirstChars - maxStandfirstChars})`,
    });
  } else {
    checks.push({
      id: 'standfirst_length',
      label: 'Standfirst length',
      status: 'pass',
      detail: `${standfirstChars} characters (limit: ${maxStandfirstChars})`,
    });
  }

  // 3. Banned words: FAIL if any of the user's banned words appear outside quotes
  const bannedWords = Array.isArray(rules?.bannedWords) ? rules.bannedWords : [];
  if (bannedWords.length > 0) {
    const foundBanned: string[] = [];
    for (const word of bannedWords) {
      const trimmed = word.trim();
      if (!trimmed) continue;
      // Word boundary regex
      const regex = new RegExp(`\\b${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(unquotedFullText)) {
        foundBanned.push(trimmed);
      }
    }

    if (foundBanned.length > 0) {
      checks.push({
        id: 'banned_words',
        label: 'Banned words',
        status: 'fail',
        detail: `Found banned word(s) outside quotes: "${foundBanned.join('", "')}"`,
      });
    } else {
      checks.push({
        id: 'banned_words',
        label: 'Banned words',
        status: 'pass',
        detail: `None of the ${bannedWords.length} banned words appear outside quotes`,
      });
    }
  } else {
    checks.push({
      id: 'banned_words',
      label: 'Banned words',
      status: 'pass',
      detail: 'No banned words configured in rules',
    });
  }

  // 4. Loaded words (WARN)
  const foundLoaded: string[] = [];
  for (const word of LOADED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(fullText)) {
      foundLoaded.push(word);
    }
  }
  if (foundLoaded.length > 0) {
    checks.push({
      id: 'loaded_words',
      label: 'Loaded words',
      status: 'warn',
      detail: `Detected editorialized or drama words: ${foundLoaded.join(', ')}`,
    });
  } else {
    checks.push({
      id: 'loaded_words',
      label: 'Loaded words',
      status: 'pass',
      detail: 'No sensational or loaded words detected',
    });
  }

  // 5. Claims not in the agreed facts (WARN)
  const keyFacts = step1 && Array.isArray(step1.key_facts) ? step1.key_facts : [];
  const keyFactsJoined = keyFacts.join(' ');
  const bodyAndPoints = `${body} ${keyPoints.join(' ')}`;

  const numberMatches = bodyAndPoints.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  const unverifiedNumbers: string[] = [];
  for (const num of numberMatches) {
    const cleanNum = num.replace(/[%,]/g, '');
    if (/^\d{4}$/.test(cleanNum)) {
      continue;
    }
    if (!keyFactsJoined.includes(cleanNum) && !keyFactsJoined.includes(num)) {
      if (!unverifiedNumbers.includes(num)) {
        unverifiedNumbers.push(num);
      }
    }
  }

  const namedOutlets: string[] = [];
  const commonOutlets = [
    'CNN',
    'BBC',
    'Reuters',
    'AP',
    'Associated Press',
    'Fox News',
    'The Wall Street Journal',
    'WSJ',
    'The New York Times',
    'NYT',
    'The Guardian',
    'Bloomberg',
    'Financial Times',
    'Politico',
    'Al Jazeera',
    'Washington Post',
    'WaPo',
  ];
  const sourceOutletNames = (sources || []).map((s) => s.outlet || s.source).filter(Boolean);
  const allOutletsToCheck = Array.from(new Set([...commonOutlets, ...sourceOutletNames]));

  for (const outlet of allOutletsToCheck) {
    if (!outlet || outlet.length < 3) continue;
    const regex = new RegExp(`\\b(?:according to|reported by|citing)\\s+${outlet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(body)) {
      namedOutlets.push(outlet);
    }
  }

  const claimIssues: string[] = [];
  if (unverifiedNumbers.length > 0) {
    claimIssues.push(`Numbers not in agreed facts: ${unverifiedNumbers.slice(0, 3).join(', ')}`);
  }
  if (namedOutlets.length > 0) {
    claimIssues.push(`Outlet attribution found in body: ${namedOutlets.join(', ')}`);
  }

  if (claimIssues.length > 0) {
    checks.push({
      id: 'unverified_claims',
      label: 'Claims not in agreed facts',
      status: 'warn',
      detail: claimIssues.join(' · '),
    });
  } else {
    checks.push({
      id: 'unverified_claims',
      label: 'Claims not in agreed facts',
      status: 'pass',
      detail: 'All numbers verified against agreed facts; no outlet attribution in body',
    });
  }

  // 6. Years (WARN)
  const sourceYears = new Set<string>();
  for (const s of sources || []) {
    if (s.published_at) {
      const year = s.published_at.slice(0, 4);
      if (/^\d{4}$/.test(year)) {
        sourceYears.add(year);
      }
    }
  }
  const keyFactYears = keyFactsJoined.match(/\b(?:19|20)\d{2}\b/g) || [];
  keyFactYears.forEach((y) => sourceYears.add(y));

  const textYears = Array.from(new Set(fullText.match(/\b(?:19|20)\d{2}\b/g) || []));
  const mismatchedYears = textYears.filter((y) => !sourceYears.has(y));

  if (mismatchedYears.length > 0) {
    checks.push({
      id: 'year_validation',
      label: 'Publication years',
      status: 'warn',
      detail: `Referenced year(s) [${mismatchedYears.join(', ')}] do not match source publication dates or context`,
    });
  } else {
    checks.push({
      id: 'year_validation',
      label: 'Publication years',
      status: 'pass',
      detail: 'All referenced years match source reporting',
    });
  }

  const statusOrder = { fail: 0, warn: 1, pass: 2 };
  return checks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}
