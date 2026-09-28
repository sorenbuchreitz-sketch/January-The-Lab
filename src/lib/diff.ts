export interface DiffToken {
  type: 'same' | 'added' | 'removed';
  value: string;
}

export interface DiffParagraph {
  tokens: DiffToken[];
}

/**
 * Tokenizes text into words and spaces/punctuation.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Match word sequences or non-word whitespace/punctuation sequences
  const matches = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+|\s+/gu);
  return matches || [];
}

/**
 * Standard Longest Common Subsequence (LCS) on tokens.
 */
export function computeLcs(a: string[], b: string[]): DiffToken[] {
  const n = a.length;
  const m = b.length;

  // For very long texts, cap or optimize
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1) as unknown as number[]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (a[i].toLowerCase() === b[j].toLowerCase()) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const result: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
      result.unshift({ type: 'same', value: b[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: b[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'removed', value: a[i - 1] });
      i--;
    }
  }

  return result;
}

/**
 * Computes word-level diff for a single block of text (e.g. headline or standfirst).
 */
export function diffSingleText(leftText: string, rightText: string): {
  leftTokens: DiffToken[];
  rightTokens: DiffToken[];
  sameWordCount: number;
  totalWords: number;
} {
  const leftTokens = tokenizeWords(leftText);
  const rightTokens = tokenizeWords(rightText);

  const diff = computeLcs(leftTokens, rightTokens);

  let sameWords = 0;
  let leftWords = 0;
  let rightWords = 0;

  const leftDisplay: DiffToken[] = [];
  const rightDisplay: DiffToken[] = [];

  for (const item of diff) {
    const isWord = /[\p{L}\p{N}]/u.test(item.value);
    if (item.type === 'same') {
      leftDisplay.push({ type: 'same', value: item.value });
      rightDisplay.push({ type: 'same', value: item.value });
      if (isWord) {
        sameWords++;
        leftWords++;
        rightWords++;
      }
    } else if (item.type === 'removed') {
      leftDisplay.push({ type: 'removed', value: item.value });
      if (isWord) leftWords++;
    } else if (item.type === 'added') {
      rightDisplay.push({ type: 'added', value: item.value });
      if (isWord) rightWords++;
    }
  }

  return {
    leftTokens: leftDisplay,
    rightTokens: rightDisplay,
    sameWordCount: sameWords,
    totalWords: leftWords + rightWords,
  };
}

/**
 * Computes diff for body preserving paragraphs.
 */
export function diffParagraphs(leftBody: string, rightBody: string): {
  leftParagraphs: DiffParagraph[];
  rightParagraphs: DiffParagraph[];
  sameWords: number;
  totalWords: number;
} {
  const leftParas = leftBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const rightParas = rightBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let totalSame = 0;
  let totalWordsCount = 0;

  const leftResult: DiffParagraph[] = [];
  const rightResult: DiffParagraph[] = [];

  const maxParas = Math.max(leftParas.length, rightParas.length);

  for (let idx = 0; idx < maxParas; idx++) {
    const leftP = leftParas[idx] || '';
    const rightP = rightParas[idx] || '';

    const diffRes = diffSingleText(leftP, rightP);
    totalSame += diffRes.sameWordCount;
    totalWordsCount += diffRes.totalWords;

    if (leftP) {
      leftResult.push({ tokens: diffRes.leftTokens });
    }
    if (rightP) {
      rightResult.push({ tokens: diffRes.rightTokens });
    }
  }

  return {
    leftParagraphs: leftResult,
    rightParagraphs: rightResult,
    sameWords: totalSame,
    totalWords: totalWordsCount,
  };
}

/**
 * Calculates overall text similarity percentage between baseline and rules article.
 */
export function calculateOverallSimilarity(
  baseline: { headline: string; standfirst: string; body: string },
  custom: { headline: string; standfirst: string; body: string }
): number {
  const hDiff = diffSingleText(baseline.headline, custom.headline);
  const sDiff = diffSingleText(baseline.standfirst, custom.standfirst);
  const bDiff = diffParagraphs(baseline.body, custom.body);

  const totalSame = hDiff.sameWordCount + sDiff.sameWordCount + bDiff.sameWords;
  const totalAll = hDiff.totalWords + sDiff.totalWords + bDiff.totalWords;

  if (totalAll === 0) return 100;
  const ratio = (2 * totalSame) / totalAll;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}
