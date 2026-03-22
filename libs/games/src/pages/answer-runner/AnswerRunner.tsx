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

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 400;
/** CSS x of the player — used for collision detection and HTML tile positioning. */
const PLAYER_X = 100;
/** Camera2D x of the player: CSS x relative to the canvas centre (x=0 is centre). */
const CAM_PLAYER_X = PLAYER_X - CANVAS_W / 2; // 100 − 350 = −250
/** Starting answer move speed in px/s. */
const BASE_SPEED = 150;
/** How much speed increases (px/s) every SPEED_EVERY_N questions. */
const SPEED_INCREMENT = 0.5;
const SPEED_EVERY_N = 3;
const PLAYER_SPEED = 200; // px/s
const COLLISION_DX = 80; // horizontal overlap threshold (px)
const COLLISION_DY = 30; // vertical overlap threshold (px) — from spec
const TICK_MS = 50; // collision + movement interval

// ─── Shared module-level state ────────────────────────────────────────────────
// These live outside React so the ECS Script (which runs on requestAnimationFrame)
// and the React setInterval tick can share data without triggering re-renders.

/** Player Y in CSS pixels — written by ECS Script, read by React collision tick. */
let sharedPlayerY = CANVAS_H / 2;
/** Player X in CSS pixels — written by ECS Script, read by React collision tick. */
let sharedPlayerX = PLAYER_X;

// ─── Player ECS script ────────────────────────────────────────────────────────
// Defined at module level so it is never recreated across re-renders.
// This is important: if playerScript were defined inside the component,
// Cubeforge would remount the Script entity every render and lose the transform state.
//
// Keyboard input is read via the Cubeforge InputManager (`input` parameter) —
// the official Cubeforge pattern. InputManager.keyboard attaches to window and
// persists correctly across React's component lifecycle.

// Camera2D uses y=0 at the canvas centre (y up = negative, y down = positive).
// CSS / React tile coords use y=0 at the top, so the centre is CANVAS_H/2.
// Conversion:  camera_y = css_y − CANVAS_H/2
//              css_y    = camera_y + CANVAS_H/2
const CAM_HALF_H = CANVAS_H / 2;
const CAM_HALF_W = CANVAS_W / 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerScript: ScriptUpdateFn = (
  id: EntityId,
  world: ECSWorld,
  input: any,
  dt: number,
) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  // Clamp vertical: top rail = -(CAM_HALF_H − 20), bottom = +(CAM_HALF_H − 20).
  if (input.isDown('ArrowUp'))    t.y = Math.max(-(CAM_HALF_H - 20), t.y - PLAYER_SPEED * dt);
  if (input.isDown('ArrowDown'))  t.y = Math.min( (CAM_HALF_H - 20), t.y + PLAYER_SPEED * dt);
  // Clamp horizontal: left edge = -(CAM_HALF_W − 20), right edge = +(CAM_HALF_W − 20).
  if (input.isDown('ArrowLeft'))  t.x = Math.max(-(CAM_HALF_W - 20), t.x - PLAYER_SPEED * dt);
  if (input.isDown('ArrowRight')) t.x = Math.min( (CAM_HALF_W - 20), t.x + PLAYER_SPEED * dt);
  // Convert camera coords → CSS coords for the React collision tick.
  sharedPlayerY = t.y + CAM_HALF_H;
  sharedPlayerX = t.x + CAM_HALF_W;
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

  // Space entities evenly between y=40 and y=CANVAS_H-40.
  const count = shuffled.length;
  const usableH = CANVAS_H - 80;
  const step = count > 1 ? usableH / (count - 1) : 0;

  return shuffled.map((a, i) => ({
    id: `ans-${questionIndex}-${i}`,
    x: CANVAS_W + 20,
    y: 40 + i * step,
    text: a.text,
    isCorrect: a.isCorrect,
  }));
}

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
        continue; // remove collided entity regardless of correct/wrong
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
    sharedPlayerY = CANVAS_H / 2;  // CSS-space centre; synced back by playerScript each frame
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
        <div className="w-full overflow-x-auto">
          <div
            className="relative rounded-xl overflow-hidden border border-border bg-[#0d0d2a] mx-auto"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
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

      {/* Responsive wrapper — allows horizontal scroll on narrow viewports */}
      <div className="w-full overflow-x-auto">
      {/* Game frame */}
      <div
        className="relative rounded-xl overflow-hidden border border-border mx-auto"
        style={{ width: CANVAS_W, height: CANVAS_H }}
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
        <Game width={CANVAS_W} height={CANVAS_H} gravity={0}>
          <World background="#0d0d2a">
            <Camera2D />
            {/* key={gameKey} forces a remount on every new game, resetting Transform to y=0.
                y=0 is the Camera2D canvas centre; CSS collision coords use CANVAS_H/2 (200). */}
            <Entity key={gameKey} id="player">
              <Transform x={CAM_PLAYER_X} y={0} />
              <Sprite
                width={40}
                height={40}
                color="#4fc3f7"
                shape="roundedRect"
                borderRadius={8}
              />
              <Script update={playerScript} />
            </Entity>
          </World>
        </Game>

        {/* HTML overlay — z-index 10, pointer-events managed per child */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

          {/* HUD: score + lives */}
          {phase === 'playing' && (
            <div className="flex items-center justify-between px-4 py-2 bg-black/50 text-white text-sm font-medium">
              <span>⭐ {score}</span>
              <span>{'❤️'.repeat(Math.max(0, lives))}</span>
            </div>
          )}

          {/* Question text — centered overlay above the play field */}
          {phase === 'playing' && currentQuestion && (
            <div className="flex justify-center px-6 py-2">
              {/* eslint-disable-next-line react/no-danger */}
              <span
                className="bg-black/70 text-white text-sm font-semibold rounded px-3 py-1 max-w-[520px] text-center leading-snug"
                dangerouslySetInnerHTML={{ __html: currentQuestion.text ?? currentQuestion.name }}
              />
            </div>
          )}

          {/* Answer sprites — absolutely positioned colored rectangles */}
          {phase === 'playing' && answers.map((a) => (
            <div
              key={a.id}
              className="absolute flex items-center justify-center rounded-md text-white text-xs font-semibold text-center leading-tight px-1"
              style={{
                insetInlineStart: `${a.x - 64}px`,
                top: `${a.y - 17}px`,
                width: 128,
                height: 34,
                backgroundColor: '#2563eb',
                opacity: 0.9,
              }}
            >
              {a.text}
            </div>
          ))}

          {/* Idle screen */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white pointer-events-auto">
              <p className="text-3xl">🏃</p>
              <p className="text-xl font-bold">Answer Runner</p>
              <p className="text-sm text-white/60">
                Use ↑ ↓ ← → to move · hit the correct answer · dodge the wrong ones
              </p>
              <Button onClick={handleStart} className="mt-2">
                Start!
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ↑ ↓ ← → arrow keys · correct answer = +10 · wrong answer = −1 life
      </p>
    </div>
  );
}
