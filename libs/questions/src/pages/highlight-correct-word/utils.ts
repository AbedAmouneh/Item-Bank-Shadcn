import type { QuestionChoice } from '../../components/QuestionsTable';

/** Penalty percentage options available in the dropdown */
export const PENALTY_OPTIONS = [100, 90, 80, 75, 60, 50, 40, 30, 33.3, 25, 20, 15, 10, 5, 0] as const;

/** Decode correct phrases from QuestionChoice array (each answer is a phrase) */
export function decodeCorrectPhrases(choices: QuestionChoice[] | undefined): string[] {
  return (choices ?? []).map((c) => c.answer).filter(Boolean);
}

/**
 * Sanitize editor HTML for the learner path.
 * - Removes all .highlight-remove-btn nodes (editor-only controls).
 * - Unwraps .highlight-wrapper → keeps only inner .correct-highlight text content,
 *   so tokens extracted from the plain text are clean.
 * - Leaves all other HTML (paragraphs, spans, etc.) intact.
 */
export function sanitizeHighlightHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('.highlight-remove-btn').forEach((el) => el.remove());
  doc.querySelectorAll<HTMLElement>('.highlight-wrapper').forEach((wrapper) => {
    const inner = wrapper.querySelector<HTMLElement>('.correct-highlight');
    if (inner) {
      wrapper.parentNode?.replaceChild(inner.cloneNode(true), wrapper);
    }
  });
  return doc.body.innerHTML;
}

/**
 * Extract highlighted phrase strings from editor HTML via data-phrase attributes.
 * Preserves duplicates (document order) so occurrence-based scoring works correctly.
 */
export function extractHighlightedPhrases(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const phrases: string[] = [];
  doc.querySelectorAll<HTMLElement>('.correct-highlight[data-phrase]').forEach((span) => {
    const phrase = span.getAttribute('data-phrase');
    if (phrase) {
      phrases.push(phrase);
    }
  });
  return phrases;
}

/** Extract plain text content from an HTML string */
export function extractPlainText(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent ?? '';
}

/** Split plain text into whitespace-separated word tokens */
export function tokenizeText(text: string): string[] {
  return text.match(/\S+/g) ?? [];
}

/**
 * Strip leading/trailing punctuation for matching.
 * Preserves internal punctuation (e.g. "it's" stays "it's").
 * Case-sensitive: does NOT lowercase.
 */
export function normalizePhrase(phrase: string): string {
  return phrase
    .replace(/^[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+/, '')
    .replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/, '')
    .trim();
}

export type Run = { indices: number[]; phrase: string };

/**
 * Group selected indices into runs.
 * By default, consecutive indices are merged into one run.
 * When `correctRuns` is provided, we also split on authored-highlight boundaries
 * so adjacent correct spans are evaluated independently.
 */
export function buildRunsFromIndices(
  tokens: string[],
  selectedIndices: Set<number>,
  correctRuns?: number[][]
): Run[] {
  if (selectedIndices.size === 0) return [];
  const sorted = [...selectedIndices].sort((a, b) => a - b);
  const correctRunByToken = new Map<number, number>();
  (correctRuns ?? []).forEach((run, runIdx) => {
    run.forEach((tokenIdx) => {
      if (!correctRunByToken.has(tokenIdx)) {
        correctRunByToken.set(tokenIdx, runIdx);
      }
    });
  });
  const runs: Run[] = [];
  let current: number[] = [];
  let prev = -2;
  let prevBucket = Number.NaN;

  for (const idx of sorted) {
    const bucket = correctRunByToken.get(idx) ?? -1;
    if (idx === prev + 1 && bucket === prevBucket) {
      current.push(idx);
    } else {
      if (current.length > 0) {
        runs.push({ indices: current, phrase: current.map((i) => tokens[i]).join(' ') });
      }
      current = [idx];
    }
    prev = idx;
    prevBucket = bucket;
  }
  if (current.length > 0) {
    runs.push({ indices: current, phrase: current.map((i) => tokens[i]).join(' ') });
  }
  return runs;
}

/** Find all token-index positions where a phrase appears in the token list */
export function findPhrasePositions(tokens: string[], phrase: string): number[][] {
  const phraseTokens = tokenizeText(phrase);
  if (phraseTokens.length === 0) return [];
  const positions: number[][] = [];
  for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
    const match = phraseTokens.every((pt, j) => normalizePhrase(tokens[i + j]) === normalizePhrase(pt));
    if (match) {
      positions.push(Array.from({ length: phraseTokens.length }, (_, k) => i + k));
    }
  }
  return positions;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildTokenRanges(plain: string): Array<{ start: number; end: number }> {
  const rawTokens = tokenizeText(plain);
  const tokenRanges: Array<{ start: number; end: number }> = [];
  let searchFrom = 0;
  for (const token of rawTokens) {
    const idx = plain.indexOf(token, searchFrom);
    if (idx === -1) continue;
    tokenRanges.push({ start: idx, end: idx + token.length });
    searchFrom = idx + token.length;
  }
  return tokenRanges;
}

/**
 * Extract authored correct runs from sanitized HTML.
 * Each run is the exact token-index span of one .correct-highlight element,
 * preserving duplicates and positions in document order.
 */
export function getCorrectTokenRuns(sanitizedHtml: string): number[][] {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHtml, 'text/html');
  const plain = doc.body.textContent ?? '';
  const tokenRanges = buildTokenRanges(plain);
  if (tokenRanges.length === 0) return [];

  const runs: number[][] = [];
  let charOffset = 0;

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      charOffset += (node.textContent ?? '').length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    if (el.classList.contains('correct-highlight')) {
      const spanText = el.textContent ?? '';
      const spanStart = charOffset;
      const spanEnd = charOffset + spanText.length;
      const indices: number[] = [];
      for (let ti = 0; ti < tokenRanges.length; ti++) {
        const { start, end } = tokenRanges[ti];
        if (start < spanEnd && end > spanStart) indices.push(ti);
      }
      if (indices.length > 0) runs.push(indices);
      charOffset += spanText.length;
      return;
    }

    for (const child of Array.from(el.childNodes)) {
      walk(child);
    }
  }

  for (const child of Array.from(doc.body.childNodes)) {
    walk(child);
  }

  return runs;
}

/**
 * Compute which token indices correspond to authored correct highlights.
 * Uses the sanitized HTML (editor controls already stripped) so token boundaries
 * exactly match what the learner sees. Walks the DOM to find .correct-highlight
 * spans and maps their character offsets back to token indices.
 */
export function getSolutionTokenIndices(sanitizedHtml: string): Set<number> {
  const result = new Set<number>();
  getCorrectTokenRuns(sanitizedHtml).forEach((run) => run.forEach((idx) => result.add(idx)));
  return result;
}

/**
 * Compute score for highlight_correct_word using exact run matching.
 *
 * Scoring rules:
 * - Start from full mark.
 * - penaltyPerItem = mark × penaltyPercent / 100.
 * - Subtract penaltyPerItem for each unmatched selected run (false positive).
 * - Subtract penaltyPerItem for each unmatched authored run (false negative).
 * - Clamp to minimum 0.
 */
export function computeScore(
  mark: number,
  penaltyPercent: number,
  selectedRuns: Run[],
  correctRuns: number[][]
): { earned: number; isFullyCorrect: boolean; selectedRunIsCorrect: boolean[] } {
  const penaltyPerItem = (mark * penaltyPercent) / 100;
  const usedCorrect = new Array(correctRuns.length).fill(false);
  const selectedRunIsCorrect = new Array(selectedRuns.length).fill(false);

  let matchedCount = 0;
  for (let i = 0; i < selectedRuns.length; i++) {
    const sel = selectedRuns[i].indices;
    let matchedAt = -1;
    for (let j = 0; j < correctRuns.length; j++) {
      if (usedCorrect[j]) continue;
      if (arraysEqual(sel, correctRuns[j])) {
        matchedAt = j;
        break;
      }
    }
    if (matchedAt !== -1) {
      usedCorrect[matchedAt] = true;
      selectedRunIsCorrect[i] = true;
      matchedCount++;
    }
  }

  const falsePos = selectedRuns.length - matchedCount;
  const falseNeg = correctRuns.length - matchedCount;
  const isFullyCorrect = falsePos === 0 && falseNeg === 0 && correctRuns.length > 0;

  // Product rule: fully wrong attempts should not receive residual partial credit.
  if (matchedCount === 0 && correctRuns.length > 0) {
    return { earned: 0, isFullyCorrect: false, selectedRunIsCorrect };
  }

  const earned = Math.max(0, Math.round((mark - (falsePos + falseNeg) * penaltyPerItem) * 100) / 100);
  return { earned, isFullyCorrect, selectedRunIsCorrect };
}
