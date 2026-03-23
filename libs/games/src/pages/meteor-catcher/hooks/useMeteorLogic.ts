/**
 * useMeteorLogic — all game state for Meteor Catcher.
 *
 * Architecture:
 *  - A requestAnimationFrame loop moves the ship (via DOM ref) and meteor divs
 *    (via DOM ref array) at 60 fps without triggering React re-renders.
 *  - Module-level mutable vars (mShipX, mMeteorY[], etc.) hold live animation
 *    state so rAF callbacks always read current values without stale closures.
 *  - phaseRef / livesRef / streakRef / catchCountRef mirror their state
 *    counterparts so setTimeout and rAF callbacks read the latest values.
 *  - Collision is detected inside the rAF loop and dispatched to handleCatch
 *    or handleMiss via callback refs, keeping event handling in React-land.
 *
 * Phase machine: idle → playing → boss → playing (loop) | results
 *   playing: 1 correct + 2 wrong answer meteors fall; player steers ship.
 *   boss:    large boss div falls for drama; player answers via buttons.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Question } from '@item-bank/api';
import { useFallbackQuestions } from '../../../domain/hooks';
import { extractAnswers } from '../../../domain/extractAnswers';
import type { GameAnswer, FallbackQuestion } from '../../../domain/types';
import { FALLBACK_QUESTIONS } from '../fallback/questions';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 480;
const MAX_LIVES = 3;
/** Ship is 52 px wide; half-width used for clamping and collision math. */
const SHIP_HALF_W = 26;
/** Meteor size in px (square). */
export const METEOR_SIZE = 52;
/** Boss meteor size in px (square). */
export const BOSS_SIZE = 96;
/** Ship vertical position as a ratio of canvas height (fixed row). */
const SHIP_Y_RATIO = 430 / 480;
const SHIP_SPEED = 300; // px/s
const BASE_METEOR_SPEED = 90; // px/s
const BOSS_METEOR_SPEED = 55; // px/s
/** Speed bonus added every SPEED_EVERY_N correct catches. */
const SPEED_INC = 10;
const SPEED_EVERY_N = 4;
/** Boss fight triggers after this many correct catches. */
const BOSS_EVERY_N = 5;
const BASE_SCORE = 20; // per correct catch
const BOSS_BONUS = 100; // awarded on boss defeat

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeteorPhase = 'idle' | 'playing' | 'boss' | 'results';

/** One answer meteor rendered as a div in the playing state. */
export interface MeteorDisplay {
  id: string;
  text: string;
  isCorrect: boolean;
  /** Fixed x centre (px from canvas left) — never changes during the wave. */
  centerX: number;
}

/** Both Question (id: number) and FallbackQuestion (id: string) work here
 *  because extractAnswers only reads `.type` and `.content`. */
type QuestionLike = Question | FallbackQuestion;

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function getCanvasDims(vw: number): { w: number; h: number } {
  if (vw < 640) {
    const w = Math.min(CANVAS_W, vw - 32);
    return { w, h: Math.round(w * (CANVAS_H / CANVAS_W)) };
  }
  return { w: CANVAS_W, h: CANVAS_H };
}

function getMeteorSpeed(catchCount: number): number {
  return BASE_METEOR_SPEED + Math.floor(catchCount / SPEED_EVERY_N) * SPEED_INC;
}

function getMultiplier(streak: number): number {
  if (streak >= 10) return 4;
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

// ─── Module-level animation state ─────────────────────────────────────────────
// Lives outside React so the rAF callback always reads current values.

/** Ship centre x in CSS px. */
let mShipX = CANVAS_W / 2;
/** Canvas width — updated on resize. */
let mCanvasW = CANVAS_W;
/** Canvas height — updated on resize. */
let mCanvasH = CANVAS_H;
/** Mirrors phaseRef so rAF sees phase changes immediately. */
let mPhaseM: MeteorPhase = 'idle';
/** Guards against double-firing a catch or miss event in the same wave. */
let mHandling = false;
/** ArrowLeft / ArrowRight key state — written by keydown/keyup. */
const mKeys = { left: false, right: false };

/**
 * Expose key-state setters so HTML overlay buttons (touch / pointer events)
 * can drive the ship without keyboard events. Module-level so they work
 * without a React ref — callers import them directly.
 */
export function setShipKeyLeft(value: boolean):  void { mKeys.left  = value; }
export function setShipKeyRight(value: boolean): void { mKeys.right = value; }

// Per-wave meteor runtime arrays (parallel to the meteors React state array).
let mMeteorY: number[] = [];
let mMeteorCX: number[] = [];
let mMeteorSpeeds: number[] = [];
let mMeteorIsCorrect: boolean[] = [];

// Boss visual position (top edge in CSS px).
let mBossY = -BOSS_SIZE;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseMeteorLogicParams {
  tag_ids?: number[];
  item_bank_id?: number;
}

export function useMeteorLogic({ tag_ids, item_bank_id }: UseMeteorLogicParams) {

  // ── Questions ─────────────────────────────────────────────────────────────
  const fallbackResult = useFallbackQuestions(
    { type: 'multiple_choice', tag_ids, item_bank_id },
    FALLBACK_QUESTIONS,
  );
  const allQuestions = useMemo<QuestionLike[]>(() => {
    if (fallbackResult.isLoading) return [];
    return fallbackResult.data as QuestionLike[];
  }, [fallbackResult.data, fallbackResult.isLoading]);

  // ── Canvas geometry ────────────────────────────────────────────────────────
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>(() =>
    getCanvasDims(typeof window !== 'undefined' ? window.innerWidth : 1024),
  );
  const canvasDimsRef = useRef(canvasDims);
  useEffect(() => { canvasDimsRef.current = canvasDims; }, [canvasDims]);

  useEffect(() => {
    mCanvasW = canvasDims.w;
    mCanvasH = canvasDims.h;
    function onResize() {
      const dims = getCanvasDims(window.innerWidth);
      setCanvasDims(dims);
      canvasDimsRef.current = dims;
      mCanvasW = dims.w;
      mCanvasH = dims.h;
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [canvasDims.w, canvasDims.h]);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<MeteorPhase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [catchCount, setCatchCount] = useState(0);
  const [wrongHits, setWrongHits] = useState(0);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionLike | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<GameAnswer[]>([]);
  const [meteors, setMeteors] = useState<MeteorDisplay[]>([]);
  const [bossHealth, setBossHealth] = useState(2);
  const [bossCracked, setBossCracked] = useState(false);
  const [bossExploding, setBossExploding] = useState(false);
  const [showCoinBurst, setShowCoinBurst] = useState<{ x: number; y: number } | null>(null);
  const [showScorePopup, setShowScorePopup] = useState<{ x: number; y: number; value: number; label: string } | null>(null);
  const [streakVisible, setStreakVisible] = useState(false);
  const [screenFlash, setScreenFlash] = useState(0);
  const [flashMeteorId, setFlashMeteorId] = useState<string | null>(null);
  /** Bumped on each startGame call — remounts the Cubeforge canvas to reset star positions. */
  const [gameKey, setGameKey] = useState(0);

  // ── Stale-closure safety refs ──────────────────────────────────────────────
  const phaseRef = useRef<MeteorPhase>('idle');
  phaseRef.current = phase;
  const livesRef = useRef(MAX_LIVES);
  livesRef.current = lives;
  const streakRef = useRef(0);
  streakRef.current = streak;
  const catchCountRef = useRef(0);
  catchCountRef.current = catchCount;
  const bossHealthRef = useRef(2);
  bossHealthRef.current = bossHealth;
  const meteorsRef = useRef<MeteorDisplay[]>([]);
  meteorsRef.current = meteors;

  // ── DOM refs — rAF writes positions directly, bypassing React ─────────────
  const shipDivRef = useRef<HTMLDivElement | null>(null);
  const meteorDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bossDivRef = useRef<HTMLDivElement | null>(null);

  // ── Timer refs ────────────────────────────────────────────────────────────
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Question queue refs ───────────────────────────────────────────────────
  const allQuestionsRef = useRef<QuestionLike[]>([]);
  allQuestionsRef.current = allQuestions;
  const questionQueueRef = useRef<QuestionLike[]>([]);
  const questionIdxRef = useRef(0);
  const bossQ1Ref = useRef<QuestionLike | null>(null);
  const bossQ2Ref = useRef<QuestionLike | null>(null);

  // Callback refs so rAF always calls the latest event handler.
  const onCatchRef = useRef<(meteorIdx: number) => void>(() => {});
  const onMissRef = useRef<() => void>(() => {});

  // ── rAF loop ──────────────────────────────────────────────────────────────

  const startRAF = useCallback(() => {
    lastTimeRef.current = null;

    function frame(ts: number) {
      if (mPhaseM !== 'playing' && mPhaseM !== 'boss') return;

      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      // Move ship — write directly to DOM ref, zero React re-renders.
      if (mKeys.left)  mShipX = Math.max(SHIP_HALF_W, mShipX - SHIP_SPEED * dt);
      if (mKeys.right) mShipX = Math.min(mCanvasW - SHIP_HALF_W, mShipX + SHIP_SPEED * dt);
      if (shipDivRef.current) {
        shipDivRef.current.style.insetInlineStart = `${Math.round(mShipX - SHIP_HALF_W)}px`;
      }

      // Animate boss falling (visual only — no collision; boss answers use buttons).
      if (mPhaseM === 'boss') {
        mBossY += BOSS_METEOR_SPEED * dt;
        // Loop boss back to top for continuous dramatic fall.
        if (mBossY > mCanvasH + BOSS_SIZE) mBossY = -BOSS_SIZE;
        if (bossDivRef.current) {
          bossDivRef.current.style.top = `${Math.round(mBossY)}px`;
        }
      }

      // Move answer meteors + collision detection (playing phase only).
      if (mPhaseM === 'playing') {
        let allOff = true;
        for (let i = 0; i < mMeteorY.length; i++) {
          // Skip meteors already marked as caught/gone.
          if (mMeteorY[i] > mCanvasH + METEOR_SIZE) continue;
          mMeteorY[i] += mMeteorSpeeds[i] * dt;
          const div = meteorDivRefs.current[i];
          if (div) div.style.top = `${Math.round(mMeteorY[i])}px`;
          if (mMeteorY[i] <= mCanvasH + METEOR_SIZE) allOff = false;

          // Collision: horizontal centre within 50 px, meteor top past 410.
          if (!mHandling && Math.abs(mShipX - mMeteorCX[i]) < 50 && mMeteorY[i] > 410) {
            mHandling = true;
            onCatchRef.current(i);
            return; // event handler restarts RAF after processing
          }
        }

        // All meteors have passed the bottom without a catch → miss.
        if (!mHandling && allOff) {
          mHandling = true;
          onMissRef.current();
          return;
        }
      }

      rafIdRef.current = requestAnimationFrame(frame);
    }

    rafIdRef.current = requestAnimationFrame(frame);
  }, []);

  const stopRAF = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ── Question queue helpers ─────────────────────────────────────────────────

  function dequeueQuestion(): QuestionLike {
    if (questionIdxRef.current >= questionQueueRef.current.length) {
      questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
      questionIdxRef.current = 0;
    }
    return questionQueueRef.current[questionIdxRef.current++];
  }

  /** 1 correct + 2 wrong answers for meteor labels. */
  function pickMeteorAnswers(q: QuestionLike): GameAnswer[] {
    const all = extractAnswers(q as Question);
    const correct = all.find((a) => a.isCorrect);
    const wrongs = all.filter((a) => !a.isCorrect).slice(0, 2);
    return correct
      ? [...wrongs, correct].sort(() => Math.random() - 0.5)
      : all.slice(0, 3);
  }

  /** 1 correct + 2 wrong answers for boss answer buttons. */
  function pickBossAnswers(q: QuestionLike): GameAnswer[] {
    const all = extractAnswers(q as Question);
    const correct = all.find((a) => a.isCorrect);
    const wrongs = all.filter((a) => !a.isCorrect).slice(0, 2);
    return correct
      ? [...wrongs, correct].sort(() => Math.random() - 0.5)
      : all.slice(0, 3);
  }

  /** Spread N meteors evenly across the canvas width with random jitter. */
  function computeMeteorPositions(count: number, canvasW: number): number[] {
    const sectionW = canvasW / count;
    return Array.from({ length: count }, (_, i) => {
      const base = sectionW * i + sectionW / 2;
      const jitter = (Math.random() - 0.5) * 80;
      return Math.max(SHIP_HALF_W, Math.min(canvasW - SHIP_HALF_W, base + jitter));
    });
  }

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopRAF();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [stopRAF]);

  // ── Wave spawners ──────────────────────────────────────────────────────────
  // Plain functions (not useCallback) — safe because they only read from refs
  // and call stable setters/callbacks. Called from handleCatch / handleMiss via
  // setTimeout closures that were created at the same render.

  function spawnRegularWave(currentCatchCount: number): void {
    const q = dequeueQuestion();
    const answers = pickMeteorAnswers(q);
    const canvasW = canvasDimsRef.current.w;
    const positions = computeMeteorPositions(answers.length, canvasW);
    const speed = getMeteorSpeed(currentCatchCount);

    // Reset module-level arrays — RAF will start reading them immediately.
    mMeteorY = answers.map(() => -METEOR_SIZE);
    mMeteorCX = positions;
    mMeteorSpeeds = answers.map(() => speed);
    mMeteorIsCorrect = answers.map((a) => a.isCorrect);
    meteorDivRefs.current = new Array(answers.length).fill(null);

    const newMeteors: MeteorDisplay[] = answers.map((a, i) => ({
      id: `m-${i}-${Date.now()}`,
      text: a.text,
      isCorrect: a.isCorrect,
      centerX: positions[i],
    }));

    mHandling = false;
    mPhaseM = 'playing';
    phaseRef.current = 'playing';
    setCurrentQuestion(q);
    setCurrentAnswers([]);
    setMeteors(newMeteors);
    setPhase('playing');
    startRAF();
  }

  function spawnBossWave(): void {
    const q1 = dequeueQuestion();
    const q2 = dequeueQuestion();
    bossQ1Ref.current = q1;
    bossQ2Ref.current = q2;

    mBossY = -BOSS_SIZE;
    mMeteorY = [];
    mMeteorCX = [];
    mMeteorSpeeds = [];
    mMeteorIsCorrect = [];
    meteorDivRefs.current = [];
    mHandling = false;
    mPhaseM = 'boss';
    phaseRef.current = 'boss';

    setBossHealth(2);
    bossHealthRef.current = 2;
    setBossCracked(false);
    setBossExploding(false);
    setCurrentQuestion(q1);
    setCurrentAnswers(pickBossAnswers(q1));
    setMeteors([]);
    setPhase('boss');
    startRAF();
  }

  function goToNextWave(currentCatchCount: number): void {
    if (currentCatchCount > 0 && currentCatchCount % BOSS_EVERY_N === 0) {
      spawnBossWave();
    } else {
      spawnRegularWave(currentCatchCount);
    }
  }

  // ── handleCatch — called by rAF when ship hits a meteor ──────────────────

  const handleCatch = useCallback((meteorIdx: number) => {
    if (phaseRef.current !== 'playing') return;
    stopRAF();

    const isCorrect = mMeteorIsCorrect[meteorIdx];
    const catchX = mMeteorCX[meteorIdx];
    const catchY = mMeteorY[meteorIdx];
    const meteorId = meteorsRef.current[meteorIdx]?.id ?? `m-${meteorIdx}`;

    if (isCorrect) {
      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      const multiplier = getMultiplier(newStreak);
      const points = BASE_SCORE * multiplier;
      const newCatchCount = catchCountRef.current + 1;
      catchCountRef.current = newCatchCount;

      setShowCoinBurst({ x: catchX, y: catchY });
      setShowScorePopup({
        x: catchX,
        y: catchY - 40,
        value: points,
        label: multiplier > 1 ? `×${multiplier} ✨` : '✨',
      });
      setScore((s) => s + points);
      setStreak(newStreak);
      setMaxStreak((m) => Math.max(m, newStreak));
      setStreakVisible(newStreak >= 3);
      setCatchCount(newCatchCount);

      // Remove meteors after the burst animation, then wait 1 s total before next wave.
      animTimerRef.current = setTimeout(() => {
        setShowCoinBurst(null);
        setShowScorePopup(null);
        setMeteors([]);

        animTimerRef.current = setTimeout(() => {
          if (phaseRef.current === 'results') return;
          goToNextWave(newCatchCount);
        }, 600);
      }, 400);

    } else {
      // Wrong catch — mark this meteor as gone, flash it, keep others flying.
      mMeteorY[meteorIdx] = mCanvasH + METEOR_SIZE + 1;
      const newLives = Math.max(0, livesRef.current - 1);
      livesRef.current = newLives;

      setLives(newLives);
      setWrongHits((w) => w + 1);
      setScreenFlash((k) => k + 1);
      setFlashMeteorId(meteorId);

      // Flash ship outline directly via DOM ref — no React re-render needed.
      if (shipDivRef.current) {
        shipDivRef.current.style.animation = 'ship-flash 400ms ease-out forwards';
      }

      streakRef.current = 0;
      setStreak(0);
      setStreakVisible(false);

      animTimerRef.current = setTimeout(() => {
        setFlashMeteorId(null);
        if (shipDivRef.current) shipDivRef.current.style.animation = '';

        if (newLives <= 0) {
          mPhaseM = 'results';
          phaseRef.current = 'results';
          setPhase('results');
          return;
        }

        if (phaseRef.current === 'results') return;
        // Continue current wave — remaining meteors resume falling.
        mHandling = false;
        mPhaseM = 'playing';
        phaseRef.current = 'playing';
        startRAF();
      }, 450);
    }
  }, [startRAF, stopRAF]); // eslint-disable-line react-hooks/exhaustive-deps

  onCatchRef.current = handleCatch;

  // ── handleMiss — called by rAF when all meteors exit the canvas ──────────

  const handleMiss = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    stopRAF();

    // No life penalty on a miss — just clear and spawn the next wave.
    animTimerRef.current = setTimeout(() => {
      setMeteors([]);
      animTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'results') return;
        goToNextWave(catchCountRef.current);
      }, 300);
    }, 200);
  }, [stopRAF]); // eslint-disable-line react-hooks/exhaustive-deps

  onMissRef.current = handleMiss;

  // ── submitBossAnswer — player clicks an answer button in boss phase ───────

  const submitBossAnswer = useCallback((isCorrect: boolean) => {
    if (phaseRef.current !== 'boss') return;
    stopRAF();

    if (isCorrect) {
      const newHealth = bossHealthRef.current - 1;
      bossHealthRef.current = newHealth;
      setBossHealth(newHealth);

      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      setStreak(newStreak);
      setMaxStreak((m) => Math.max(m, newStreak));
      setStreakVisible(newStreak >= 3);

      if (newHealth <= 0) {
        // Boss defeated — explosion particle burst + bonus score.
        const bossX = canvasDimsRef.current.w / 2;
        const bossY = Math.max(50, Math.min(mBossY, 280));

        setBossExploding(true);
        setShowCoinBurst({ x: bossX, y: bossY });
        setShowScorePopup({ x: bossX, y: bossY - 40, value: BOSS_BONUS, label: '💥' });

        animTimerRef.current = setTimeout(() => {
          const nextCatchCount = catchCountRef.current + 1;
          catchCountRef.current = nextCatchCount;
          setCatchCount(nextCatchCount);
          setBossesDefeated((b) => b + 1);
          setScore((s) => s + BOSS_BONUS);
          setShowCoinBurst(null);
          setShowScorePopup(null);
          setBossExploding(false);

          if (phaseRef.current === 'results') return;
          animTimerRef.current = setTimeout(() => {
            if (phaseRef.current === 'results') return;
            // Always spawn a regular wave after a boss (the next boss trigger
            // is computed from the updated catch count in goToNextWave).
            spawnRegularWave(nextCatchCount);
          }, 400);
        }, 1000);

      } else {
        // First hit — boss cracks and Part 2 is revealed.
        setBossCracked(true);
        mBossY = -BOSS_SIZE; // boss loops back to top visually

        const q2 = bossQ2Ref.current;
        if (q2) {
          setCurrentQuestion(q2);
          setCurrentAnswers(pickBossAnswers(q2));
        }

        animTimerRef.current = setTimeout(() => {
          if (phaseRef.current === 'results') return;
          mHandling = false;
          startRAF();
        }, 300);
      }

    } else {
      // Wrong boss answer — life lost, boss resets to Part 1.
      const newLives = Math.max(0, livesRef.current - 1);
      livesRef.current = newLives;
      setLives(newLives);
      setWrongHits((w) => w + 1);
      setScreenFlash((k) => k + 1);

      if (shipDivRef.current) {
        shipDivRef.current.style.animation = 'ship-flash 400ms ease-out forwards';
      }

      streakRef.current = 0;
      setStreak(0);
      setStreakVisible(false);

      if (newLives <= 0) {
        mPhaseM = 'results';
        phaseRef.current = 'results';
        setPhase('results');
        return;
      }

      // Reset boss to Part 1.
      bossHealthRef.current = 2;
      setBossHealth(2);
      setBossCracked(false);
      mBossY = -BOSS_SIZE;

      const q1 = bossQ1Ref.current;
      if (q1) {
        setCurrentQuestion(q1);
        setCurrentAnswers(pickBossAnswers(q1));
      }

      animTimerRef.current = setTimeout(() => {
        if (shipDivRef.current) shipDivRef.current.style.animation = '';
        if (phaseRef.current === 'results') return;
        mHandling = false;
        startRAF();
      }, 450);
    }
  }, [startRAF, stopRAF]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── startGame ──────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    stopRAF();
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    mShipX = canvasDimsRef.current.w / 2;
    mCanvasW = canvasDimsRef.current.w;
    mCanvasH = canvasDimsRef.current.h;
    mPhaseM = 'idle';
    mHandling = false;
    mMeteorY = [];
    mMeteorCX = [];
    mMeteorSpeeds = [];
    mMeteorIsCorrect = [];
    mBossY = -BOSS_SIZE;
    mKeys.left = false;
    mKeys.right = false;

    questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
    questionIdxRef.current = 0;

    phaseRef.current = 'idle';
    livesRef.current = MAX_LIVES;
    streakRef.current = 0;
    catchCountRef.current = 0;
    bossHealthRef.current = 2;

    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setMaxStreak(0);
    setCatchCount(0);
    setWrongHits(0);
    setBossesDefeated(0);
    setMeteors([]);
    setBossHealth(2);
    setBossCracked(false);
    setBossExploding(false);
    setShowCoinBurst(null);
    setShowScorePopup(null);
    setStreakVisible(false);
    setScreenFlash(0);
    setFlashMeteorId(null);
    setCurrentQuestion(null);
    setCurrentAnswers([]);
    setGameKey((k) => k + 1);

    spawnRegularWave(0);
  }, [startRAF, stopRAF]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard: arrow key state for ship movement ────────────────────────────
  // Stored in module-level mKeys (not React state) so the rAF loop reads it
  // without stale closures and without triggering re-renders.

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); mKeys.left = true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); mKeys.right = true; }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  mKeys.left = false;
      if (e.key === 'ArrowRight') mKeys.right = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  /** CSS top (px from canvas top) where the ship sits — scales with canvas. */
  const shipY = Math.round(canvasDims.h * SHIP_Y_RATIO);

  return {
    phase,
    meteors,
    currentQuestion,
    currentAnswers,
    score,
    lives,
    streak,
    maxStreak,
    catchCount,
    wrongHits,
    bossesDefeated,
    bossHealth,
    bossCracked,
    bossExploding,
    showCoinBurst,
    showScorePopup,
    streakVisible,
    screenFlash,
    flashMeteorId,
    canvasDims,
    shipY,
    gameKey,
    shipDivRef,
    meteorDivRefs,
    bossDivRef,
    startGame,
    submitBossAnswer,
  };
}
