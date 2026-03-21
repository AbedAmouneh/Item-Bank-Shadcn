/**
 * AnswerRunner — side-scroller where answer labels fly toward the player.
 *
 * Architecture:
 *  - Cubeforge canvas draws the player sprite and flying answer sprites.
 *  - React handles all game logic: score, lives, spawning, collision detection.
 *  - Player Y position is tracked in a shared ref so the ECS script can write
 *    it and the spawn/collision loop can read it without calling setState.
 *  - Keyboard state is tracked via a `keyboardRef` so the Script (which runs
 *    inside ECS) can read key state without coupling to React event handlers.
 *
 * Collision is checked in a React `setInterval` loop by comparing the player's
 * Y position (written by the player Script) with each answer entity's Y.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 400;
const PLAYER_X = 100;
const ANSWER_SPEED = 130; // px/s
const COLLISION_DX = 90;
const COLLISION_DY = 30;
const SPAWN_INTERVAL_MS = 2600;
const TICK_MS = 50; // collision + movement update interval

// ─── Shared refs (written by ECS scripts, read by React loops) ────────────────

/** Current player Y in world pixels — written by ECS Script, read by React. */
let sharedPlayerY = CANVAS_H / 2;

/** Key-down state — written by window listeners, read by ECS Script. */
const keysDown = new Set<string>();

// ─── Player ECS script ────────────────────────────────────────────────────────

const playerScript: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: unknown, dt: number) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  if (keysDown.has('ArrowUp'))   t.y = Math.max(30, t.y - 200 * dt);
  if (keysDown.has('ArrowDown')) t.y = Math.min(CANVAS_H - 30, t.y + 200 * dt);
  sharedPlayerY = t.y;
};

// ─── Answer mover script factory ──────────────────────────────────────────────

function makeMoverScript(speedRef: React.MutableRefObject<number>): ScriptUpdateFn {
  return (id: EntityId, world: ECSWorld, _input: unknown, dt: number) => {
    const t = world.getComponent<TransformComponent>(id, 'Transform');
    if (t) t.x -= speedRef.current * dt;
  };
}

// ─── Answer entity ────────────────────────────────────────────────────────────

function AnswerSprite({ answer }: { answer: RunnerAnswer }) {
  const speedRef = useRef(ANSWER_SPEED);
  const moverScript = useRef<ScriptUpdateFn>(makeMoverScript(speedRef));

  return (
    <Entity id={answer.id}>
      <Transform x={answer.x} y={answer.y} />
      <Sprite
        width={128}
        height={34}
        color={answer.isCorrect ? '#16a34a' : '#dc2626'}
        shape="roundedRect"
        borderRadius={6}
        opacity={0.85}
      />
      <Script update={moverScript.current} />
    </Entity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnswerRunner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionType = searchParams.get('type') ?? 'multiple_choice';

  const { data, isLoading } = useGameQuestions({ type: questionType });
  const questions = (data?.items ?? []).filter((q) => extractAnswers(q).length > 0);

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<RunnerAnswer[]>([]);

  const currentQuestion = questions[currentIndex];

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

  // ── Spawn wave when question changes ──────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver || !currentQuestion) return;
    const extracted = extractAnswers(currentQuestion);
    const wave: RunnerAnswer[] = extracted.slice(0, 4).map((a, i) => ({
      id: `run-${currentIndex}-${i}`,
      x: CANVAS_W + 80 + i * 40,
      y: 60 + (i * (CANVAS_H - 120)) / 3,
      text: a.text,
      isCorrect: a.isCorrect,
    }));
    setAnswers(wave);
  }, [started, gameOver, currentIndex, currentQuestion]);

  // ── Game tick: move + collide + cleanup ───────────────────────────────────
  const livesRef = useRef(3);
  livesRef.current = lives;
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const tick = useCallback(() => {
    if (!started || gameOver) return;

    setAnswers((prev) => {
      const next: RunnerAnswer[] = [];
      let scoreGain = 0;
      let lifeChange = 0;
      let advanced = false;

      for (const a of prev) {
        const newX = a.x - ANSWER_SPEED * (TICK_MS / 1000);
        // Off-screen without collection → wrong answers can just disappear
        if (newX < -160) continue;

        // Collision check against player position
        const dx = Math.abs(newX - PLAYER_X);
        const dy = Math.abs(a.y - sharedPlayerY);
        if (dx < COLLISION_DX && dy < COLLISION_DY) {
          if (a.isCorrect) {
            scoreGain += 20;
            advanced = true;
          } else {
            lifeChange -= 1;
          }
          continue; // remove the hit entity
        }

        next.push({ ...a, x: newX });
      }

      if (scoreGain > 0) setScore((s) => s + scoreGain);
      if (lifeChange < 0) {
        setLives((l) => {
          const nl = l + lifeChange;
          if (nl <= 0) setGameOver(true);
          return Math.max(0, nl);
        });
      }
      if (advanced || next.length === 0) {
        const nextIdx = currentIndexRef.current + 1;
        if (nextIdx >= questions.length) {
          setGameOver(true);
        } else {
          setCurrentIndex(nextIdx);
        }
      }

      return next;
    });
  }, [started, gameOver, questions.length]);

  useEffect(() => {
    if (!started || gameOver) return;
    const id = setInterval(tick, TICK_MS);
    // Also schedule next question after spawn interval if no collision advances it
    const sid = setTimeout(() => {
      setCurrentIndex((ci) => {
        const next = ci + 1;
        if (next >= questions.length) { setGameOver(true); return ci; }
        return next;
      });
    }, SPAWN_INTERVAL_MS);
    return () => { clearInterval(id); clearTimeout(sid); };
  }, [started, gameOver, tick, currentIndex, questions.length]);

  const handleStart = () => {
    sharedPlayerY = CANVAS_H / 2;
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setCurrentIndex(0);
    setAnswers([]);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-20 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex items-center justify-between w-full max-w-[700px]">
        <h2 className="text-xl font-bold">🏃 Answer Runner</h2>
        <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-border"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        {/* Cubeforge canvas */}
        <Game width={CANVAS_W} height={CANVAS_H} gravity={0}>
          <World background="#0d0d2a">
            <Camera2D />

            {/* Player sprite */}
            <Entity id="player">
              <Transform x={PLAYER_X} y={CANVAS_H / 2} />
              <Sprite width={40} height={40} color="#4fc3f7" shape="roundedRect" borderRadius={8} />
              <Script update={playerScript} />
            </Entity>

            {/* Answer sprites — positions synced from React state */}
            {started && !gameOver && answers.map((a) => (
              <AnswerSprite key={a.id} answer={a} />
            ))}
          </World>
        </Game>

        {/* HTML overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
          {/* HUD */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/50 text-white text-sm font-medium">
            <span>⭐ {score}</span>
            <span className="text-xs max-w-[300px] truncate text-center">
              {currentQuestion?.text ?? currentQuestion?.name ?? ''}
            </span>
            <span>{'❤️'.repeat(Math.max(0, lives))}</span>
          </div>

          {/* Answer text labels overlaid on sprites */}
          {started && !gameOver && answers.map((a) => (
            <div
              key={a.id}
              className="absolute text-white text-xs font-semibold text-center"
              style={{ insetInlineStart: a.x - 64, top: a.y - 9, width: 128 }}
            >
              {a.text}
            </div>
          ))}

          {/* Idle */}
          {!started && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white pointer-events-auto">
              <p className="text-3xl">🏃</p>
              <p className="text-xl font-bold">Answer Runner</p>
              <p className="text-sm text-white/60">Use ↑ ↓ to move · collect ✅ dodge ❌</p>
              <Button onClick={handleStart} className="mt-2">Start!</Button>
            </div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white pointer-events-auto">
              <p className="text-4xl font-black">{lives <= 0 ? '💀' : '🏆'}</p>
              <p className="text-2xl font-bold">{lives <= 0 ? 'Game Over' : 'You finished!'}</p>
              <p className="text-lg text-yellow-400 font-bold">Score: {score}</p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 pointer-events-auto"
                  onClick={() => navigate('/games')}>
                  ← Back to Games
                </Button>
                <Button onClick={handleStart} className="pointer-events-auto">Play Again</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use ↑ ↓ arrow keys to move · green = correct · red = wrong
      </p>
    </div>
  );
}
