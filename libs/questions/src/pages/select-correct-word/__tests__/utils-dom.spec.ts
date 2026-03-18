// sanitizeKeyHtml strips editor controls and replaces key-wrapper elements with plain text,
// requiring a browser environment (jsdom provided by the Jest/Nx preset).
import { sanitizeKeyHtml } from '../utils';

// sanitizeKeyHtml removes .key-actions elements and replaces .key-wrapper elements with
// the text content of their inner .fill-in-blank-key span.
describe('sanitizeKeyHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeKeyHtml('')).toBe('');
  });

  it('passes through HTML that contains no editor controls', () => {
    const input = '<p>Hello world</p>';
    expect(sanitizeKeyHtml(input)).toBe('<p>Hello world</p>');
  });

  it('removes .key-actions elements', () => {
    const input =
      '<p>Word ' +
        '<span class="key-actions"><button>edit</button><button>delete</button></span>' +
      ' text</p>';
    const result = sanitizeKeyHtml(input);
    expect(result).not.toContain('key-actions');
    expect(result).toContain('Word');
    expect(result).toContain('text');
  });

  it('replaces .key-wrapper with the text of its .fill-in-blank-key child', () => {
    const input =
      '<p>Select ' +
        '<span class="key-wrapper">' +
          '<span class="fill-in-blank-key">color</span>' +
          '<span class="key-actions"><button>×</button></span>' +
        '</span>' +
      ' here</p>';
    const result = sanitizeKeyHtml(input);
    expect(result).not.toContain('key-wrapper');
    expect(result).not.toContain('key-actions');
    expect(result).toContain('color');
    expect(result).toContain('here');
  });

  it('uses an empty string when .key-wrapper has no .fill-in-blank-key child', () => {
    const input = '<p><span class="key-wrapper"><em>orphan</em></span></p>';
    const result = sanitizeKeyHtml(input);
    expect(result).not.toContain('key-wrapper');
    // No text extracted from the wrapper — the replacement text node is empty
    expect(result).not.toContain('orphan');
  });

  it('processes multiple .key-wrapper elements in document order', () => {
    const input =
      '<p>' +
        '<span class="key-wrapper"><span class="fill-in-blank-key">alpha</span></span>' +
        ' and ' +
        '<span class="key-wrapper"><span class="fill-in-blank-key">beta</span></span>' +
      '</p>';
    const result = sanitizeKeyHtml(input);
    expect(result).not.toContain('key-wrapper');
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
  });

  it('leaves unrelated elements untouched', () => {
    const input = '<p class="question"><strong>Bold</strong> text</p>';
    const result = sanitizeKeyHtml(input);
    expect(result).toContain('class="question"');
    expect(result).toContain('<strong>Bold</strong>');
  });

  it('removes a standalone .key-actions element outside any wrapper', () => {
    const input = '<span class="key-actions"><button>X</button></span>After';
    const result = sanitizeKeyHtml(input);
    expect(result).not.toContain('key-actions');
    expect(result).toContain('After');
  });
});
