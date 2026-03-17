// createEmptyAnswer returns a new AnswerEntry pre-populated with default values and a generated
// UUID when no id is provided, or the caller-supplied id when one is given.
import { createEmptyAnswer } from '../Add';

describe('createEmptyAnswer', () => {
  it('sets text to an empty string', () => {
    expect(createEmptyAnswer().text).toBe('');
  });

  it('sets mark to 100', () => {
    expect(createEmptyAnswer().mark).toBe(100);
  });

  it('sets ignoreCasing to true', () => {
    expect(createEmptyAnswer().ignoreCasing).toBe(true);
  });

  it('sets feedback to false', () => {
    expect(createEmptyAnswer().feedback).toBe(false);
  });

  it('uses the supplied id when one is provided', () => {
    expect(createEmptyAnswer('explicit-id').id).toBe('explicit-id');
  });

  it('generates a non-empty string id when none is provided', () => {
    const entry = createEmptyAnswer();
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('generates unique ids on successive calls without an explicit id', () => {
    const a = createEmptyAnswer();
    const b = createEmptyAnswer();
    expect(a.id).not.toBe(b.id);
  });
});
