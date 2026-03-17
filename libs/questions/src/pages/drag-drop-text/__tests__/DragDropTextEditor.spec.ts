// parseKeysFromText extracts [[key]] names from editor HTML.
// When DOMParser is available (as it is under jsdom) it walks the DOM to convert
// .key-wrapper elements to [[key]] tokens before running the regex.
import { parseKeysFromText, DRAG_DROP_GROUP_COLORS } from '../DragDropTextEditor';

// ---------------------------------------------------------------------------
// parseKeysFromText
// ---------------------------------------------------------------------------

// parseKeysFromText extracts drag-drop key names from TinyMCE HTML, converting
// .key-wrapper and .fill-in-blank-key elements to [[key]] bracket notation first.
describe('parseKeysFromText', () => {
  it('returns empty array for empty string', () => {
    expect(parseKeysFromText('')).toEqual([]);
  });

  it('returns empty array for HTML with no keys', () => {
    expect(parseKeysFromText('<p>Hello world</p>')).toEqual([]);
  });

  it('extracts a single [[key]] token from plain bracket notation', () => {
    expect(parseKeysFromText('Some [[alpha]] text')).toEqual(['alpha']);
  });

  it('extracts multiple [[key]] tokens in order', () => {
    expect(parseKeysFromText('[[one]] and [[two]]')).toEqual(['one', 'two']);
  });

  it('trims whitespace from key names inside brackets', () => {
    expect(parseKeysFromText('[[ spaced ]]')).toEqual(['spaced']);
  });

  it('extracts keys from .key-wrapper / .fill-in-blank-key DOM structure', () => {
    const html =
      '<p>Choose ' +
        '<span class="key-wrapper">' +
          '<span class="fill-in-blank-key">color</span>' +
          '<span class="key-actions"><button>edit</button></span>' +
        '</span>' +
      ' here</p>';
    expect(parseKeysFromText(html)).toEqual(['color']);
  });

  it('strips .key-actions and .edit-icon nodes before extracting keys', () => {
    const html =
      '<span class="key-wrapper">' +
        '<span class="fill-in-blank-key">size</span>' +
        '<span class="key-actions">' +
          '<span class="edit-icon">✏</span>' +
          '<span class="delete-icon">🗑</span>' +
        '</span>' +
      '</span>';
    expect(parseKeysFromText(html)).toEqual(['size']);
  });

  it('extracts multiple keys from multiple .key-wrapper elements', () => {
    const html =
      '<p>' +
        '<span class="key-wrapper"><span class="fill-in-blank-key">alpha</span></span>' +
        ' text ' +
        '<span class="key-wrapper"><span class="fill-in-blank-key">beta</span></span>' +
      '</p>';
    expect(parseKeysFromText(html)).toEqual(['alpha', 'beta']);
  });

  it('skips .key-wrapper elements marked as TinyMCE bogus nodes', () => {
    const html =
      '<p>' +
        '<span class="key-wrapper" data-mce-bogus="1">' +
          '<span class="fill-in-blank-key">ghost</span>' +
        '</span>' +
        '<span class="key-wrapper"><span class="fill-in-blank-key">real</span></span>' +
      '</p>';
    const keys = parseKeysFromText(html);
    expect(keys).toContain('real');
    expect(keys).not.toContain('ghost');
  });

  it('skips .key-wrapper whose key resolves to an empty string', () => {
    const html =
      '<span class="key-wrapper">' +
        '<span class="fill-in-blank-key">  </span>' +
      '</span>';
    expect(parseKeysFromText(html)).toEqual([]);
  });

  it('extracts keys from standalone .fill-in-blank-key spans (without a wrapper)', () => {
    const html = '<p><span class="fill-in-blank-key">standalone</span></p>';
    expect(parseKeysFromText(html)).toEqual(['standalone']);
  });

  it('skips standalone .fill-in-blank-key spans marked as TinyMCE bogus', () => {
    const html =
      '<p>' +
        '<span class="fill-in-blank-key" data-mce-bogus="1">phantom</span>' +
        '<span class="fill-in-blank-key">visible</span>' +
      '</p>';
    const keys = parseKeysFromText(html);
    expect(keys).toContain('visible');
    expect(keys).not.toContain('phantom');
  });

  it('unwraps [[brackets]] inside .fill-in-blank-key text content', () => {
    // TinyMCE can store the key text as "[[keyname]]" — it should be unwrapped
    const html =
      '<span class="key-wrapper">' +
        '<span class="fill-in-blank-key">[[wrapped]]</span>' +
      '</span>';
    expect(parseKeysFromText(html)).toEqual(['wrapped']);
  });
});

// ---------------------------------------------------------------------------
// DRAG_DROP_GROUP_COLORS
// ---------------------------------------------------------------------------

// DRAG_DROP_GROUP_COLORS is the ordered list of semantic colour names available for groups.
describe('DRAG_DROP_GROUP_COLORS', () => {
  it('contains exactly 6 colours', () => {
    expect(DRAG_DROP_GROUP_COLORS).toHaveLength(6);
  });

  it('includes primary, secondary, success, warning, error, and info', () => {
    const expected = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
    expected.forEach((color) => {
      expect(DRAG_DROP_GROUP_COLORS).toContain(color);
    });
  });

  it('has no duplicate values', () => {
    expect(new Set(DRAG_DROP_GROUP_COLORS).size).toBe(DRAG_DROP_GROUP_COLORS.length);
  });
});
