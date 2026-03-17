import {
  createEmptyNumericalAnswer,
  createEmptyNumericalUnit,
  latexUnitToPlainText,
  MARK_OPTIONS,
} from '../types';

describe('latexUnitToPlainText', () => {
  it('returns plain strings unchanged', () => {
    expect(latexUnitToPlainText('kg')).toBe('kg');
  });

  it('converts \\exponentialE to "e"', () => {
    expect(latexUnitToPlainText('\\exponentialE')).toBe('e');
  });

  it('converts \\imaginaryI to "i"', () => {
    expect(latexUnitToPlainText('\\imaginaryI')).toBe('i');
  });

  it('converts \\imaginaryJ to "j"', () => {
    expect(latexUnitToPlainText('\\imaginaryJ')).toBe('j');
  });

  it('converts \\mu to "mu"', () => {
    expect(latexUnitToPlainText('\\mu')).toBe('mu');
  });

  it('converts \\degree to "deg"', () => {
    expect(latexUnitToPlainText('\\degree')).toBe('deg');
  });

  it('converts \\ohm to "ohm"', () => {
    expect(latexUnitToPlainText('\\ohm')).toBe('ohm');
  });

  it('converts \\times to "×"', () => {
    expect(latexUnitToPlainText('\\times')).toBe('×');
  });

  it('converts \\cdot to "·"', () => {
    expect(latexUnitToPlainText('\\cdot')).toBe('·');
  });

  it('converts \\pm to "±"', () => {
    expect(latexUnitToPlainText('\\pm')).toBe('±');
  });

  it('converts \\pi to "pi"', () => {
    expect(latexUnitToPlainText('\\pi')).toBe('pi');
  });

  it('converts \\infty to "infty"', () => {
    expect(latexUnitToPlainText('\\infty')).toBe('infty');
  });

  it('converts \\infinity (alias) to "infty"', () => {
    expect(latexUnitToPlainText('\\infinity')).toBe('infty');
  });

  it('converts a bare command name without backslash', () => {
    expect(latexUnitToPlainText('exponentialE')).toBe('e');
  });

  it('converts multiple commands in a compound expression', () => {
    // "kg·μs" written as LaTeX
    expect(latexUnitToPlainText('kg\\cdot\\mu s')).toBe('kg·mu s');
  });

  it('preserves characters surrounding a command', () => {
    expect(latexUnitToPlainText('1\\degree C')).toBe('1deg C');
  });

  it('returns empty string for empty input', () => {
    expect(latexUnitToPlainText('')).toBe('');
  });

  it('returns the original value for non-string input (null)', () => {
    // Runtime guard: returns value as-is when not a string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(latexUnitToPlainText(null as any)).toBe(null);
  });
});

describe('createEmptyNumericalAnswer', () => {
  it('returns an empty answer string', () => {
    expect(createEmptyNumericalAnswer().answer).toBe('');
  });

  it('returns error set to "0"', () => {
    expect(createEmptyNumericalAnswer().error).toBe('0');
  });

  it('returns mark set to 100', () => {
    expect(createEmptyNumericalAnswer().mark).toBe(100);
  });

  it('returns feedback set to false', () => {
    expect(createEmptyNumericalAnswer().feedback).toBe(false);
  });

  it('returns a non-empty id', () => {
    expect(createEmptyNumericalAnswer().id).toBeTruthy();
  });

  it('returns a unique id on each call', () => {
    const a = createEmptyNumericalAnswer();
    const b = createEmptyNumericalAnswer();
    expect(a.id).not.toBe(b.id);
  });
});

describe('createEmptyNumericalUnit', () => {
  it('returns an empty unit string', () => {
    expect(createEmptyNumericalUnit().unit).toBe('');
  });

  it('returns multiplier as "1.0"', () => {
    expect(createEmptyNumericalUnit().multiplier).toBe('1.0');
  });

  it('returns a non-empty id', () => {
    expect(createEmptyNumericalUnit().id).toBeTruthy();
  });

  it('returns a unique id on each call', () => {
    const a = createEmptyNumericalUnit();
    const b = createEmptyNumericalUnit();
    expect(a.id).not.toBe(b.id);
  });
});

describe('MARK_OPTIONS', () => {
  it('starts with 0', () => {
    expect(MARK_OPTIONS[0]).toBe(0);
  });

  it('ends with 100', () => {
    expect(MARK_OPTIONS[MARK_OPTIONS.length - 1]).toBe(100);
  });

  it('contains 50', () => {
    expect(MARK_OPTIONS).toContain(50);
  });

  it('has no negative values', () => {
    expect(MARK_OPTIONS.every((v) => v >= 0)).toBe(true);
  });

  it('has no values above 100', () => {
    expect(MARK_OPTIONS.every((v) => v <= 100)).toBe(true);
  });
});
