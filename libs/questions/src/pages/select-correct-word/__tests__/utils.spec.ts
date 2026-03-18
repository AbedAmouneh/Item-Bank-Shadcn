import type { QuestionChoice } from '../../../components/QuestionsTable';
import { decodeGroups, parseQuestionText } from '../utils';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const makeChoice = (
  id: number,
  answer: string,
  fraction: string
): QuestionChoice => ({
  id,
  answer,
  fraction,
  feedback: null,
  ignore_casing: false,
});

// ---------------------------------------------------------------------------
// decodeGroups
// ---------------------------------------------------------------------------

describe('decodeGroups', () => {
  it('returns empty object for undefined input', () => {
    expect(decodeGroups(undefined)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(decodeGroups([])).toEqual({});
  });

  it('parses a single choice into the correct group', () => {
    const choices = [makeChoice(1, '[color] red', '1')];
    const groups = decodeGroups(choices);
    expect(groups['color']).toBeDefined();
    expect(groups['color'].key).toBe('color');
    expect(groups['color'].options).toHaveLength(1);
    expect(groups['color'].options[0].text).toBe('red');
  });

  it('marks an option as correct when fraction is "1"', () => {
    const choices = [makeChoice(1, '[color] red', '1')];
    expect(decodeGroups(choices)['color'].options[0].isCorrect).toBe(true);
  });

  it('marks an option as incorrect when fraction is "0"', () => {
    const choices = [makeChoice(1, '[color] blue', '0')];
    expect(decodeGroups(choices)['color'].options[0].isCorrect).toBe(false);
  });

  it('groups multiple choices under the same key', () => {
    const choices = [
      makeChoice(1, '[color] red', '1'),
      makeChoice(2, '[color] blue', '0'),
    ];
    const groups = decodeGroups(choices);
    expect(groups['color'].options).toHaveLength(2);
  });

  it('creates separate groups for different keys', () => {
    const choices = [
      makeChoice(1, '[color] red', '1'),
      makeChoice(2, '[animal] dog', '1'),
    ];
    const groups = decodeGroups(choices);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups['color']).toBeDefined();
    expect(groups['animal']).toBeDefined();
  });

  it('preserves the original id on each option', () => {
    const choices = [makeChoice(42, '[size] large', '1')];
    expect(decodeGroups(choices)['size'].options[0].id).toBe(42);
  });

  it('ignores choices that do not match the [key] text pattern', () => {
    const choices = [makeChoice(1, 'no brackets here', '1')];
    expect(decodeGroups(choices)).toEqual({});
  });

  it('trims whitespace from the parsed key', () => {
    const choices = [makeChoice(1, '[ spaced ] value', '1')];
    const groups = decodeGroups(choices);
    expect(groups['spaced']).toBeDefined();
  });

  it('trims whitespace from the parsed text', () => {
    const choices = [makeChoice(1, '[key]   padded text   ', '1')];
    expect(decodeGroups(choices)['key'].options[0].text).toBe('padded text');
  });
});

// ---------------------------------------------------------------------------
// parseQuestionText
// ---------------------------------------------------------------------------

describe('parseQuestionText', () => {
  it('returns a single text part for plain text with no keys', () => {
    const parts = parseQuestionText('Hello world');
    expect(parts).toEqual([{ type: 'text', content: 'Hello world' }]);
  });

  it('returns a single key part for a lone [[key]]', () => {
    const parts = parseQuestionText('[[color]]');
    expect(parts).toEqual([{ type: 'key', key: 'color' }]);
  });

  it('splits text and key correctly', () => {
    const parts = parseQuestionText('Pick a [[color]] here');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ type: 'text', content: 'Pick a ' });
    expect(parts[1]).toEqual({ type: 'key', key: 'color' });
    expect(parts[2]).toEqual({ type: 'text', content: ' here' });
  });

  it('handles multiple keys', () => {
    const parts = parseQuestionText('[[a]] and [[b]]');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ type: 'key', key: 'a' });
    expect(parts[1]).toEqual({ type: 'text', content: ' and ' });
    expect(parts[2]).toEqual({ type: 'key', key: 'b' });
  });

  it('trims whitespace from key names', () => {
    const parts = parseQuestionText('[[ spaced ]]');
    expect(parts).toEqual([{ type: 'key', key: 'spaced' }]);
  });

  it('returns empty array for empty string', () => {
    expect(parseQuestionText('')).toEqual([]);
  });

  it('handles a key at the very start of the string', () => {
    const parts = parseQuestionText('[[key]] rest');
    expect(parts[0]).toEqual({ type: 'key', key: 'key' });
    expect(parts[1]).toEqual({ type: 'text', content: ' rest' });
  });

  it('handles a key at the very end of the string', () => {
    const parts = parseQuestionText('start [[key]]');
    expect(parts[0]).toEqual({ type: 'text', content: 'start ' });
    expect(parts[1]).toEqual({ type: 'key', key: 'key' });
  });

  it('handles adjacent keys with no text between them', () => {
    const parts = parseQuestionText('[[a]][[b]]');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual({ type: 'key', key: 'a' });
    expect(parts[1]).toEqual({ type: 'key', key: 'b' });
  });
});
