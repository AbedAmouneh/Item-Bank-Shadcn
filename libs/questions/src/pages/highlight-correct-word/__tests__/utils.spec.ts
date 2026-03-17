import type { QuestionChoice } from '../../../components/QuestionsTable';
import {
  buildRunsFromIndices,
  computeScore,
  decodeCorrectPhrases,
  findPhrasePositions,
  normalizePhrase,
  tokenizeText,
} from '../utils';

// ---------------------------------------------------------------------------
// tokenizeText
// ---------------------------------------------------------------------------

describe('tokenizeText', () => {
  it('splits a plain sentence into tokens', () => {
    expect(tokenizeText('The quick brown fox')).toEqual(['The', 'quick', 'brown', 'fox']);
  });

  it('returns empty array for an empty string', () => {
    expect(tokenizeText('')).toEqual([]);
  });

  it('ignores leading and trailing whitespace', () => {
    expect(tokenizeText('  hello world  ')).toEqual(['hello', 'world']);
  });

  it('collapses multiple spaces between tokens', () => {
    expect(tokenizeText('a   b   c')).toEqual(['a', 'b', 'c']);
  });

  it('handles newlines as whitespace', () => {
    expect(tokenizeText('line1\nline2')).toEqual(['line1', 'line2']);
  });

  it('keeps punctuation attached to tokens', () => {
    expect(tokenizeText('Hello, world!')).toEqual(['Hello,', 'world!']);
  });

  it('handles a single token', () => {
    expect(tokenizeText('word')).toEqual(['word']);
  });
});

// ---------------------------------------------------------------------------
// normalizePhrase
// ---------------------------------------------------------------------------

describe('normalizePhrase', () => {
  it('strips leading punctuation', () => {
    expect(normalizePhrase(',word')).toBe('word');
  });

  it('strips trailing punctuation', () => {
    expect(normalizePhrase('word.')).toBe('word');
  });

  it('strips both leading and trailing punctuation', () => {
    expect(normalizePhrase('"hello"')).toBe('hello');
  });

  it('preserves internal punctuation', () => {
    expect(normalizePhrase("it's")).toBe("it's");
  });

  it('preserves case', () => {
    expect(normalizePhrase('Quick')).toBe('Quick');
  });

  it('returns an unchanged word that needs no stripping', () => {
    expect(normalizePhrase('word')).toBe('word');
  });

  it('strips exclamation mark', () => {
    expect(normalizePhrase('hi!')).toBe('hi');
  });

  it('strips surrounding whitespace', () => {
    expect(normalizePhrase('  hello  ')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// decodeCorrectPhrases
// ---------------------------------------------------------------------------

describe('decodeCorrectPhrases', () => {
  const makeChoice = (answer: string): QuestionChoice => ({
    id: 1,
    answer,
    fraction: '1',
    feedback: null,
    ignore_casing: false,
  });

  it('extracts answer strings from choices', () => {
    const choices = [makeChoice('fox'), makeChoice('dog')];
    expect(decodeCorrectPhrases(choices)).toEqual(['fox', 'dog']);
  });

  it('returns empty array for undefined input', () => {
    expect(decodeCorrectPhrases(undefined)).toEqual([]);
  });

  it('returns empty array for empty choices array', () => {
    expect(decodeCorrectPhrases([])).toEqual([]);
  });

  it('filters out empty answer strings', () => {
    const choices = [makeChoice('valid'), makeChoice('')];
    expect(decodeCorrectPhrases(choices)).toEqual(['valid']);
  });

  it('preserves duplicate phrases', () => {
    const choices = [makeChoice('fox'), makeChoice('fox')];
    expect(decodeCorrectPhrases(choices)).toEqual(['fox', 'fox']);
  });
});

// ---------------------------------------------------------------------------
// findPhrasePositions
// ---------------------------------------------------------------------------

describe('findPhrasePositions', () => {
  const tokens = ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];

  it('finds a single-word phrase at the correct index', () => {
    expect(findPhrasePositions(tokens, 'fox')).toEqual([[3]]);
  });

  it('finds a multi-word phrase at the correct indices', () => {
    expect(findPhrasePositions(tokens, 'quick brown')).toEqual([[1, 2]]);
  });

  it('returns empty array when phrase is not found', () => {
    expect(findPhrasePositions(tokens, 'cat')).toEqual([]);
  });

  it('finds all occurrences of a repeated phrase', () => {
    const repeated = ['go', 'go', 'go'];
    expect(findPhrasePositions(repeated, 'go')).toEqual([[0], [1], [2]]);
  });

  it('returns empty array for an empty phrase', () => {
    expect(findPhrasePositions(tokens, '')).toEqual([]);
  });

  it('matches with punctuation stripped via normalizePhrase', () => {
    const withPunct = ['Hello,', 'world!'];
    expect(findPhrasePositions(withPunct, 'Hello')).toEqual([[0]]);
  });

  it('returns empty array when token list is shorter than phrase', () => {
    expect(findPhrasePositions(['one'], 'one two')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildRunsFromIndices
// ---------------------------------------------------------------------------

describe('buildRunsFromIndices', () => {
  const tokens = ['a', 'b', 'c', 'd', 'e'];

  it('returns empty array for empty selected indices', () => {
    expect(buildRunsFromIndices(tokens, new Set())).toEqual([]);
  });

  it('builds a single run for consecutive indices', () => {
    const runs = buildRunsFromIndices(tokens, new Set([1, 2, 3]));
    expect(runs).toEqual([{ indices: [1, 2, 3], phrase: 'b c d' }]);
  });

  it('splits non-consecutive indices into separate runs', () => {
    const runs = buildRunsFromIndices(tokens, new Set([0, 2, 4]));
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual({ indices: [0], phrase: 'a' });
    expect(runs[1]).toEqual({ indices: [2], phrase: 'c' });
    expect(runs[2]).toEqual({ indices: [4], phrase: 'e' });
  });

  it('handles a single selected index', () => {
    const runs = buildRunsFromIndices(tokens, new Set([2]));
    expect(runs).toEqual([{ indices: [2], phrase: 'c' }]);
  });

  it('splits consecutive indices that belong to different correctRuns buckets', () => {
    // indices 1 and 2 are consecutive but belong to different correct runs
    const correctRuns = [[1], [2]];
    const runs = buildRunsFromIndices(tokens, new Set([1, 2]), correctRuns);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual({ indices: [1], phrase: 'b' });
    expect(runs[1]).toEqual({ indices: [2], phrase: 'c' });
  });
});

// ---------------------------------------------------------------------------
// computeScore
// ---------------------------------------------------------------------------

describe('computeScore', () => {
  const makeRun = (indices: number[]) => ({
    indices,
    phrase: indices.join('-'),
  });

  it('returns full mark when selection exactly matches correct runs', () => {
    const correctRuns = [[0, 1], [3]];
    const selected = [makeRun([0, 1]), makeRun([3])];
    const result = computeScore(10, 50, selected, correctRuns);
    expect(result.earned).toBe(10);
    expect(result.isFullyCorrect).toBe(true);
  });

  it('returns 0 when nothing was selected', () => {
    const correctRuns = [[0]];
    const result = computeScore(10, 50, [], correctRuns);
    expect(result.earned).toBe(0);
    expect(result.isFullyCorrect).toBe(false);
  });

  it('returns 0 when selection is entirely wrong (no matches)', () => {
    const correctRuns = [[0]];
    const selected = [makeRun([1])]; // wrong token
    const result = computeScore(10, 50, selected, correctRuns);
    expect(result.earned).toBe(0);
    expect(result.isFullyCorrect).toBe(false);
  });

  it('applies penalty for each false positive', () => {
    // 1 correct, 1 extra selected → 1 false positive → penalty = 10 × 100/100 = 10
    const correctRuns = [[0]];
    const selected = [makeRun([0]), makeRun([1])];
    const result = computeScore(10, 100, selected, correctRuns);
    expect(result.earned).toBe(0); // 10 - 10 = 0 (clamped)
  });

  it('applies penalty for each false negative (missed correct run)', () => {
    // 2 correct, only 1 selected → 1 false negative → penalty = 10 × 50/100 = 5
    const correctRuns = [[0], [1]];
    const selected = [makeRun([0])];
    const result = computeScore(10, 50, selected, correctRuns);
    expect(result.earned).toBe(5);
    expect(result.isFullyCorrect).toBe(false);
  });

  it('marks each selected run as correct or incorrect', () => {
    const correctRuns = [[0]];
    const selected = [makeRun([0]), makeRun([2])];
    const result = computeScore(10, 50, selected, correctRuns);
    expect(result.selectedRunIsCorrect[0]).toBe(true);
    expect(result.selectedRunIsCorrect[1]).toBe(false);
  });

  it('clamps earned score to 0 (never negative)', () => {
    // Heavy penalty with many false positives
    const correctRuns: number[][] = [];
    const selected = [makeRun([0]), makeRun([1]), makeRun([2])];
    const result = computeScore(10, 100, selected, correctRuns);
    expect(result.earned).toBe(0);
  });

  it('returns isFullyCorrect false when no correct runs are defined', () => {
    const result = computeScore(10, 0, [], []);
    expect(result.isFullyCorrect).toBe(false);
  });
});
