export type NumericalUnitHandling = 'required' | 'optional' | 'disabled';
export type NumericalUnitInputMethod = 'multiple_choice_selection' | 'drop_down' | 'text_input';

export type NumericalAnswerEntry = {
  id: string;
  answer: string;
  error: string;
  mark: number;
  feedback: boolean;
};

export type NumericalUnit = {
  id: string;
  unit: string;
  multiplier: string;
};

export const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

export const UNIT_HANDLING_OPTIONS: Array<{
  value: NumericalUnitHandling;
  label: string;
  description: string;
}> = [
  {
    value: 'required',
    label: 'Required',
    description: 'Units are required and will be graded together with the numerical value.',
  },
  {
    value: 'optional',
    label: 'Optional',
    description: 'Units are optional. If no unit is entered, the default unit is applied.',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Units are not used. Only the numerical value will be graded.',
  },
];

export const UNIT_INPUT_METHOD_OPTIONS: Array<{ value: NumericalUnitInputMethod; label: string }> = [
  { value: 'multiple_choice_selection', label: 'Multiple Choice Selection' },
  { value: 'drop_down', label: 'Drop-Down' },
  { value: 'text_input', label: 'Text Input' },
];

export function createEmptyNumericalAnswer(): NumericalAnswerEntry {
  return {
    id: crypto.randomUUID(),
    answer: '',
    error: '0',
    mark: 100,
    feedback: false,
  };
}

export function createEmptyNumericalUnit(): NumericalUnit {
  return {
    id: crypto.randomUUID(),
    unit: '',
    multiplier: '1.0',
  };
}

/**
 * Map of LaTeX/MathLive command names (without backslash) to plain-text equivalents.
 * Used when switching unit input to text mode. Order doesn't matter; replacements
 * run longest-first to avoid partial matches. Add new entries as needed.
 */
const LATEX_UNIT_TO_PLAIN: Record<string, string> = {
  // MathLive / Unicode-style names (camelCase)
  exponentialE: 'e',
  imaginaryI: 'i',
  imaginaryJ: 'j',
  differentialD: 'd',
  capitalDifferentialD: 'D',
  // Greek lowercase (LaTeX \alpha, \beta, ...)
  alpha: 'alpha',
  beta: 'beta',
  gamma: 'gamma',
  delta: 'delta',
  epsilon: 'epsilon',
  zeta: 'zeta',
  eta: 'eta',
  theta: 'theta',
  iota: 'iota',
  kappa: 'kappa',
  lambda: 'lambda',
  mu: 'mu',
  nu: 'nu',
  xi: 'xi',
  pi: 'pi',
  rho: 'rho',
  sigma: 'sigma',
  tau: 'tau',
  upsilon: 'upsilon',
  phi: 'phi',
  chi: 'chi',
  psi: 'psi',
  omega: 'omega',
  // Greek uppercase
  Gamma: 'Gamma',
  Delta: 'Delta',
  Theta: 'Theta',
  Lambda: 'Lambda',
  Xi: 'Xi',
  Pi: 'Pi',
  Sigma: 'Sigma',
  Upsilon: 'Upsilon',
  Phi: 'Phi',
  Psi: 'Psi',
  Omega: 'Omega',
  // Common symbols (units, operators)
  infty: 'infty',
  infinity: 'infty',
  degree: 'deg',
  ohm: 'ohm',
  times: '×',
  cdot: '·',
  pm: '±',
  mp: '∓',
  partial: '∂',
  nabla: '∇',
  ell: 'l',
  hbar: 'ℏ',
  // Real / imaginary part
  Re: 'Re',
  Im: 'Im',
  // Relations (for expressions in units)
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  // Misc
  div: '÷',
  sqrt: '√',
};

const LATEX_COMMAND_NAMES = Object.keys(LATEX_UNIT_TO_PLAIN).sort(
  (a, b) => b.length - a.length
);

/** Converts LaTeX/MathLive unit strings to plain text for text-input mode (e.g. \exponentialE -> e, \imaginaryI -> i). */
export function latexUnitToPlainText(value: string): string {
  if (!value || typeof value !== 'string') return value;
  let s = value;
  // Replace known commands (\command or command) longest-first to avoid partial matches
  for (const cmd of LATEX_COMMAND_NAMES) {
    const plain = LATEX_UNIT_TO_PLAIN[cmd];
    const re = new RegExp(`\\\\?${cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    s = s.replace(re, plain);
  }
  return s;
}
