/**
 * usePixelDashLogic — all game state for Pixel Dash.
 *
 * Responsibility split:
 *   This hook  — phase machine, collision detection, scoring, spawn scheduling,
 *                lane switching, gate answer handling.
 *   PixelDashBridge — shared mutable vars read/written by Cubeforge Scripts.
 *   PixelDashCanvas — pure Cubeforge ECS; writes cssY to entityRegistry each frame.
 *
 * Design notes:
 *  - `phaseRef` mirrors `phase` state so setInterval/setTimeout callbacks can
 *    read the current phase without closing over a stale value.
 *  - `livesRef` mirrors `lives` for the same reason — collision events update it
 *    synchronously; React state follows on the next render.
 *  - Spawn timers use self-scheduling setTimeouts (rather than setInterval) so
 *    each delay is independent and random.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Question } from '@item-bank/api';
import { useGameQuestions } from '../../../domain/hooks/UseGameQuestions';
import { extractAnswers } from '../../../domain/extractAnswers';
import type { GameAnswer } from '../../../domain/types';
import { bridge, entityRegistry } from '../PixelDashBridge';
import { FALLBACK_QUESTIONS } from '../fallback/questions';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Desktop canvas size. Mobile gets a smaller canvas from getCanvasDims. */
const CANVAS_W = 700;
const CANVAS_H = 480;

/**
 * CSS y from canvas top where the player sprite's centre sits.
 * Gate triggers when bridge.gateCssY >= this value.
 * Must match PLAYER_ROW_CSS in PixelDashCanvas and PixelDash.
 */
export const PLAYER_ROW_CSS = 390;

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three phases of a Pixel Dash run. */
export type PixelDashPhase = 'running' | 'quiz_gate' | 'results';

/** A live obstacle or coin entity tracked by React. */
export interface ActiveEntity {
  id: string;
  lane: 0 | 1 | 2;
  /** Only set for obstacles: alternates rock/barrel. */
  variant?: 'rock' | 'barrel';
}

interface UsePixelDashLogicParams {
  tag_ids?: number[];
  item_bank_id?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns canvas dimensions based on viewport width.
 * Desktop (≥640px): 700×480. Mobile: squarish ratio (~5:6) at screen width.
 */
function getCanvasDims(vw: number): { w: number; h: number } {
  if (vw < 640) {
    const w = Math.min(CANVAS_W, vw - 32);
    return { w, h: Math.round(w * (6 / 5)) };
  }
  return { w: CANVAS_W, h: CANVAS_H };
}

/**
 * Returns the CSS x centre of each lane given the canvas width.
 * Lanes sit at 1/4, 2/4, 3/4 of the canvas width.
 */
function calcLaneX(canvasW: number): [number, number, number] {
  const s = Math.round(canvasW / 4);
  return [s, s * 2, s * 3];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePixelDashLogic({ tag_ids, item_bank_id }: UsePixelDashLogicParams) {
  // ── Questions ─────────────────────────────────────────────────────────────
  const { data } = useGameQuestions({ type: 'multiple_choice', tag_ids, item_bank_id });
  const allQuestions = useMemo<Question[]>(() => {
    const items = data?.items ?? [];
    return items.length > 0 ? items : FALLBACK_QUESTIONS;
  }, [data]);

  // ── Canvas geometry ───────────────────────────────────────────────────────
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>(() =>
    getCanvasDims(typeof window !== 'undefined' ? window.innerWidth : 1024),
  );

  useEffect(() => {
    function onResize() { setCanvasDims(getCanvasDims(window.innerWidth)); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const laneXPositions = useMemo<[number, number, number]>(
    () => calcLaneX(canvasDims.w),
    [canvasDims.w],
  );

  // ── Game state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<PixelDashPhase>('running');
  /** 0 = not yet started (idle screen). >0 = active game. Bumped on each startGame. */
  const [gameKey, setGameKey] = useState(0);
  /** Bumped each time the gate Cubeforge entity should be remounted. */
  const [gateKey, setGateKey] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [gatesCleared, setGatesCleared] = useState(0);
  const [totalGatesReached, setTotalGatesReached] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [distancePx, setDistancePx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [activeObstacles, setActiveObstacles] = useState<ActiveEntity[]>([]);
  const [activeCoins, setActiveCoins] = useState<ActiveEntity[]>([]);
  const [currentLane, setCurrentLane] = useState<0 | 1 | 2>(1);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState(false);
  /** Bump key — incrementing remounts the screen-flash div, re-triggering the CSS animation. */
  const [screenFlash, setScreenFlash] = useState(0);
  const [streakFire, setStreakFire] = useState(false);

  // ── Synchronous refs (read inside setInterval / setTimeout) ───────────────
  const phaseRef = useRef<PixelDashPhase>('running');
  const currentLaneRef = useRef<0 | 1 | 2>(1);
  const answersRef = useRef<GameAnswer[]>([]);
  const streakRef = useRef(0);
  /** Tracks lives synchronously so collision detection can act before the next render. */
  const livesRef = useRef(3);
  const canvasDimsRef = useRef(canvasDims);
  const allQuestionsRef = useRef<Question[]>([]);
  const questionQueueRef = useRef<Question[]>([]);
  const questionIdxRef = useRef(0);
  const obstacleCountRef = useRef(0);

  // Timer refs — kept so clearAllTimers can cancel them.
  const obstacleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Keep refs current ─────────────────────────────────────────────────────
  useEffect(() => { canvasDimsRef.current = canvasDims; }, [canvasDims]);
  useEffect(() => { allQuestionsRef.current = allQuestions; }, [allQuestions]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // ── Bridge: update player target x on lane change ─────────────────────────
  useEffect(() => {
    bridge.playerTargetX = laneXPositions[currentLane];
  }, [currentLane, laneXPositions]);

  // ── Lives → results transition ────────────────────────────────────────────
  // Handled as a side-effect rather than inline so it catches hits from both
  // obstacle collision (tick) and wrong gate answers (answerGate).
  useEffect(() => {
    if (gameKey > 0 && lives <= 0 && phaseRef.current !== 'results') {
      bridge.pausedM = true;
      bridge.gateCssY = -9999;
      phaseRef.current = 'results';
      setPhase('results');
    }
  }, [lives, gameKey]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function clearAllTimers() {
    if (obstacleTimerRef.current) clearTimeout(obstacleTimerRef.current);
    if (coinTimerRef.current) clearTimeout(coinTimerRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    obstacleTimerRef.current = null;
    coinTimerRef.current = null;
    tickIntervalRef.current = null;
  }

  /** Pull next question from the shuffled queue; reshuffles when exhausted. */
  function dequeueQuestion(): Question {
    if (questionIdxRef.current >= questionQueueRef.current.length) {
      questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
      questionIdxRef.current = 0;
    }
    return questionQueueRef.current[questionIdxRef.current++];
  }

  // ── Self-scheduling spawners ───────────────────────────────────────────────

  /**
   * Schedule the next obstacle after a random 1500–3000ms delay.
   * Uses a named function expression so the inner `spawn` call always
   * references the same closure regardless of React render cycles.
   */
  const scheduleObstacle = useCallback(function spawn() {
    if (phaseRef.current === 'results') return;
    const delay = 1500 + Math.random() * 1500;
    obstacleTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'running') {
        const id = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        const variant: 'rock' | 'barrel' = obstacleCountRef.current % 2 === 0 ? 'rock' : 'barrel';
        obstacleCountRef.current++;
        entityRegistry.set(id, { type: 'obstacle', lane, cssY: -30 });
        setActiveObstacles((prev) => [...prev, { id, lane, variant }]);
      }
      spawn();
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Schedule the next coin after a random 2000–4000ms delay. */
  const scheduleCoin = useCallback(function spawn() {
    if (phaseRef.current === 'results') return;
    const delay = 2000 + Math.random() * 2000;
    coinTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'running') {
        const id = `coin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        entityRegistry.set(id, { type: 'coin', lane, cssY: -30 });
        setActiveCoins((prev) => [...prev, { id, lane }]);
      }
      spawn();
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Start the 50ms collision / gate-trigger / distance tick. */
  const startTick = useCallback(() => {
    tickIntervalRef.current = setInterval(() => {
      if (phaseRef.current === 'results') return;

      // Accumulate distance: scrollSpeedM px/s × 0.05 s per tick
      setDistancePx((d) => d + bridge.scrollSpeedM * 0.05);

      // Gate trigger — activate quiz_gate when gate bar reaches player row
      if (bridge.gateCssY >= PLAYER_ROW_CSS && phaseRef.current === 'running') {
        const q = dequeueQuestion();
        const qAnswers = extractAnswers(q).slice(0, 3);
        bridge.pausedM = true;
        phaseRef.current = 'quiz_gate';
        setPhase('quiz_gate');
        setCurrentQuestion(q);
        setAnswers(qAnswers);
        answersRef.current = qAnswers;
        setTotalGatesReached((t) => t + 1);
      }

      // Collision detection — only while actively running
      if (phaseRef.current !== 'running') return;
      entityRegistry.forEach((ent, id) => {
        const atPlayerRow =
          ent.cssY >= PLAYER_ROW_CSS - 20 && ent.cssY <= PLAYER_ROW_CSS + 24;
        const sameLane = ent.lane === currentLaneRef.current;
        const offScreen = ent.cssY > canvasDimsRef.current.h + 30;

        if (ent.type === 'obstacle') {
          if (atPlayerRow && sameLane) {
            entityRegistry.delete(id);
            setActiveObstacles((prev) => prev.filter((o) => o.id !== id));
            livesRef.current = Math.max(0, livesRef.current - 1);
            setLives(livesRef.current);
          } else if (offScreen) {
            entityRegistry.delete(id);
            setActiveObstacles((prev) => prev.filter((o) => o.id !== id));
          }
        } else {
          // coin
          if (atPlayerRow && sameLane) {
            entityRegistry.delete(id);
            setActiveCoins((prev) => prev.filter((c) => c.id !== id));
            setScore((s) => s + 10);
            setCoinsCollected((c) => c + 1);
          } else if (offScreen) {
            entityRegistry.delete(id);
            setActiveCoins((prev) => prev.filter((c) => c.id !== id));
          }
        }
      });
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public actions ────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    clearAllTimers();
    entityRegistry.clear();

    // Reset bridge
    bridge.scrollSpeedM = 140;
    bridge.pausedM = false;
    bridge.gateCssY = -9999;
    bridge.playerTargetX = laneXPositions[1];
    bridge.playerCssX = laneXPositions[1];

    // Reset question queue
    questionQueueRef.current = [...allQuestionsRef.current].sort(() => Math.random() - 0.5);
    questionIdxRef.current = 0;
    obstacleCountRef.current = 0;

    // Sync fast refs before spawners/tick start
    phaseRef.current = 'running';
    currentLaneRef.current = 1;
    livesRef.current = 3;
    answersRef.current = [];

    // Reset React state
    setPhase('running');
    setScore(0);
    setLives(3);
    setStreak(0);
    setStreakFire(false);
    setGatesCleared(0);
    setTotalGatesReached(0);
    setCoinsCollected(0);
    setMaxStreak(0);
    setDistancePx(0);
    setCurrentQuestion(null);
    setAnswers([]);
    setActiveObstacles([]);
    setActiveCoins([]);
    setCurrentLane(1);
    setShowCoinBurst(false);
    setShowScorePopup(false);
    setScreenFlash(0);
    setGameKey((k) => k + 1);
    setGateKey((k) => k + 1);

    // Start spawners and collision tick
    scheduleObstacle();
    scheduleCoin();
    startTick();
  }, [laneXPositions, scheduleObstacle, scheduleCoin, startTick]);

  const switchLane = useCallback((dir: -1 | 1) => {
    setCurrentLane((l) => {
      const next = Math.max(0, Math.min(2, l + dir)) as 0 | 1 | 2;
      currentLaneRef.current = next;
      bridge.playerTargetX = laneXPositions[next];
      return next;
    });
  }, [laneXPositions]);

  const answerGate = useCallback((laneIdx: 0 | 1 | 2) => {
    if (phaseRef.current !== 'quiz_gate') return;
    const isCorrect = answersRef.current[laneIdx]?.isCorrect ?? false;

    if (isCorrect) {
      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      setScore((s) => s + 50);
      setGatesCleared((g) => g + 1);
      setStreak(newStreak);
      setStreakFire(newStreak >= 3);
      setMaxStreak((m) => Math.max(m, newStreak));
      setShowCoinBurst(true);
      setShowScorePopup(true);
      setTimeout(() => { setShowCoinBurst(false); setShowScorePopup(false); }, 800);

      bridge.scrollSpeedM += 6;
      bridge.gateCssY = -9999;
      bridge.pausedM = false;
      phaseRef.current = 'running';
      setPhase('running');
      setGateKey((k) => k + 1);
      setCurrentQuestion(null);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setStreakFire(false);
      setScreenFlash((k) => k + 1);

      livesRef.current = Math.max(0, livesRef.current - 1);
      setLives(livesRef.current);

      if (livesRef.current <= 0) {
        // Lives effect will trigger results transition, but set bridge immediately
        // so the canvas stops rendering on the next frame.
        bridge.pausedM = true;
        bridge.gateCssY = -9999;
        phaseRef.current = 'results';
        setPhase('results');
        setGateKey((k) => k + 1);
        setCurrentQuestion(null);
      } else {
        // 1200ms freeze then resume
        setTimeout(() => {
          if (phaseRef.current === 'results') return;
          bridge.gateCssY = -9999;
          bridge.pausedM = false;
          phaseRef.current = 'running';
          setPhase('running');
          setGateKey((k) => k + 1);
          setCurrentQuestion(null);
        }, 1200);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAllTimers();
      entityRegistry.clear();
      bridge.pausedM = false;
      bridge.scrollSpeedM = 140;
      bridge.gateCssY = -9999;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    phase,
    gameKey,
    gateKey,
    score,
    lives,
    streak,
    gatesCleared,
    totalGatesReached,
    coinsCollected,
    maxStreak,
    distancePx,
    currentQuestion,
    answers,
    activeObstacles,
    activeCoins,
    canvasDims,
    laneXPositions,
    currentLane,
    showCoinBurst,
    showScorePopup,
    screenFlash,
    streakFire,
    startGame,
    switchLane,
    answerGate,
  };
}
