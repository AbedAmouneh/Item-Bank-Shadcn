/**
 * AnswerRunner — side-scroller where the player moves in all four directions
 * to collect correct answers and dodge wrong ones.
 *
 * Architecture:
 *  - Cubeforge canvas draws only the player sprite and the dark background.
 *  - Answer sprites are rendered as absolutely-positioned HTML <div> elements
 *    in the overlay so their positions are always in sync with React state.
 *  - Player Y is tracked in a shared module-level ref so the ECS playerScript
 *    can write it and the React collision tick can read it without setState.
 *  - Keyboard input is read via the Cubeforge InputManager passed to playerScript
 *    as the `input` parameter — the official Cubeforge pattern for script input.
 *
 * Collision is checked in a React setInterval loop (TICK_MS = 50):
 *  - Correct hit  → score +10, remove entity, advance to next question.
 *  - Wrong hit    → lives −1, remove that entity.
 *  - Answer x < 0 → remove entity (no penalty).
 *  - All gone     → advance to next question, no life penalty.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Game,
  World,
  Entity,
  Transform,
  Sprite,
  Script,
  Camera2D,
} from 'cubeforge';
import type { EntityId, ECSWorld, TransformComponent, ScriptUpdateFn } from 'cubeforge';
import { Button } from '@item-bank/ui';
import { useGameQuestions } from '../../domain/hooks';
import { extractAnswers } from '../../domain/extractAnswers';
import type { RunnerAnswer } from '../../domain/types';
import AnswerRunnerResults from './AnswerRunnerResults';

// ─── Fixed constants ──────────────────────────────────────────────────────────

/** Maximum (desktop) canvas width. Mobile gets a physically smaller canvas. */
const CANVAS_W = 700;
/** Maximum (desktop) canvas height. */
const CANVAS_H = 400;
/** CSS x where the player starts. Chosen to clear the D-pad width (~184px). */
const PLAYER_X = 220;
/** Starting answer move speed in px/s. */
const BASE_SPEED = 150;
/** How much speed increases (px/s) every SPEED_EVERY_N questions. */
const SPEED_INCREMENT = 0.5;
const SPEED_EVERY_N = 3;
const PLAYER_SPEED = 200; // px/s
const COLLISION_DX = 80; // horizontal overlap threshold (px)
const COLLISION_DY = 30; // vertical overlap threshold (px)
const TICK_MS = 50; // collision + movement interval
/** Top of the spawn zone — kept below the question card (~100 px tall). */
const SPAWN_Y_MIN = 108;

// ─── Reactive canvas dimensions ───────────────────────────────────────────────
// On mobile the canvas is physically smaller (not CSS-scaled) to fill the screen
// more naturally. All coordinate constants derived from canvas size are module-level
// `let` variables so the playerScript RAF callback always reads the latest values.

let mCanvasW = CANVAS_W;
let mCanvasH = CANVAS_H;
let mCamHalfW = CANVAS_W / 2;
let mCamHalfH = CANVAS_H / 2;
/** Camera2D x of the player: CSS x relative to canvas centre. */
let mCamPlayerX = PLAYER_X - CANVAS_W / 2; // 220 − 350 = −130
/** Bottom of the spawn zone — leaves a small gap above the canvas floor. */
let mSpawnYMax = CANVAS_H - 24;
/** Top player movement rail (camera-space). */
let mCamRailTop = SPAWN_Y_MIN - CANVAS_H / 2; // −92
/** Bottom player movement rail (camera-space). */
let mCamRailBot = (CANVAS_H - 24) - CANVAS_H / 2; // 176
/** Player sprite size in px. Smaller on mobile so it doesn't dominate the canvas. */
let mPlayerSize = 40;

/**
 * Choose canvas dimensions from the current viewport width.
 * Desktop (≥640 px): full 700×400.
 * Mobile (<640 px): nearly full-width with a squarish aspect ratio (~5:6)
 * so the canvas is tall enough to be playable without eating too much screen.
 */
function getCanvasDims(vw: number): { w: number; h: number } {
  if (vw < 640) {
    const w = Math.min(CANVAS_W, vw - 32);
    return { w, h: Math.round(w * 0.85) }; // ≈358×304 on iPhone 12 Pro
  }
  return { w: CANVAS_W, h: CANVAS_H };
}

/** Sync all module-level coordinate vars whenever the canvas size changes. */
function applyCanvasDims(w: number, h: number): void {
  mCanvasW = w;
  mCanvasH = h;
  mCamHalfW = w / 2;
  mCamHalfH = h / 2;
  mCamPlayerX = PLAYER_X - mCamHalfW;
  mSpawnYMax = h - 24;
  mCamRailTop = SPAWN_Y_MIN - mCamHalfH;
  mCamRailBot = mSpawnYMax - mCamHalfH;
  // Scale player sprite: 40px on desktop, 24px on mobile (just right for a 358px canvas)
  mPlayerSize = w < CANVAS_W ? 24 : 40;
}

// ─── Shared module-level state ────────────────────────────────────────────────
// These live outside React so the ECS Script (which runs on requestAnimationFrame)
// and the React setInterval tick can share data without triggering re-renders.

/** Player Y in CSS pixels — written by ECS Script, read by React collision tick. */
let sharedPlayerY = mCamHalfH;
/** Player X in CSS pixels — written by ECS Script, read by React collision tick. */
let sharedPlayerX = PLAYER_X;

/**
 * Keys currently held via the on-screen touch D-pad.
 * Stored at module level (same pattern as sharedPlayerX/Y) so playerScript,
 * which runs on requestAnimationFrame, can read it without a closure.
 */
const touchKeys = new Set<string>();
/** Add a direction key — called by D-pad onTouchStart / onMouseDown. */
function addTouchKey(key: string): void { touchKeys.add(key); }
/** Remove a direction key — called by D-pad onTouchEnd / onMouseUp / onMouseLeave. */
function removeTouchKey(key: string): void { touchKeys.delete(key); }

// ─── Player ECS script ────────────────────────────────────────────────────────
// Defined at module level so it is never recreated across re-renders.
// This is important: if playerScript were defined inside the component,
// Cubeforge would remount the Script entity every render and lose the transform state.
//
// Keyboard input is read via the Cubeforge InputManager (`input` parameter) —
// the official Cubeforge pattern. InputManager.keyboard attaches to window and
// persists correctly across React's component lifecycle.

// Camera2D uses y=0 at the canvas centre (y up = negative, y down = positive).
// CSS / React tile coords use y=0 at the top, so the centre is mCamHalfH.
// Conversion:  camera_y = css_y − mCamHalfH
//              css_y    = camera_y + mCamHalfH
// All rail/half constants are the mutable module-level vars so they always
// reflect the current canvas size, even when the canvas is resized.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerScript: ScriptUpdateFn = (
  id: EntityId,
  world: ECSWorld,
  input: any,
  dt: number,
) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  // Each direction checks both the physical keyboard (InputManager) and
  // the on-screen D-pad (touchKeys), so both control methods work simultaneously.
  if (input.isDown('ArrowUp')    || touchKeys.has('ArrowUp'))    t.y = Math.max(mCamRailTop, t.y - PLAYER_SPEED * dt);
  if (input.isDown('ArrowDown')  || touchKeys.has('ArrowDown'))  t.y = Math.min(mCamRailBot, t.y + PLAYER_SPEED * dt);
  if (input.isDown('ArrowLeft')  || touchKeys.has('ArrowLeft'))  t.x = Math.max(-(mCamHalfW - 20), t.x - PLAYER_SPEED * dt);
  if (input.isDown('ArrowRight') || touchKeys.has('ArrowRight')) t.x = Math.min( (mCamHalfW - 20), t.x + PLAYER_SPEED * dt);
  // Convert camera coords → CSS coords for the React collision tick.
  sharedPlayerY = t.y + mCamHalfH;
  sharedPlayerX = t.x + mCamHalfW;
};

// ─── Wave spawning helper ──────────────────────────────────────────────────────

type RawAnswer = { text: string; isCorrect: boolean };

/**
 * Build a wave of RunnerAnswer entities for a question.
 * Always 1 correct (green) + 2–3 wrong (red), shuffled and spaced vertically.
 */
function spawnWave(questionIndex: number, extracted: RawAnswer[]): RunnerAnswer[] {
  const correct = extracted.find((a) => a.isCorrect);
  if (!correct) return [];

  const wrongPool = extracted.filter((a) => !a.isCorrect);
  // Use 2 wrong answers by default; add a 3rd if the pool allows it (randomised).
  const extraWrong = wrongPool.length >= 3 ? Math.round(Math.random()) : 0;
  const wrongs = wrongPool.slice(0, Math.min(wrongPool.length, 2 + extraWrong));

  const all = [correct, ...wrongs];
  // Shuffle so the correct answer isn't always in the same vertical slot.
  const shuffled = [...all].sort(() => Math.random() - 0.5);

  // Space entities evenly inside the safe play zone (below the question card).
  const count = shuffled.length;
  const usableH = mSpawnYMax - SPAWN_Y_MIN;
  const step = count > 1 ? usableH / (count - 1) : 0;

  return shuffled.map((a, i) => ({
    id: `ans-${questionIndex}-${i}`,
    x: mCanvasW + 20,
    y: SPAWN_Y_MIN + i * step,
    text: a.text,
    isCorrect: a.isCorrect,
  }));
}

// ─── Hit feedback ─────────────────────────────────────────────────────────────

/** Brief visual flash shown at the player position after a collision. */
type HitFeedback = {
  correct: boolean;
  /** CSS-space X at the moment of collision — used to position the label. */
  x: number;
  /** CSS-space Y at the moment of collision — used to position the label. */
  y: number;
};

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase = 'idle' | 'playing' | 'results';

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnswerRunner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // §3.1 and §3.2 bug fixes: read tag_ids and item_bank_id from URL.
  const questionType = searchParams.get('type') ?? 'multiple_choice';
  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const { data, isLoading } = useGameQuestions({ type: questionType, tag_ids, item_bank_id });

  // Memoised so the array reference stays stable between renders.
  const questions = useMemo(
    () => (data?.items ?? []).filter((q) => extractAnswers(q).length > 0),
    [data],
  );

  // ── Game state ─────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>('idle');
  // Incremented on every new game start to force the Cubeforge player Entity
  // to remount and reset its Transform to the correct camera-space origin (y=0).
  const [gameKey, setGameKey] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<RunnerAnswer[]>([]);

  // Refs let the tick callback always read the latest values without
  // being in its dependency array (which would restart the interval on each change).
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const livesRef = useRef(3);
  livesRef.current = lives;
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;
  // answersRef is the tick's authoritative read source (avoids stale closures).
  const answersRef = useRef<RunnerAnswer[]>([]);
  answersRef.current = answers;
  // Speed increases +0.5 px/s every 3 questions.
  const speedRef = useRef(BASE_SPEED);

  // ── Hit feedback ──────────────────────────────────────────────────────────
  // Shows a "+10 ✓" or "−1 ✗" label at the player's position for 650 ms.

  const [hitFeedback, setHitFeedback] = useState<HitFeedback | null>(null);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Touch controls ────────────────────────────────────────────────────────
  // Detect touch support once on mount — drives whether the D-pad is shown.
  // navigator.maxTouchPoints > 0 covers both iOS/Android and hybrid laptops.

  const [showTouchControls, setShowTouchControls] = useState(false);
  useEffect(() => {
    setShowTouchControls(navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  }, []);

  // Clear any stale touch presses when the game ends or resets so the player
  // doesn't start the next game with a direction already held down.
  useEffect(() => {
    if (phase !== 'playing') touchKeys.clear();
  }, [phase]);

  // ── Responsive canvas dimensions ──────────────────────────────────────
  // On mobile the canvas is physically sized to fill the screen (not CSS-scaled).
  // applyCanvasDims syncs the module-level vars used by playerScript and spawnWave.
  const [canvasDims, setCanvasDimsState] = useState(() => {
    const dims = getCanvasDims(typeof window !== 'undefined' ? window.innerWidth : 1024);
    applyCanvasDims(dims.w, dims.h);
    return dims;
  });
  useEffect(() => {
    function onResize() {
      const dims = getCanvasDims(window.innerWidth);
      applyCanvasDims(dims.w, dims.h);
      setCanvasDimsState(dims);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Spawn wave on new question ─────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    const q = questions[currentIndex];
    if (!q) return;
    const extracted = extractAnswers(q);
    const wave = spawnWave(currentIndex, extracted);
    answersRef.current = wave;
    setAnswers(wave);
  }, [phase, currentIndex, questions]);

  // ── Speed progression ─────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    speedRef.current = BASE_SPEED + Math.floor(currentIndex / SPEED_EVERY_N) * SPEED_INCREMENT;
  }, [phase, currentIndex]);

  // ── Game tick: move + collide + cleanup ───────────────────────────────────

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return;

    const prev = answersRef.current;
    let scoreGain = 0;
    let lifeChange = 0;
    let correctCollected = false;
    const next: RunnerAnswer[] = [];

    for (const a of prev) {
      const newX = a.x - speedRef.current * (TICK_MS / 1000);

      // Off-screen left → remove (no penalty).
      if (newX < -140) continue;

      // Collision check: compare answer position with the player's live CSS position.
      const dx = Math.abs(newX - sharedPlayerX);
      const dy = Math.abs(a.y - sharedPlayerY);
      if (dx < COLLISION_DX && dy < COLLISION_DY) {
        if (a.isCorrect) {
          scoreGain += 10;
          correctCollected = true;
        } else {
          lifeChange -= 1;
        }
        // Show hit feedback at the player's current position.
        if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
        setHitFeedback({ correct: a.isCorrect, x: sharedPlayerX, y: sharedPlayerY });
        hitTimerRef.current = setTimeout(() => setHitFeedback(null), 650);
        // End the whole wave immediately — clear any tiles already queued and stop
        // iterating so the player cannot hit a second tile in the same wave.
        next.length = 0;
        break;
      }

      next.push({ ...a, x: newX });
    }

    // Apply position updates.
    answersRef.current = next;
    setAnswers(next);

    // Apply score gain.
    if (scoreGain > 0) {
      setScore((s) => s + scoreGain);
      setCorrectCount((c) => c + 1);
    }

    // Apply life loss — check separately from question advance.
    if (lifeChange < 0) {
      const newLives = Math.max(0, livesRef.current + lifeChange);
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) {
        setPhase('results');
        return; // game over — stop tick processing for this frame
      }
    }

    // Advance to next question when correct collected OR all answers gone.
    // Guard: prev.length > 0 prevents advancing on the first tick before the
    // wave spawn effect has had a chance to populate answersRef.
    if (correctCollected || (prev.length > 0 && next.length === 0)) {
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx >= questions.length) {
        setPhase('results');
      } else {
        setCurrentIndex(nextIdx);
      }
      // Clear answers immediately; the spawn effect will repopulate.
      answersRef.current = [];
      setAnswers([]);
    }
  }, [questions.length]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [phase, tick]);

  // ── Start / reset ─────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    sharedPlayerY = mCamHalfH;  // CSS-space centre; synced back by playerScript each frame
    sharedPlayerX = PLAYER_X;      // reset to starting column
    speedRef.current = BASE_SPEED;
    answersRef.current = [];
    setScore(0);
    setLives(3);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setGameKey((k) => k + 1); // remount the Cubeforge Entity → resets Transform to y=0
    setPhase('playing');
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];

  // ── Loading ───────────────────────────────────────────────────────────────

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!isLoading && questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-muted-foreground">
          No compatible questions found. Add some multiple-choice or true/false questions first.
        </p>
        <Button variant="outline" onClick={() => navigate('/games')}>
          ← Back to Games
        </Button>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────

  if (phase === 'results') {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="flex items-center justify-between w-full max-w-[700px]">
          <h2 className="text-xl font-bold">🏃 Answer Runner</h2>
        </div>
        <div className="w-full max-w-[700px] mx-auto rounded-xl border border-border bg-[#0d0d2a]">
          <AnswerRunnerResults
            score={score}
            correctCount={correctCount}
            totalQuestions={questions.length}
            survived={lives > 0}
            item_bank_id={item_bank_id}
            onPlayAgain={handleStart}
            onBack={() => navigate('/games')}
          />
        </div>
      </div>
    );
  }

  // ── Game canvas ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between w-full max-w-[700px]">
        <h2 className="text-xl font-bold">🏃 Answer Runner</h2>
        <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>

      {/* Game frame — physically sized to fill the screen on any viewport */}
      <div className="w-full">
      <div
        className="relative rounded-xl overflow-hidden border border-border mx-auto"
        style={{ width: canvasDims.w, height: canvasDims.h }}
      >
        {isLoading && (
          /* Loading spinner centred inside the dark game frame */
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d0d2a]">
            <div
              className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin"
              role="status"
              aria-label="Loading questions"
            />
          </div>
        )}
        {/* Cubeforge canvas — player sprite + dark background only */}
        <Game width={canvasDims.w} height={canvasDims.h} gravity={0}>
          <World background="#0d0d2a">
            <Camera2D />
            {/* key={gameKey} forces a remount on every new game, resetting Transform to y=0.
                y=0 is the Camera2D canvas centre; CSS collision coords use mCamHalfH. */}
            <Entity key={gameKey} id="player">
              <Transform x={mCamPlayerX} y={0} />
              <Sprite
                width={mPlayerSize}
                height={mPlayerSize}
                color="#4fc3f7"
                shape="roundedRect"
                borderRadius={Math.round(mPlayerSize * 0.2)}
              />
              <Script update={playerScript} />
            </Entity>
          </World>
        </Game>

        {/* HTML overlay — z-index 10, pointer-events managed per child */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

          {/* ── Question card: score · progress · lives · question text ─── */}
          {phase === 'playing' && currentQuestion && (
            <div className="mx-3 mt-3 rounded-xl border border-white/10 bg-black/65 px-4 pt-2.5 pb-3">
              {/* Row 1: score · progress counter · lives */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-bold text-sm tabular-nums">⭐ {score}</span>
                <span className="text-white/40 text-xs font-medium tracking-wide">
                  Q {currentIndex + 1} / {questions.length}
                </span>
                <span className="text-sm leading-none">
                  {'❤️'.repeat(Math.max(0, lives))}
                </span>
              </div>
              {/* Row 2: question text */}
              {/* eslint-disable-next-line react/no-danger */}
              <p
                className="text-white text-sm font-semibold text-center leading-snug"
                dangerouslySetInnerHTML={{ __html: currentQuestion.text ?? currentQuestion.name }}
              />
            </div>
          )}

          {/* Answer tiles — absolutely positioned, neutral colour until hit */}
          {phase === 'playing' && answers.map((a) => (
            <div
              key={a.id}
              className="absolute flex items-center justify-center rounded-lg text-white text-xs font-semibold text-center leading-tight px-2 shadow-lg"
              style={{
                insetInlineStart: `${a.x - 64}px`,
                top: `${a.y - 17}px`,
                width: 128,
                height: 34,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {a.text}
            </div>
          ))}

          {/* Hit feedback — floats near the player for 650 ms */}
          {hitFeedback && (
            <div
              className="absolute pointer-events-none font-extrabold text-base drop-shadow-lg"
              style={{
                insetInlineStart: `${hitFeedback.x - 24}px`,
                top: `${hitFeedback.y - 44}px`,
                color: hitFeedback.correct ? '#4ade80' : '#f87171',
                textShadow: hitFeedback.correct
                  ? '0 0 12px rgba(74,222,128,0.8)'
                  : '0 0 12px rgba(248,113,113,0.8)',
              }}
            >
              {hitFeedback.correct ? '+10 ✓' : '−1 ✗'}
            </div>
          )}

          {/* Idle screen */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white pointer-events-auto">
              <p className="text-3xl">🏃</p>
              <p className="text-xl font-bold">Answer Runner</p>
              <p className="text-sm text-white/60">
                {showTouchControls
                  ? 'Use the on-screen D-pad to move · hit the correct answer · dodge the wrong ones'
                  : 'Use ↑ ↓ ← → to move · hit the correct answer · dodge the wrong ones'}
              </p>
              <Button onClick={handleStart} className="mt-2">
                Start!
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── Touch D-pad — below the canvas ──────────────────────────────── */}
      {/* Rendered outside the scaled game frame so buttons stay 56×56px  */}
      {/* (WCAG AA touch target) regardless of how much the canvas shrinks. */}
      {phase === 'playing' && showTouchControls && (
        <div className="flex justify-center">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: 'repeat(3, 56px)',
              gridTemplateRows: 'repeat(3, 56px)',
              touchAction: 'none',
            }}
          >
            {/* Row 1: spacer · Up · spacer */}
            <span />
            <button
              className="flex items-center justify-center rounded-xl bg-white/15 text-white text-xl font-bold active:bg-white/30 select-none"
              aria-label="Move up"
              onTouchStart={() => addTouchKey('ArrowUp')}
              onTouchEnd={() => removeTouchKey('ArrowUp')}
              onMouseDown={() => addTouchKey('ArrowUp')}
              onMouseUp={() => removeTouchKey('ArrowUp')}
              onMouseLeave={() => removeTouchKey('ArrowUp')}
            >↑</button>
            <span />

            {/* Row 2: Left · spacer · Right */}
            <button
              className="flex items-center justify-center rounded-xl bg-white/15 text-white text-xl font-bold active:bg-white/30 select-none"
              aria-label="Move left"
              onTouchStart={() => addTouchKey('ArrowLeft')}
              onTouchEnd={() => removeTouchKey('ArrowLeft')}
              onMouseDown={() => addTouchKey('ArrowLeft')}
              onMouseUp={() => removeTouchKey('ArrowLeft')}
              onMouseLeave={() => removeTouchKey('ArrowLeft')}
            >←</button>
            <span />
            <button
              className="flex items-center justify-center rounded-xl bg-white/15 text-white text-xl font-bold active:bg-white/30 select-none"
              aria-label="Move right"
              onTouchStart={() => addTouchKey('ArrowRight')}
              onTouchEnd={() => removeTouchKey('ArrowRight')}
              onMouseDown={() => addTouchKey('ArrowRight')}
              onMouseUp={() => removeTouchKey('ArrowRight')}
              onMouseLeave={() => removeTouchKey('ArrowRight')}
            >→</button>

            {/* Row 3: spacer · Down · spacer */}
            <span />
            <button
              className="flex items-center justify-center rounded-xl bg-white/15 text-white text-xl font-bold active:bg-white/30 select-none"
              aria-label="Move down"
              onTouchStart={() => addTouchKey('ArrowDown')}
              onTouchEnd={() => removeTouchKey('ArrowDown')}
              onMouseDown={() => addTouchKey('ArrowDown')}
              onMouseUp={() => removeTouchKey('ArrowDown')}
              onMouseLeave={() => removeTouchKey('ArrowDown')}
            >↓</button>
            <span />
          </div>
        </div>
      )}

      {/* ── How to Play ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-[700px] rounded-xl border border-white/10 bg-[#0a0a1f] px-5 py-4">
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
          How to Play
        </p>
        <div className="flex flex-col gap-2">
          {[
            'Move with arrow keys ↑ ↓ ← →',
            'Steer into a tile to give your answer',
            'Correct answer scores +10 points',
            'Wrong answer costs 1 life — you start with 3',
            'Losing all 3 lives ends the run early',
            'Tiles speed up every 3 questions',
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-3">
              <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-white/65 text-xs leading-snug">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
