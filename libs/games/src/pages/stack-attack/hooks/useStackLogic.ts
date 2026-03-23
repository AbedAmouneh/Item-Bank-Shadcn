/**
 * useStackLogic — all game state for Stack Attack.
 *
 * Architecture:
 *  - The swinging block's x position is driven by a requestAnimationFrame loop
 *    that writes directly to swingBlockRef's DOM style — no React re-renders at 60 fps.
 *  - Module-level mutable vars (mSwingX, mSwingT, mCanvasHalf, mSwingAmplitude) hold
 *    the live animation state so the rAF callback always reads current values.
 *  - phaseRef / livesRef / streakRef mirror their state counterparts so setTimeout
 *    and rAF callbacks can read the latest values without stale closures.
 *  - Correct answers: the swinging block drops via a CSS transform transition onto
 *    the tower. Wrong answers: the block shakes and fades with a CSS keyframe.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Question } from '@item-bank/api';
import { useGameQuestions } from '../../../domain/hooks/UseGameQuestions';
import { extractAnswers } from '../../../domain/extractAnswers';
import type { GameAnswer } from '../../../domain/types';
import { FALLBACK_QUESTIONS } from '../fallback/questions';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum (desktop) canvas width/height. Mobile gets a smaller canvas. */
const CANVAS_W = 700;
const CANVAS_H = 480;

/** Block visual dimensions in px. */
export const BLOCK_W = 120;
export const BLOCK_H = 26;

/**
 * Fraction of canvas height at which the tower top should sit.
 * 320/480 ≈ 0.667 → at 2/3 of canvas height on all screen sizes.
 */
const TOWER_TOP_RATIO = 320 / 480;

/**
 * Gap between the tower top and the underside of the swinging block (px).
 * Keeps the block visually separate during the swing.
 */
const SWING_GAP = 18;

/** Horizontal distance from canvas centre within which a landing is "PERFECT". */
const PERFECT_THRESHOLD = 24;

const MAX_LIVES = 3;
const BASE_SWING_SPEED = 1.2; // rad/s
const SPEED_INCREMENT = 0.07; // rad/s added every SPEED_EVERY_N correct answers
const SPEED_EVERY_N = 3;

/** Cycle through these colours for placed blocks (golden overrides). */
const BLOCK_COLORS = ['#6B7A3A', '#8B5E3C', '#5A6B4A', '#C4973D', '#7A5A30', '#4A7C59'];
export const GOLDEN_COLOR = '#FFD700';

/** Duration of the CSS transform transition for a correct block drop (ms). */
const DROP_DURATION_MS = 350;
/** Duration of the block-crack CSS keyframe animation (ms). */
const CRACK_DURATION_MS = 550;
/** How long to pause between animations before loading the next question (ms). */
const INTER_QUESTION_DELAY_MS = 160;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StackPhase = 'idle' | 'swinging' | 'answer_reveal' | 'results';

/** One block that has been permanently placed in the tower. */
export interface StackBlock {
  /** Left-edge CSS x of this block (always canvasW/2 − BLOCK_W/2 for centred towers). */
  x: number;
  color: string;
  isGolden: boolean;
}

/**
 * The block that is currently in flight — either falling (correct answer) or
 * cracking (wrong answer). Rendered separately from the tower array.
 */
export interface DroppingBlock {
  /** Left-edge CSS x. */
  leftEdge: number;
  color: string;
  isGolden: boolean;
  /** 'falling' → CSS transform transition; 'cracking' → block-crack keyframe. */
  mode: 'falling' | 'cracking';
  /** For 'falling' only: true once the transform transition has been triggered. */
  dropped: boolean;
}

interface UseStackLogicParams {
  tag_ids?: number[];
  item_bank_id?: number;
}

// ─── Module-level animation state ─────────────────────────────────────────────
// Stored outside React so the rAF callback always reads current values
// without capturing stale closures or triggering re-renders.

/** Current block centre x in CSS px — written by rAF, read by submitAnswer. */
let mSwingX = CANVAS_W / 2;
/** Time accumulator for the sine wave (seconds). */
let mSwingT = 0;
/** Half of the current canvas width — updated on resize. */
let mCanvasHalf = CANVAS_W / 2;
/** Half-amplitude of the swing in px — updated on resize. */
let mSwingAmplitude = 240;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCanvasDims(vw: number): { w: number; h: number } {
  if (vw < 640) {
    const w = Math.min(CANVAS_W, vw - 32);
    return { w, h: Math.round(w * (6 / 5)) };
  }
  return { w: CANVAS_W, h: CANVAS_H };
}

/** Compute the swing speed (rad/s) from the number of correct answers so far. */
function computeSwingSpeed(correctCount: number): number {
  return BASE_SWING_SPEED + Math.floor(correctCount / SPEED_EVERY_N) * SPEED_INCREMENT;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStackLogic({ tag_ids, item_bank_id }: UseStackLogicParams) {
  // ── Questions ─────────────────────────────────────────────────────────────
  const { data } = useGameQuestions({ type: 'multiple_choice', tag_ids, item_bank_id });
  const allQuestions = useMemo<Question[]>(() => {
    const items = data?.items ?? [];
    return items.length > 0 ? items : FALLBACK_QUESTIONS;
  }, [data]);

  // ── Canvas geometry ────────────────────────────────────────────────────────
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>(() =>
    getCanvasDims(typeof window !== 'undefined' ? window.innerWidth : 1024),
  );
  const canvasDimsRef = useRef(canvasDims);
  useEffect(() => { canvasDimsRef.current = canvasDims; }, [canvasDims]);

  useEffect(() => {
    function onResize() {
      const dims = getCanvasDims(window.innerWidth);
      setCanvasDims(dims);
      canvasDimsRef.current = dims;
      mCanvasHalf = dims.w / 2;
      mSwingAmplitude = 240 * (dims.w / CANVAS_W);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // towerTargetTop: the CSS y (from canvas top) where the tower top sits.
  // swingY: the fixed CSS y of the swinging block's top edge.
  // Both are derived from canvasH so they scale on mobile.
  const towerTargetTop = Math.round(canvasDims.h * TOWER_TOP_RATIO);
  const swingY = towerTargetTop - BLOCK_H - SWING_GAP;
  const swingYRef = useRef(swingY);
  const towerTargetTopRef = useRef(towerTargetTop);
  useEffect(() => {
    swingYRef.current = swingY;
    towerTargetTopRef.current = towerTargetTop;
  }, [swingY, towerTargetTop]);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<StackPhase>('idle');
  const [tower, setTower] = useState<StackBlock[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [goldenBlocks, setGoldenBlocks] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<GameAnswer[]>([]);
  const [droppingBlock, setDroppingBlock] = useState<DroppingBlock | null>(null);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [scorePopupLabel, setScorePopupLabel] = useState('✨');
  const [screenFlash, setScreenFlash] = useState(0);
  const [streakVisible, setStreakVisible] = useState(false);

  // ── Refs for stale-closure safety ─────────────────────────────────────────
  const phaseRef = useRef<StackPhase>('idle');
  phaseRef.current = phase;
  const livesRef = useRef(MAX_LIVES);
  livesRef.current = lives;
  const streakRef = useRef(0);
  streakRef.current = streak;
  const correctCountRef = useRef(0);
  correctCountRef.current = correctCount;

  // DOM ref — rAF writes insetInlineStart directly to avoid re-renders
  const swingBlockRef = useRef<HTMLDivElement>(null);

  // Timer refs for cleanup on unmount / new game
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Question queue refs
  const allQuestionsRef = useRef<Question[]>([]);
  allQuestionsRef.current = allQuestions;
  const questionQueueRef = useRef<Question[]>([]);
  const questionIdxRef = useRef(0);
  const colorIdxRef = useRef(0);

  // ── rAF swing loop ────────────────────────────────────────────────────────

  const startSwingAnimation = useCallback(() => {
    lastTimeRef.current = null;

    function frame(ts: number) {
      if (phaseRef.current !== 'swinging') return;

      // Clamp dt to avoid a huge jump after a tab regains focus.
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      mSwingT += dt;
      mSwingX = mCanvasHalf + Math.sin(mSwingT * computeSwingSpeed(correctCountRef.current)) * mSwingAmplitude;

      if (swingBlockRef.current) {
        // Write x directly to DOM — zero React re-renders per frame.
        swingBlockRef.current.style.insetInlineStart = `${Math.round(mSwingX - BLOCK_W / 2)}px`;
      }

      rafIdRef.current = requestAnimationFrame(frame);
    }

    rafIdRef.current = requestAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSwingAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ── Question queue helpers ─────────────────────────────────────────────────

  function dequeueQuestion(): Question {
    if (questionIdxRef.current >= questionQueueRef.current.length) {
      questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
      questionIdxRef.current = 0;
    }
    return questionQueueRef.current[questionIdxRef.current++];
  }

  /**
   * Pick up to 4 answers, always guaranteeing the correct one is included.
   * Plain .slice(0, 4) can cut it out when a question has 5+ choices.
   */
  function pickAnswers(q: Question): GameAnswer[] {
    const all = extractAnswers(q);
    const correct = all.find((a) => a.isCorrect);
    const wrongs = all.filter((a) => !a.isCorrect).slice(0, 3);
    return correct
      ? [...wrongs, correct].sort(() => Math.random() - 0.5)
      : all.slice(0, 4);
  }

  function advanceToNextQuestion(): void {
    const q = dequeueQuestion();
    setCurrentQuestion(q);
    setCurrentAnswers(pickAnswers(q));
  }

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopSwingAnimation();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [stopSwingAnimation]);

  // ── startGame ──────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    stopSwingAnimation();
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    // Reset module-level animation vars to a known state.
    mSwingT = 0;
    mCanvasHalf = canvasDimsRef.current.w / 2;
    mSwingAmplitude = 240 * (canvasDimsRef.current.w / CANVAS_W);
    mSwingX = mCanvasHalf;

    // Sync fast refs before setting state (avoids stale values in the first frame).
    phaseRef.current = 'swinging';
    livesRef.current = MAX_LIVES;
    streakRef.current = 0;
    correctCountRef.current = 0;
    colorIdxRef.current = 0;

    questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
    questionIdxRef.current = 0;

    // Enqueue the first question before setting phase so it renders immediately.
    const firstQ = questionQueueRef.current[questionIdxRef.current++];
    const firstAnswers = pickAnswers(firstQ);

    setPhase('swinging');
    setTower([]);
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setMaxStreak(0);
    setWrongCount(0);
    setCorrectCount(0);
    setGoldenBlocks(0);
    setDroppingBlock(null);
    setShowCoinBurst(false);
    setShowScorePopup(false);
    setStreakVisible(false);
    setScreenFlash(0);
    setCurrentQuestion(firstQ);
    setCurrentAnswers(firstAnswers);

    startSwingAnimation();
  }, [startSwingAnimation, stopSwingAnimation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── submitAnswer ───────────────────────────────────────────────────────────

  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (phaseRef.current !== 'swinging') return;

    stopSwingAnimation();
    phaseRef.current = 'answer_reveal';
    setPhase('answer_reveal');

    const frozenX = mSwingX;
    const isGolden = isCorrect && Math.abs(frozenX - mCanvasHalf) < PERFECT_THRESHOLD;
    const color = BLOCK_COLORS[colorIdxRef.current % BLOCK_COLORS.length];

    if (isCorrect) {
      colorIdxRef.current++;
      // Centre the block on the tower (same x for all blocks).
      const leftEdge = Math.round(canvasDimsRef.current.w / 2 - BLOCK_W / 2);

      // Render the block at towerTargetTop with a translateY shift that places it
      // at the swing position initially. The 'dropped' flag removes the shift via
      // CSS transition, making the block appear to fall.
      setDroppingBlock({ leftEdge, color, isGolden, mode: 'falling', dropped: false });

      // Double rAF trick: first frame paints at the start position (translateY applied),
      // second frame triggers the CSS transition by removing the shift.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDroppingBlock((prev) => (prev ? { ...prev, dropped: true } : null));
        });
      });

      animTimerRef.current = setTimeout(() => {
        const newCorrect = correctCountRef.current + 1;
        correctCountRef.current = newCorrect;

        setTower((prev) => [...prev, { x: leftEdge, color, isGolden }]);
        setScore((s) => s + 40);
        setCorrectCount(newCorrect);

        if (isGolden) {
          setGoldenBlocks((g) => g + 1);
          setShowCoinBurst(true);
          setScorePopupLabel('PERFECT! ✨');
          setTimeout(() => setShowCoinBurst(false), 800);
        } else {
          setScorePopupLabel('✨');
        }
        setShowScorePopup(true);
        setTimeout(() => setShowScorePopup(false), 900);

        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);
        setMaxStreak((m) => Math.max(m, newStreak));
        setStreakVisible(newStreak >= 3);
        setDroppingBlock(null);

        // Brief pause then load next question.
        animTimerRef.current = setTimeout(() => {
          if (phaseRef.current === 'results') return;
          advanceToNextQuestion();
          phaseRef.current = 'swinging';
          setPhase('swinging');
          startSwingAnimation();
        }, INTER_QUESTION_DELAY_MS);
      }, DROP_DURATION_MS + 20);

    } else {
      // Wrong answer: block cracks and falls off-screen.
      const leftEdge = Math.round(frozenX - BLOCK_W / 2);
      setDroppingBlock({ leftEdge, color: '#ef4444', isGolden: false, mode: 'cracking', dropped: false });
      setScreenFlash((k) => k + 1);

      const newLives = Math.max(0, livesRef.current - 1);
      livesRef.current = newLives;
      setLives(newLives);
      setWrongCount((w) => w + 1);

      streakRef.current = 0;
      setStreak(0);
      setStreakVisible(false);

      animTimerRef.current = setTimeout(() => {
        setDroppingBlock(null);

        if (newLives <= 0) {
          phaseRef.current = 'results';
          setPhase('results');
          return;
        }

        if (phaseRef.current === 'results') return;
        advanceToNextQuestion();
        phaseRef.current = 'swinging';
        setPhase('swinging');
        startSwingAnimation();
      }, CRACK_DURATION_MS + 20);
    }
  }, [startSwingAnimation, stopSwingAnimation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera offset ─────────────────────────────────────────────────────────
  // Shifts the tower container up (translateY) so the top block is always at
  // towerTargetTop, keeping the landing zone visible as the tower grows.
  const cameraOffsetY = Math.max(
    0,
    tower.length * BLOCK_H - (canvasDims.h - towerTargetTop),
  );

  return {
    phase,
    tower,
    score,
    lives,
    streak,
    maxStreak,
    wrongCount,
    correctCount,
    goldenBlocks,
    currentQuestion,
    currentAnswers,
    droppingBlock,
    canvasDims,
    towerTargetTop,
    swingY,
    cameraOffsetY,
    showCoinBurst,
    showScorePopup,
    scorePopupLabel,
    screenFlash,
    streakVisible,
    swingBlockRef,
    startGame,
    submitAnswer,
  };
}
