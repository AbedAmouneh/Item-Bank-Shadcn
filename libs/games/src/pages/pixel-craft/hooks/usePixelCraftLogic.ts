import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '@item-bank/api';
import { stripHtml } from '../../../domain/extractAnswers';
import { useFallbackQuestions } from '../../../domain/hooks';
import type { FallbackQuestion } from '../../../domain/types';
import { FALLBACK_QUESTIONS } from '../fallback/questions';

const GRID_CELL_COUNT = 9;
const MAX_CRAFTS_PER_SESSION = 10;
export const SCORE_PER_CRAFT = 80;
const CORRECT_FLASH_MS = 400;
const WRONG_FLASH_MS = 300;
const REVEAL_MS = 1400;

interface MultipleChoiceContent extends Record<string, unknown> {
  choices?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

interface NumericalContent extends Record<string, unknown> {
  correctAnswer?: number;
}

interface PixelCraftLanguageContent extends Record<string, unknown> {
  pixelCraftKind: 'language';
  craftedEmoji: string;
  craftedLabel: string;
  prompt: string;
  correctFragments: string[];
  decoyFragments: string[];
}

interface PixelCraftMathContent extends Record<string, unknown> {
  pixelCraftKind: 'math';
  craftedEmoji: string;
  craftedLabel: string;
  prompt: string;
  equationFragments: string[];
}

/**
 * The four screens Pixel Craft moves through.
 */
export type PixelCraftPhase = 'idle' | 'crafting' | 'reveal' | 'results';

/**
 * One draggable or placed puzzle piece.
 */
export interface PixelCraftFragment {
  id: string;
  text: string;
  isDecoy: boolean;
}

/**
 * One ready-to-play crafting puzzle.
 */
export interface PixelCraftPuzzle {
  id: string;
  kind: 'language' | 'math';
  prompt: string;
  craftedEmoji: string;
  craftedLabel: string;
  solution: Array<string | null>;
  fragments: PixelCraftFragment[];
}

/**
 * A movement offset used by the reveal animation.
 */
export interface PixelCraftRevealOffset {
  x: number;
  y: number;
}

/**
 * Summary numbers shown on the results screen and sent with the save payload.
 */
export interface PixelCraftSummary {
  score: number;
  craftsCompleted: number;
  perfectCrafts: number;
  avgTimeSec: number;
  wrongPlacements: number;
  maxStreak: number;
  totalCrafts: number;
}

interface UsePixelCraftLogicParams {
  tag_ids?: number[];
  item_bank_id?: number;
}

interface UsePixelCraftLogicResult {
  phase: PixelCraftPhase;
  isLoading: boolean;
  score: number;
  streak: number;
  maxStreak: number;
  currentCraftNumber: number;
  totalCrafts: number;
  currentPuzzle: PixelCraftPuzzle | null;
  placedFragments: Array<PixelCraftFragment | null>;
  paletteFragments: PixelCraftFragment[];
  cellFeedback: Record<number, 'correct' | 'wrong'>;
  errorCells: number[];
  gridShakeKey: number;
  revealOffsets: Record<number, PixelCraftRevealOffset>;
  craftedEmoji: string | null;
  craftedLabel: string | null;
  showScorePopup: boolean;
  summary: PixelCraftSummary;
  canStart: boolean;
  canSubmit: boolean;
  startGame: () => void;
  handleDrop: (fragmentId: string, dropTargetId: string | null) => void;
  submitCraft: (offsets: Record<number, PixelCraftRevealOffset>) => void;
  dismissScorePopup: () => void;
}

const RESULT_EMOJIS = ['🪵', '🧱', '🛡️', '🔮', '⚙️', '🧭', '📦', '🪄'];

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function normalizeFragment(text: string): string {
  return stripHtml(text)
    .replace(/[!?.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitWords(text: string): string[] {
  return normalizeFragment(text)
    .split(' ')
    .map((fragment) => fragment.trim())
    .filter(Boolean);
}

function buildCenteredSolution(tokens: string[]): Array<string | null> {
  const safeTokens = tokens.slice(0, GRID_CELL_COUNT);
  const startIndex = Math.max(
    0,
    Math.floor((GRID_CELL_COUNT - safeTokens.length) / 2),
  );
  const solution = Array<string | null>(GRID_CELL_COUNT).fill(null);

  safeTokens.forEach((token, tokenIndex) => {
    solution[startIndex + tokenIndex] = token;
  });

  return solution;
}

function buildFragments(
  puzzleId: string,
  solutionTokens: string[],
  decoyTokens: string[],
): {
  solutionFragments: PixelCraftFragment[];
  allFragments: PixelCraftFragment[];
} {
  const solutionFragments = solutionTokens.map((token, tokenIndex) => ({
    id: `${puzzleId}-solution-${tokenIndex}`,
    text: token,
    isDecoy: false,
  }));

  const decoyFragments = decoyTokens.map((token, tokenIndex) => ({
    id: `${puzzleId}-decoy-${tokenIndex}`,
    text: token,
    isDecoy: true,
  }));

  return {
    solutionFragments,
    allFragments: shuffleArray([...solutionFragments, ...decoyFragments]),
  };
}

function pickResultEmoji(seed: string): string {
  const total = seed
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return RESULT_EMOJIS[total % RESULT_EMOJIS.length];
}

function buildPuzzle(
  puzzleId: string,
  kind: 'language' | 'math',
  prompt: string,
  craftedEmoji: string,
  craftedLabel: string,
  solutionTokens: string[],
  decoyTokens: string[],
): PixelCraftPuzzle | null {
  const cleanedSolution = solutionTokens
    .map((token) => normalizeFragment(token))
    .filter(Boolean);

  if (cleanedSolution.length < 2 || cleanedSolution.length > GRID_CELL_COUNT) {
    return null;
  }

  const filteredDecoys = decoyTokens
    .map((token) => normalizeFragment(token))
    .filter(
      (token, tokenIndex, source) =>
        Boolean(token) &&
        !cleanedSolution.includes(token) &&
        source.indexOf(token) === tokenIndex,
    )
    .slice(0, 4);

  const solutionLayout = buildCenteredSolution(cleanedSolution);
  const { solutionFragments, allFragments } = buildFragments(
    puzzleId,
    cleanedSolution,
    filteredDecoys,
  );
  let solutionFragmentIndex = 0;

  return {
    id: puzzleId,
    kind,
    prompt,
    craftedEmoji,
    craftedLabel,
    solution: solutionLayout.map((token) => {
      if (token === null) {
        return null;
      }

      const fragment = solutionFragments[solutionFragmentIndex];
      solutionFragmentIndex += 1;
      return fragment?.id ?? null;
    }),
    fragments: allFragments,
  };
}

function adaptFallbackQuestion(
  question: FallbackQuestion,
): PixelCraftPuzzle | null {
  const languageContent =
    question.content as Partial<PixelCraftLanguageContent>;
  const mathContent = question.content as Partial<PixelCraftMathContent>;

  if (languageContent.pixelCraftKind === 'language') {
    return buildPuzzle(
      String(question.id),
      'language',
      languageContent.prompt ?? stripHtml(question.text ?? question.name),
      languageContent.craftedEmoji ?? '📦',
      languageContent.craftedLabel ?? question.name,
      languageContent.correctFragments ?? [],
      languageContent.decoyFragments ?? [],
    );
  }

  if (mathContent.pixelCraftKind === 'math') {
    return buildPuzzle(
      String(question.id),
      'math',
      mathContent.prompt ?? stripHtml(question.text ?? question.name),
      mathContent.craftedEmoji ?? '🧮',
      mathContent.craftedLabel ?? question.name,
      mathContent.equationFragments ?? [],
      [],
    );
  }

  return null;
}

function adaptMultipleChoiceQuestion(
  question: Question,
): PixelCraftPuzzle | null {
  const content = question.content as MultipleChoiceContent;
  const choices = content.choices ?? [];
  const correctChoice = choices.find((choice) => choice.isCorrect);

  if (!correctChoice) {
    return null;
  }

  const solutionTokens = splitWords(correctChoice.text);
  if (solutionTokens.length < 2 || solutionTokens.length > 6) {
    return null;
  }

  const decoyTokens = choices
    .filter((choice) => !choice.isCorrect)
    .flatMap((choice) => splitWords(choice.text));

  if (decoyTokens.length < 3) {
    return null;
  }

  return buildPuzzle(
    `api-language-${question.id}`,
    'language',
    stripHtml(question.text ?? question.name),
    pickResultEmoji(String(question.id)),
    question.name,
    solutionTokens,
    decoyTokens,
  );
}

function tokenizeEquation(prompt: string): string[] {
  return prompt.match(/\d+|[+\-×÷=*/]/g) ?? [];
}

function adaptNumericalQuestion(question: Question): PixelCraftPuzzle | null {
  const content = question.content as NumericalContent;
  const prompt = stripHtml(question.text ?? question.name);
  const promptTokens = tokenizeEquation(prompt);

  if (
    !promptTokens.some((token) =>
      ['+', '-', '×', '÷', '*', '/'].includes(token),
    )
  ) {
    return null;
  }

  const normalizedTokens = promptTokens.map((token) =>
    token === '*' ? '×' : token === '/' ? '÷' : token,
  );

  const hasEquals = normalizedTokens.includes('=');
  const answerText =
    typeof content.correctAnswer === 'number'
      ? String(content.correctAnswer)
      : null;

  if (!answerText) {
    return null;
  }

  const equationTokens = hasEquals
    ? normalizedTokens.map((token) => (token === '?' ? answerText : token))
    : [...normalizedTokens, '=', answerText];

  return buildPuzzle(
    `api-math-${question.id}`,
    'math',
    prompt,
    '🧮',
    question.name,
    equationTokens,
    [],
  );
}

function adaptQuestionToPuzzle(
  question: Question | FallbackQuestion,
): PixelCraftPuzzle | null {
  if (isFallbackQuestion(question)) {
    return adaptFallbackQuestion(question);
  }

  if (question.type === 'multiple_choice') {
    return adaptMultipleChoiceQuestion(question);
  }

  if (question.type === 'numerical') {
    return adaptNumericalQuestion(question);
  }

  return null;
}

function isFallbackQuestion(
  question: Question | FallbackQuestion,
): question is FallbackQuestion {
  return typeof question.id === 'string';
}

function createEmptyGrid(): Array<PixelCraftFragment | null> {
  return Array<PixelCraftFragment | null>(GRID_CELL_COUNT).fill(null);
}

function calculateAverageSeconds(timesMs: number[]): number {
  if (timesMs.length === 0) {
    return 0;
  }

  const totalMs = timesMs.reduce((sum, value) => sum + value, 0);
  return Math.round((totalMs / timesMs.length / 1000) * 10) / 10;
}

/**
 * Pixel Craft game logic.
 *
 * This hook adapts live or fallback questions into 3×3 crafting puzzles,
 * manages the drag-and-drop rules, and drives the phase machine.
 */
export function usePixelCraftLogic({
  tag_ids,
  item_bank_id,
}: UsePixelCraftLogicParams): UsePixelCraftLogicResult {
  const fallbackResult = useFallbackQuestions(
    { tag_ids, item_bank_id },
    FALLBACK_QUESTIONS,
  );

  const staticFallbackPool = useMemo(
    () =>
      FALLBACK_QUESTIONS.map((question) =>
        adaptQuestionToPuzzle(question),
      ).filter((puzzle): puzzle is PixelCraftPuzzle => puzzle !== null),
    [],
  );

  const candidatePool = useMemo(() => {
    if (fallbackResult.isLoading) {
      return [] as PixelCraftPuzzle[];
    }

    const livePool =
      fallbackResult.source === 'api'
        ? fallbackResult.data
            .map((question) => adaptQuestionToPuzzle(question))
            .filter((puzzle): puzzle is PixelCraftPuzzle => puzzle !== null)
        : [];

    if (livePool.length >= MAX_CRAFTS_PER_SESSION) {
      return livePool;
    }

    return [...livePool, ...staticFallbackPool];
  }, [
    fallbackResult.data,
    fallbackResult.isLoading,
    fallbackResult.source,
    staticFallbackPool,
  ]);

  const [phase, setPhase] = useState<PixelCraftPhase>('idle');
  const [sessionPuzzles, setSessionPuzzles] = useState<PixelCraftPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placedFragments, setPlacedFragments] =
    useState<Array<PixelCraftFragment | null>>(createEmptyGrid());
  const [paletteFragments, setPaletteFragments] = useState<
    PixelCraftFragment[]
  >([]);
  const [cellFeedback, setCellFeedback] = useState<
    Record<number, 'correct' | 'wrong'>
  >({});
  const [errorCells, setErrorCells] = useState<number[]>([]);
  const [gridShakeKey, setGridShakeKey] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [craftsCompleted, setCraftsCompleted] = useState(0);
  const [perfectCrafts, setPerfectCrafts] = useState(0);
  const [wrongPlacements, setWrongPlacements] = useState(0);
  const [craftTimesMs, setCraftTimesMs] = useState<number[]>([]);
  const [craftedEmoji, setCraftedEmoji] = useState<string | null>(null);
  const [craftedLabel, setCraftedLabel] = useState<string | null>(null);
  const [revealOffsets, setRevealOffsets] = useState<
    Record<number, PixelCraftRevealOffset>
  >({});
  const [showScorePopup, setShowScorePopup] = useState(false);

  const craftStartRef = useRef<number>(0);
  const currentWrongPlacementsRef = useRef(0);
  const feedbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPuzzle = sessionPuzzles[currentIndex] ?? null;

  const summary = useMemo<PixelCraftSummary>(
    () => ({
      score,
      craftsCompleted,
      perfectCrafts,
      avgTimeSec: calculateAverageSeconds(craftTimesMs),
      wrongPlacements,
      maxStreak,
      totalCrafts: sessionPuzzles.length,
    }),
    [
      craftTimesMs,
      craftsCompleted,
      maxStreak,
      perfectCrafts,
      score,
      sessionPuzzles.length,
      wrongPlacements,
    ],
  );

  const canStart = candidatePool.length > 0;
  const canSubmit = useMemo(() => {
    if (!currentPuzzle) {
      return false;
    }

    return currentPuzzle.solution.every((expectedId, cellIndex) => {
      if (expectedId === null) {
        return true;
      }
      return placedFragments[cellIndex]?.id === expectedId;
    });
  }, [currentPuzzle, placedFragments]);

  const clearAllTimers = useCallback(() => {
    feedbackTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    feedbackTimersRef.current = [];

    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const resetForPuzzle = useCallback((puzzle: PixelCraftPuzzle) => {
    setPlacedFragments(createEmptyGrid());
    setPaletteFragments(puzzle.fragments);
    setCellFeedback({});
    setErrorCells([]);
    setCraftedEmoji(null);
    setCraftedLabel(null);
    setRevealOffsets({});
    setShowScorePopup(false);
    craftStartRef.current = Date.now();
    currentWrongPlacementsRef.current = 0;
  }, []);

  const queueCellFeedback = useCallback(
    (cellIndex: number, feedback: 'correct' | 'wrong', durationMs: number) => {
      setCellFeedback((current) => ({ ...current, [cellIndex]: feedback }));

      const timerId = setTimeout(() => {
        setCellFeedback((current) => {
          const next = { ...current };
          delete next[cellIndex];
          return next;
        });
      }, durationMs);

      feedbackTimersRef.current.push(timerId);
    },
    [],
  );

  const moveToNextPuzzle = useCallback(
    (nextIndex: number, nextSession: PixelCraftPuzzle[]) => {
      if (nextIndex >= nextSession.length) {
        setPhase('results');
        return;
      }

      const nextPuzzle = nextSession[nextIndex];
      setCurrentIndex(nextIndex);
      resetForPuzzle(nextPuzzle);
      setPhase('crafting');
    },
    [resetForPuzzle],
  );

  const startGame = useCallback(() => {
    if (candidatePool.length === 0) {
      return;
    }

    clearAllTimers();

    const nextSession = shuffleArray(candidatePool).slice(
      0,
      Math.min(MAX_CRAFTS_PER_SESSION, candidatePool.length),
    );

    setSessionPuzzles(nextSession);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCraftsCompleted(0);
    setPerfectCrafts(0);
    setWrongPlacements(0);
    setCraftTimesMs([]);
    setGridShakeKey(0);

    resetForPuzzle(nextSession[0]);
    setPhase('crafting');
  }, [candidatePool, clearAllTimers, resetForPuzzle]);

  const handleDrop = useCallback(
    (fragmentId: string, dropTargetId: string | null) => {
      if (phase !== 'crafting' || !currentPuzzle || !dropTargetId) {
        return;
      }

      if (dropTargetId === 'pixel-craft-palette') {
        return;
      }

      if (!dropTargetId.startsWith('pixel-craft-cell-')) {
        return;
      }

      const fragment = paletteFragments.find((item) => item.id === fragmentId);
      if (!fragment) {
        return;
      }

      const cellIndex = Number.parseInt(
        dropTargetId.replace('pixel-craft-cell-', ''),
        10,
      );

      if (
        Number.isNaN(cellIndex) ||
        cellIndex < 0 ||
        cellIndex >= GRID_CELL_COUNT
      ) {
        return;
      }

      if (placedFragments[cellIndex] !== null) {
        queueCellFeedback(cellIndex, 'wrong', WRONG_FLASH_MS);
        setWrongPlacements((current) => current + 1);
        currentWrongPlacementsRef.current += 1;
        return;
      }

      const expectedFragmentId = currentPuzzle.solution[cellIndex];
      if (expectedFragmentId === fragment.id) {
        setPlacedFragments((current) =>
          current.map((placedFragment, placedIndex) =>
            placedIndex === cellIndex ? fragment : placedFragment,
          ),
        );
        setPaletteFragments((current) =>
          current.filter(
            (paletteFragment) => paletteFragment.id !== fragment.id,
          ),
        );
        queueCellFeedback(cellIndex, 'correct', CORRECT_FLASH_MS);
        return;
      }

      queueCellFeedback(cellIndex, 'wrong', WRONG_FLASH_MS);
      setWrongPlacements((current) => current + 1);
      currentWrongPlacementsRef.current += 1;
    },
    [
      currentPuzzle,
      paletteFragments,
      phase,
      placedFragments,
      queueCellFeedback,
    ],
  );

  const submitCraft = useCallback(
    (offsets: Record<number, PixelCraftRevealOffset>) => {
      if (!currentPuzzle || phase !== 'crafting') {
        return;
      }

      const invalidCells = currentPuzzle.solution.flatMap(
        (expectedId, cellIndex) => {
          if (expectedId === null) {
            return [];
          }
          return placedFragments[cellIndex]?.id === expectedId
            ? []
            : [cellIndex];
        },
      );

      if (invalidCells.length > 0) {
        setErrorCells(invalidCells);
        setGridShakeKey((current) => current + 1);
        setCraftedEmoji(null);
        setCraftedLabel(null);
        setStreak(0);
        invalidCells.forEach((cellIndex) =>
          queueCellFeedback(cellIndex, 'wrong', WRONG_FLASH_MS),
        );
        return;
      }

      const finishedAtMs = Date.now() - craftStartRef.current;
      const nextCraftsCompleted = craftsCompleted + 1;
      const nextStreak = streak + 1;

      setCraftTimesMs((current) => [...current, finishedAtMs]);
      setScore((current) => current + SCORE_PER_CRAFT);
      setCraftsCompleted(nextCraftsCompleted);
      setStreak(nextStreak);
      setMaxStreak((current) => Math.max(current, nextStreak));
      setCraftedEmoji(currentPuzzle.craftedEmoji);
      setCraftedLabel(currentPuzzle.craftedLabel);
      setRevealOffsets(offsets);
      setShowScorePopup(true);
      setErrorCells([]);
      setPhase('reveal');

      if (currentWrongPlacementsRef.current === 0) {
        setPerfectCrafts((current) => current + 1);
      }

      revealTimerRef.current = setTimeout(() => {
        moveToNextPuzzle(currentIndex + 1, sessionPuzzles);
      }, REVEAL_MS);
    },
    [
      craftsCompleted,
      currentIndex,
      currentPuzzle,
      moveToNextPuzzle,
      phase,
      placedFragments,
      queueCellFeedback,
      sessionPuzzles,
      streak,
    ],
  );

  const dismissScorePopup = useCallback(() => {
    setShowScorePopup(false);
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    phase,
    isLoading: fallbackResult.isLoading,
    score,
    streak,
    maxStreak,
    currentCraftNumber: currentIndex + (phase === 'idle' ? 0 : 1),
    totalCrafts: sessionPuzzles.length,
    currentPuzzle,
    placedFragments,
    paletteFragments,
    cellFeedback,
    errorCells,
    gridShakeKey,
    revealOffsets,
    craftedEmoji,
    craftedLabel,
    showScorePopup,
    summary,
    canStart,
    canSubmit,
    startGame,
    handleDrop,
    submitCraft,
    dismissScorePopup,
  };
}
