// DOM-dependent utilities in highlight-correct-word/utils.ts that require a browser environment.
// jsdom (provided by the Jest/Nx preset) supplies DOMParser and document for these tests.
import {
  sanitizeHighlightHtml,
  extractHighlightedPhrases,
  extractPlainText,
  getCorrectTokenRuns,
  getSolutionTokenIndices,
} from '../utils';

// ---------------------------------------------------------------------------
// sanitizeHighlightHtml
// ---------------------------------------------------------------------------

// sanitizeHighlightHtml strips editor-only controls and unwraps highlight wrappers,
// leaving only the highlight content text in the output HTML.
describe('sanitizeHighlightHtml', () => {
  it('returns an empty string unchanged', () => {
    expect(sanitizeHighlightHtml('')).toBe('');
  });

  it('passes through HTML that contains no editor controls', () => {
    const input = '<p>Hello world</p>';
    expect(sanitizeHighlightHtml(input)).toBe('<p>Hello world</p>');
  });

  it('removes .highlight-remove-btn elements', () => {
    const input = '<p>Word <button class="highlight-remove-btn">×</button> text</p>';
    const result = sanitizeHighlightHtml(input);
    expect(result).not.toContain('highlight-remove-btn');
    expect(result).toContain('Word');
    expect(result).toContain('text');
  });

  it('unwraps .highlight-wrapper keeping .correct-highlight inner content', () => {
    const input =
      '<p><span class="highlight-wrapper">' +
        '<span class="correct-highlight" data-phrase="quick">quick</span>' +
        '<button class="highlight-remove-btn">×</button>' +
      '</span> fox</p>';
    const result = sanitizeHighlightHtml(input);
    expect(result).not.toContain('highlight-wrapper');
    expect(result).toContain('correct-highlight');
    expect(result).toContain('quick');
    expect(result).toContain('fox');
  });

  it('leaves .highlight-wrapper intact when it has no .correct-highlight child', () => {
    // The function only replaces wrappers that contain a .correct-highlight; it does
    // not strip orphaned wrappers, so the markup is preserved unchanged.
    const input = '<p><span class="highlight-wrapper"><em>stale</em></span> rest</p>';
    const result = sanitizeHighlightHtml(input);
    expect(result).toContain('highlight-wrapper');
    expect(result).toContain('stale');
  });

  it('leaves unrelated span elements untouched', () => {
    const input = '<p><span class="emphasis">important</span></p>';
    const result = sanitizeHighlightHtml(input);
    expect(result).toContain('class="emphasis"');
    expect(result).toContain('important');
  });
});

// ---------------------------------------------------------------------------
// extractHighlightedPhrases
// ---------------------------------------------------------------------------

// extractHighlightedPhrases returns the data-phrase attribute values of all
// .correct-highlight spans, in document order, preserving duplicates.
describe('extractHighlightedPhrases', () => {
  it('returns empty array for empty HTML', () => {
    expect(extractHighlightedPhrases('')).toEqual([]);
  });

  it('returns empty array when no .correct-highlight spans are present', () => {
    expect(extractHighlightedPhrases('<p>Hello world</p>')).toEqual([]);
  });

  it('extracts a single phrase', () => {
    const html = '<p><span class="correct-highlight" data-phrase="fox">fox</span></p>';
    expect(extractHighlightedPhrases(html)).toEqual(['fox']);
  });

  it('extracts multiple phrases in document order', () => {
    const html =
      '<p>' +
        '<span class="correct-highlight" data-phrase="quick">quick</span> brown ' +
        '<span class="correct-highlight" data-phrase="fox">fox</span>' +
      '</p>';
    expect(extractHighlightedPhrases(html)).toEqual(['quick', 'fox']);
  });

  it('preserves duplicate phrases', () => {
    const html =
      '<p>' +
        '<span class="correct-highlight" data-phrase="the">the</span> cat and ' +
        '<span class="correct-highlight" data-phrase="the">the</span> dog' +
      '</p>';
    expect(extractHighlightedPhrases(html)).toEqual(['the', 'the']);
  });

  it('skips spans that have the class but no data-phrase attribute', () => {
    const html = '<p><span class="correct-highlight">no attr</span></p>';
    expect(extractHighlightedPhrases(html)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractPlainText
// ---------------------------------------------------------------------------

// extractPlainText strips all HTML tags and returns only the text content.
describe('extractPlainText', () => {
  it('returns an empty string for empty input', () => {
    expect(extractPlainText('')).toBe('');
  });

  it('returns the same text for plain text (no tags)', () => {
    expect(extractPlainText('Hello world')).toBe('Hello world');
  });

  it('strips block-level tags and returns text', () => {
    expect(extractPlainText('<p>Hello</p>')).toBe('Hello');
  });

  it('strips nested inline tags', () => {
    expect(extractPlainText('<p>The <strong>quick</strong> fox</p>')).toBe('The quick fox');
  });

  it('concatenates text across multiple paragraphs', () => {
    const result = extractPlainText('<p>First</p><p>Second</p>');
    expect(result).toContain('First');
    expect(result).toContain('Second');
  });
});

// ---------------------------------------------------------------------------
// getCorrectTokenRuns
// ---------------------------------------------------------------------------

// getCorrectTokenRuns returns arrays of token indices covered by each
// .correct-highlight span, in document order.
describe('getCorrectTokenRuns', () => {
  it('returns empty array for empty input', () => {
    expect(getCorrectTokenRuns('')).toEqual([]);
  });

  it('returns empty array when no .correct-highlight spans exist', () => {
    expect(getCorrectTokenRuns('<p>The quick brown fox</p>')).toEqual([]);
  });

  it('maps a single highlighted word to its token index', () => {
    // "The quick brown fox" — "quick" is token index 1
    const html =
      '<p>The <span class="correct-highlight">quick</span> brown fox</p>';
    const runs = getCorrectTokenRuns(html);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual([1]);
  });

  it('maps a two-word highlight to two consecutive token indices', () => {
    // "The quick brown fox" — "quick brown" spans tokens 1 and 2
    const html =
      '<p>The <span class="correct-highlight">quick brown</span> fox</p>';
    const runs = getCorrectTokenRuns(html);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual([1, 2]);
  });

  it('returns separate runs for two non-adjacent highlights', () => {
    const html =
      '<p>' +
        '<span class="correct-highlight">The</span> quick ' +
        '<span class="correct-highlight">fox</span>' +
      '</p>';
    const runs = getCorrectTokenRuns(html);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual([0]);
    expect(runs[1]).toEqual([2]);
  });

  it('handles multiple separate highlights and preserves document order', () => {
    // "alpha beta gamma delta" — beta and delta are highlighted
    const html =
      '<p>alpha <span class="correct-highlight">beta</span> gamma ' +
        '<span class="correct-highlight">delta</span></p>';
    const runs = getCorrectTokenRuns(html);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual([1]);
    expect(runs[1]).toEqual([3]);
  });

  it('returns the first token [0] when the first word is highlighted', () => {
    const html = '<p><span class="correct-highlight">First</span> word here</p>';
    const runs = getCorrectTokenRuns(html);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// getSolutionTokenIndices
// ---------------------------------------------------------------------------

// getSolutionTokenIndices aggregates all token indices from all correct runs
// into a single flat Set.
describe('getSolutionTokenIndices', () => {
  it('returns an empty Set for HTML with no highlights', () => {
    expect(getSolutionTokenIndices('<p>Hello world</p>').size).toBe(0);
  });

  it('returns a Set containing the single highlighted token index', () => {
    const html = '<p>The <span class="correct-highlight">quick</span> fox</p>';
    const indices = getSolutionTokenIndices(html);
    expect(indices.has(1)).toBe(true);
    expect(indices.size).toBe(1);
  });

  it('returns a Set with all token indices covered by multiple highlights', () => {
    const html =
      '<p>' +
        '<span class="correct-highlight">The</span> quick ' +
        '<span class="correct-highlight">fox</span>' +
      '</p>';
    const indices = getSolutionTokenIndices(html);
    expect(indices.has(0)).toBe(true);
    expect(indices.has(2)).toBe(true);
    expect(indices.size).toBe(2);
  });

  it('deduplicates token indices that appear in overlapping runs', () => {
    // Contrived: two highlights that share a token would deduplicate in the Set
    const html =
      '<p><span class="correct-highlight">alpha beta</span> ' +
        '<span class="correct-highlight">beta gamma</span></p>';
    const indices = getSolutionTokenIndices(html);
    // "beta" (index 1) should appear only once in the Set
    expect(indices.has(1)).toBe(true);
    expect([...indices].filter((i) => i === 1)).toHaveLength(1);
  });
});
