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

  /**
   * wrongFeedback — set to the correct answer text immediately after the player
   * picks a wrong lane. The quiz_gate overlay swaps the tiles for a "Wrong!
   * Correct answer was: ..." panel during the 1200ms freeze. Cleared when phase
   * transitions back to 'running'.
   */
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  // Clear feedback when the freeze ends and the game resumes.
  useEffect(() => {
    if (phase === 'running') setWrongFeedback(null);
  }, [phase]);

  /**
   * Wrapper around the hook's answerGate that:
   *  1. Guards against double-submission during the 1200ms wrong-answer freeze.
   *  2. Captures the correct answer text for the feedback panel before delegating.
   */
  function handleAnswerGate(laneIdx: 0 | 1 | 2) {
    if (wrongFeedback !== null) return; // already answered — ignore
    const chosen = answers[laneIdx];
    if (!chosen) return;
    if (!chosen.isCorrect) {
      const correct = answers.find((a) => a.isCorrect);
      setWrongFeedback(correct ? stripHtml(correct.text) : '—');
    }
    answerGate(laneIdx);
  }

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
          handleAnswerGate(highlightedLane);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, switchLane, answerGate, highlightedLane, wrongFeedback, answers]);

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

        {/* Game frame — canvas behind, HTML overlay in front.
            game-bezel applies the multi-layer dark-green arcade frame (see styles.css). */}
        <div
          className="relative rounded-2xl overflow-hidden bg-[#1a3a0a] game-bezel"
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
                {/* HUD — score (gold pixel font), streak badge, lives */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 text-white shrink-0 bg-black/40 border-b border-amber-900/30">
                  <span
                    className="tabular-nums text-[#ffd700] text-sm leading-none"
                    style={{ fontFamily: "'Press Start 2P', monospace" }}
                  >
                    {String(score).padStart(6, '0')}
                  </span>
                  <StreakFire streak={streak} visible={streakFire} />
                  <LivesBar lives={lives} maxLives={3} />
                </div>

                {/* Quiz gate overlay — question card + answer tiles (or wrong-answer feedback) */}
                {phase === 'quiz_gate' && currentQuestion && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Centred question card — always visible during quiz_gate */}
                    <div className="absolute inset-x-0 top-16 flex justify-center px-6">
                      <div className="pointer-events-auto bg-stone-900/95 border-2 border-amber-600/70 rounded-xl px-6 py-4 max-w-[420px] text-center shadow-2xl">
                        <p className="text-white text-base font-bold leading-snug">
                          {stripHtml(currentQuestion.text ?? currentQuestion.name ?? '')}
                        </p>
                      </div>
                    </div>

                    {wrongFeedback !== null ? (
                      /* Wrong-answer feedback panel — shown during the 1200ms freeze.
                         Replaces the tiles so kids see the correct answer before resuming. */
                      <div
                        className="absolute inset-x-0 flex flex-col items-center gap-3 pointer-events-none"
                        style={{ top: PLAYER_ROW_CSS - 80 }}
                      >
                        <p className="text-2xl font-black text-red-400 drop-shadow">✗ Wrong!</p>
                        <div className="bg-emerald-900/80 border-2 border-emerald-400/70 rounded-xl px-5 py-3 max-w-[340px] text-center shadow-xl">
                          <p className="text-emerald-300/70 text-xs font-medium mb-1">Correct answer</p>
                          <p className="text-emerald-200 text-base font-bold leading-snug">{wrongFeedback}</p>
                        </div>
                      </div>
                    ) : (
                      /* Answer tiles — absolutely positioned at lane x centres */
                      answers.slice(0, 3).map((answer, idx) => {
                        const laneIdx = idx as 0 | 1 | 2;
                        const isHighlighted = highlightedLane === laneIdx;
                        return (
                          <button
                            key={answer.id}
                            type="button"
                            aria-label={`Lane ${laneIdx + 1}: ${stripHtml(answer.text)}`}
                            onClick={() => handleAnswerGate(laneIdx)}
                            className={[
                              'pointer-events-auto absolute w-32 h-14 rounded-xl border-2',
                              'text-amber-100 text-sm font-bold flex items-center justify-center',
                              'px-3 text-center transition-all',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
                              isHighlighted
                                ? 'bg-amber-600 border-amber-200/90 shadow-lg shadow-amber-500/50 scale-105'
                                : 'bg-amber-900/85 border-amber-700/60 hover:bg-amber-800/90 hover:border-amber-600/80',
                            ].join(' ')}
                            style={{
                              // Clamp so tiles never clip the canvas edge.
                              // 132 = 128px tile width (w-32) + 4px margin.
                              insetInlineStart: Math.max(4, Math.min(canvasDims.w - 132, laneXPositions[laneIdx] - 64)),
                              top: PLAYER_ROW_CSS - 56,
                            }}
                          >
                            {stripHtml(answer.text)}
                          </button>
                        );
                      })
                    )}
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
                className="pointer-events-auto bg-amber-900/70 hover:bg-amber-800/85 active:bg-amber-700/90 border-2 border-amber-600/50 text-amber-200 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors"
                onClick={() => switchLane(-1)}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Move right"
                className="pointer-events-auto bg-amber-900/70 hover:bg-amber-800/85 active:bg-amber-700/90 border-2 border-amber-600/50 text-amber-200 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors"
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
