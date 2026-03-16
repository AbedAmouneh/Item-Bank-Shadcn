import { parseKeysFromText } from '../DragDropTextEditor';

describe('parseKeysFromText', () => {
  it('returns empty array for empty string', () => {
    expect(parseKeysFromText('')).toEqual([]);
  });

  it('returns empty array for text with no [[key]] tokens', () => {
    expect(parseKeysFromText('<p>Hello world</p>')).toEqual([]);
  });

  it('extracts a single key from plain text', () => {
    expect(parseKeysFromText('Fill [[blank]] here.')).toEqual(['blank']);
  });

  it('extracts multiple distinct keys in order', () => {
    expect(parseKeysFromText('[[first]] and [[second]] and [[third]]')).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('keeps repeated keys when duplicates exist', () => {
    expect(parseKeysFromText('[[hello]] and [[Hello]] and [[HELLO]]')).toEqual([
      'hello',
      'Hello',
      'HELLO',
    ]);
  });

  it('preserves casing and order exactly as typed', () => {
    expect(parseKeysFromText('[[Apple]] and [[apple]]')).toEqual(['Apple', 'apple']);
  });

  it('extracts keys embedded in HTML markup', () => {
    const html =
      '<p>Word <span class="key-wrapper"><span class="fill-in-blank-key">[[item1]]</span></span> here.</p>';
    expect(parseKeysFromText(html)).toEqual(['item1']);
  });

  it('extracts keys from wrapper data-key fallback when token text is missing', () => {
    const html =
      '<p><span class="key-wrapper"><span class="fill-in-blank-key" data-key="item2"></span><span class="key-actions"><button class="key-action-btn" data-key="item2"></button></span></span></p>';
    expect(parseKeysFromText(html)).toEqual(['item2']);
  });

  it('ignores TinyMCE bogus cloned key nodes', () => {
    const html =
      '<p><span class="key-wrapper"><span class="fill-in-blank-key" data-key="king">[[king]]</span></span><span class="fill-in-blank-key" data-key="king" data-mce-bogus="1">[[king]]</span></p>';
    expect(parseKeysFromText(html)).toEqual(['king']);
  });

  it('trims whitespace inside brackets', () => {
    expect(parseKeysFromText('[[ spaced ]]')).toEqual(['spaced']);
  });

  it('handles keys with special characters', () => {
    expect(parseKeysFromText('[[café]] and [[naïve]]')).toEqual(['café', 'naïve']);
  });

  it('skips empty brackets', () => {
    expect(parseKeysFromText('[[]] and [[valid]]')).toEqual(['valid']);
  });
});
