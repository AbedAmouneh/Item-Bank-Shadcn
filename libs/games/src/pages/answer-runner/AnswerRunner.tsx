/**
 * AnswerRunner — side-scroller where the player moves up/down to collect
 * correct answers (green) and dodge wrong ones (red).
 *
 * Architecture:
 *  - Cubeforge canvas draws only the player sprite and the dark background.
 *  - Answer sprites are rendered as absolutely-positioned HTML <div> elements
 *    in the overlay so their positions are always in sync with React state.
 *  - Player Y is tracked in a shared module-level ref so the ECS playerScript
 *    can write it and the React collision tick can read it without setState.
 *  - Keyboard state lives in a module-level Set read by the ECS Script each frame.
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
const PLAYER_X = 100;
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

/** Player Y in world pixels — written by ECS Script, read by React collision tick. */
let sharedPlayerY = CANVAS_H / 2;

/** Keys currently held down — written by window listeners, read by ECS Script. */
const keysDown = new Set<string>();

// ─── Player ECS script ────────────────────────────────────────────────────────
// Defined at module level so it is never recreated across re-renders.
// This is important: if playerScript were defined inside the component,
// Cubeforge would remount the Script entity every render and lose the transform state.

const playerScript: ScriptUpdateFn = (
  id: EntityId,
  world: ECSWorld,
  _input: unknown,
  dt: number,
) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  if (keysDown.has('ArrowUp'))   t.y = Math.max(20, t.y - PLAYER_SPEED * dt);
  if (keysDown.has('ArrowDown')) t.y = Math.min(CANVAS_H - 20, t.y + PLAYER_SPEED * dt);
  // Write back so the React collision tick knows where the player is.
  sharedPlayerY = t.y;
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

  // ── Keyboard tracking ─────────────────────────────────────────────────────

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => keysDown.add(e.key);
    const onUp = (e: KeyboardEvent) => keysDown.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      keysDown.clear();
    };
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

      // Collision check: compare answer position with player position.
      const dx = Math.abs(newX - PLAYER_X);
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
    if (correctCollected || next.length === 0) {
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
    sharedPlayerY = CANVAS_H / 2;
    speedRef.current = BASE_SPEED;
    answersRef.current = [];
    setScore(0);
    setLives(3);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setPhase('playing');
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        Loading questions…
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (questions.length === 0) {
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
        <div
          className="relative rounded-xl overflow-hidden border border-border bg-[#0d0d2a]"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          <AnswerRunnerResults
            score={score}
            correctCount={correctCount}
            totalQuestions={questions.length}
            survived={lives > 0}
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

      {/* Game frame */}
      <div
        className="relative rounded-xl overflow-hidden border border-border"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        {/* Cubeforge canvas — player sprite + dark background only */}
        <Game width={CANVAS_W} height={CANVAS_H} gravity={0}>
          <World background="#0d0d2a">
            <Camera2D />
            <Entity id="player">
              <Transform x={PLAYER_X} y={CANVAS_H / 2} />
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
              <span className="bg-black/70 text-white text-sm font-semibold rounded px-3 py-1 max-w-[520px] text-center leading-snug">
                {currentQuestion.text ?? currentQuestion.name}
              </span>
            </div>
          )}

          {/* Answer sprites — absolutely positioned colored rectangles */}
          {phase === 'playing' && answers.map((a) => (
            <div
              key={a.id}
              className="absolute flex items-center justify-center rounded-md text-white text-xs font-semibold text-center leading-tight px-1"
              style={{
                insetInlineStart: a.x - 64,
                top: a.y - 17,
                width: 128,
                height: 34,
                backgroundColor: a.isCorrect ? '#16a34a' : '#dc2626',
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
                Use ↑ ↓ to move · collect green · dodge red
              </p>
              <Button onClick={handleStart} className="mt-2">
                Start!
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ↑ ↓ arrow keys · green = correct (+10) · red = wrong (−1 life)
      </p>
    </div>
  );
}
