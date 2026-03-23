/**
 * PixelDash — lane-switching endless runner.
 *
 * Architecture: Cubeforge canvas renders all visual entities (track stripes,
 * player, gate bar, obstacles, coins). A bridge module holds mutable vars
 * shared between ECS Scripts and the React tick. All game state lives in
 * usePixelDashLogic. This component owns layout, keyboard navigation, and
 * the HTML overlay (HUD + quiz-gate answer tiles).
 *
 * Phase machine: running → quiz_gate → running (loop) | results (lives === 0).
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@item-bank/ui';
import { stripHtml } from '../../domain/extractAnswers';
import FoxMascot, { FOX_LINES } from '../../components/FoxMascot';
import HowToPlaySidebar from '../../components/HowToPlaySidebar';
import CoinBurst from '../../components/CoinBurst';
import ScorePopup from '../../components/ScorePopup';
import StreakFire from '../../components/StreakFire';
import LivesBar from '../../components/LivesBar';
import PixelDashCanvas from './PixelDashCanvas';
import PixelDashResults from './PixelDashResults';
import { usePixelDashLogic, PLAYER_ROW_CSS } from './hooks/usePixelDashLogic';

// ─── Constants ────────────────────────────────────────────────────────────────


const DASH_RULES = [
  'Use ← → arrow keys (or swipe) to switch between 3 lanes',
  'Dodge falling obstacles to avoid losing a life',
  'Collect coins for +10 points each',
  'When a gate sweeps down, steer into the correct answer lane',
  'Correct gate answer: +50 points, track speeds up',
  'Wrong answer or obstacle collision costs 1 life — 3 lives total',
  '3 consecutive correct gates activates a score-doubling streak',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PixelDash() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const {
    phase,
    gameKey,
    gateKey,
    score,
    lives,
    streak,
    gatesCleared,
    coinsCollected,
    maxStreak,
    distancePx,
    totalGatesReached,
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
  } = usePixelDashLogic({ tag_ids, item_bank_id });

  // ── Quiz gate keyboard navigation ─────────────────────────────────────────
  // highlightedLane: the answer tile currently focused by keyboard arrows.
  const [highlightedLane, setHighlightedLane] = useState<0 | 1 | 2>(1);

  // Snap highlight to the player's current lane when the gate overlay appears.
  useEffect(() => {
    if (phase === 'quiz_gate') {
      setHighlightedLane(currentLane);
    }
  }, [phase, currentLane]);

  // Global keydown: move player during running, navigate tiles during quiz_gate.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (phase === 'running') {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); switchLane(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); switchLane(1); }
      }
      if (phase === 'quiz_gate') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setHighlightedLane((l) => (Math.max(0, l - 1) as 0 | 1 | 2));
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setHighlightedLane((l) => (Math.min(2, l + 1) as 0 | 1 | 2));
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          answerGate(highlightedLane);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, switchLane, answerGate, highlightedLane]);

  // ── Swipe gesture ─────────────────────────────────────────────────────────
  useEffect(() => {
    let touchStartX = 0;
    function onTouchStart(e: TouchEvent) { touchStartX = e.touches[0].clientX; }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) switchLane(dx < 0 ? -1 : 1);
    }
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [switchLane]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isIdle = gameKey === 0;

  return (
    <div className="flex w-full">
      {/* How to Play sidebar — desktop only */}
      <HowToPlaySidebar rules={DASH_RULES} />

      {/* Game column — flex-1 centres the canvas in the remaining space */}
      <div className="flex flex-col flex-1 items-center gap-4 pt-6 pb-6 min-w-0">
        <div
          className="flex items-center justify-between shrink-0"
          style={{ width: canvasDims.w }}
        >
          <h2 className="text-xl font-bold">Pixel Dash</h2>
          <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
        </div>

        {/* Game frame — canvas behind, HTML overlay in front */}
        <div
          className="relative rounded-xl overflow-hidden border border-border bg-[#0d0d2a]"
          style={{ width: canvasDims.w, height: canvasDims.h }}
        >
          {/* Wrong-answer screen flash — key remount re-triggers CSS animation */}
          {screenFlash > 0 && (
            <div
              key={screenFlash}
              className="absolute inset-0 z-[15] pointer-events-none [animation:screen-flash_300ms_ease-out_forwards]"
            />
          )}

          {/* Cubeforge canvas — all entity visuals */}
          <div className="absolute inset-0">
            <PixelDashCanvas
              width={canvasDims.w}
              height={canvasDims.h}
              gameKey={gameKey}
              gateKey={gateKey}
              activeObstacles={activeObstacles}
              activeCoins={activeCoins}
              streakFire={streakFire}
            />
          </div>

          {/* HTML overlay — interactive layer */}
          <div className="absolute inset-0 z-10 flex flex-col">

            {/* ── Idle screen ──────────────────────────────────────────── */}
            {isIdle && (
              <div className="flex flex-col items-center justify-center flex-1 gap-5 text-white p-6">
                <FoxMascot line={FOX_LINES.pixel_dash_idle} />
                <p className="text-xl font-bold">Pixel Dash</p>
                <p className="text-sm text-white/60">
                  Dodge obstacles · collect coins · answer gate questions
                </p>
                <Button onClick={startGame} className="mt-1">Start Game</Button>
              </div>
            )}

            {/* ── Active game (running / quiz_gate) ────────────────────── */}
            {!isIdle && phase !== 'results' && (
              <>
                {/* HUD — score, streak badge, lives */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 text-white shrink-0">
                  <span className="text-lg font-black tabular-nums">{score}</span>
                  <StreakFire streak={streak} visible={streakFire} />
                  <LivesBar lives={lives} maxLives={3} />
                </div>

                {/* Quiz gate overlay — question card + 3 answer tiles */}
                {phase === 'quiz_gate' && currentQuestion && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Centred question card */}
                    <div className="absolute inset-x-0 top-16 flex justify-center px-6">
                      <div className="pointer-events-auto bg-[#1e1b4b]/90 border border-indigo-500/60 rounded-xl px-6 py-4 max-w-[400px] text-center shadow-xl">
                        <p className="text-white text-base font-semibold leading-snug">
                          {stripHtml(currentQuestion.text ?? currentQuestion.name ?? '')}
                        </p>
                      </div>
                    </div>

                    {/* Answer tiles — absolutely positioned at lane x centres */}
                    {answers.slice(0, 3).map((answer, idx) => {
                      const laneIdx = idx as 0 | 1 | 2;
                      const isHighlighted = highlightedLane === laneIdx;
                      return (
                        <button
                          key={answer.id}
                          type="button"
                          aria-label={`Lane ${laneIdx + 1}: ${stripHtml(answer.text)}`}
                          onClick={() => answerGate(laneIdx)}
                          className={[
                            'pointer-events-auto absolute w-28 h-12 rounded-lg border',
                            'text-white text-xs font-semibold flex items-center justify-center',
                            'px-2 text-center transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                            isHighlighted
                              ? 'bg-indigo-500 border-2 border-white/80 shadow-lg scale-105'
                              : 'bg-indigo-700/80 border-indigo-500/50 hover:bg-indigo-600/80',
                          ].join(' ')}
                          style={{
                            // Clamp so tiles never clip the canvas edge on narrow mobile canvases.
                            // 116 = 112px tile width (w-28) + 4px end margin.
                            insetInlineStart: Math.max(4, Math.min(canvasDims.w - 116, laneXPositions[laneIdx] - 56)),
                            top: PLAYER_ROW_CSS - 48,
                          }}
                        >
                          {stripHtml(answer.text)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Results screen ───────────────────────────────────────── */}
            {phase === 'results' && (
              <PixelDashResults
                score={score}
                gatesCleared={gatesCleared}
                coinsCollected={coinsCollected}
                maxStreak={maxStreak}
                distancePx={distancePx}
                totalGatesReached={totalGatesReached}
                item_bank_id={item_bank_id}
                onPlayAgain={startGame}
                onBack={() => navigate('/games')}
              />
            )}

          </div>

          {/* CoinBurst — gold coin explosion on correct gate */}
          {showCoinBurst && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              <CoinBurst
                x={laneXPositions[1] - 4}
                y={PLAYER_ROW_CSS - 30}
                onDone={() => {/* hook self-resets after 800ms */}}
              />
            </div>
          )}

          {/* ScorePopup — "+50" floating label on correct gate */}
          {showScorePopup && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              <ScorePopup
                value={50}
                x={laneXPositions[1]}
                y={PLAYER_ROW_CSS - 60}
                onDone={() => {/* hook self-resets after 800ms */}}
              />
            </div>
          )}

          {/* Mobile lane controls — visible only during running phase */}
          {!isIdle && phase === 'running' && (
            <div className="absolute bottom-4 inset-x-0 z-20 flex justify-between px-8 pointer-events-none">
              <button
                type="button"
                aria-label="Move left"
                className="pointer-events-auto bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors"
                onClick={() => switchLane(-1)}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Move right"
                className="pointer-events-auto bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors"
                onClick={() => switchLane(1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right spacer — mirrors sidebar width so canvas centres on full page */}
      <div className="hidden lg:block w-64 shrink-0" />
    </div>
  );
}
