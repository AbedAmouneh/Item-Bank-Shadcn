/**
 * StackAttack — block-stacking game where answer timing determines block placement.
 *
 * Architecture:
 *  - useStackLogic owns all game state and the rAF swing animation.
 *  - StackAttackCanvas renders the 700×480 game frame visuals (tower + blocks + HUD).
 *  - This component owns layout (sidebar, question card, answer buttons), keyboard
 *    navigation, and top-level phase routing (idle / results overlays).
 *
 * Phase machine: idle → swinging → answer_reveal → swinging (loop) | results
 *
 * Layout (vertical flex column in the centre panel):
 *   [title bar]
 *   [question card]     ← above canvas, shown during swinging / answer_reveal
 *   [canvas]            ← StackAttackCanvas + results overlay + idle overlay
 *   [answer buttons]    ← below canvas, shown during swinging / answer_reveal
 *   [fox mascot strip]
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@item-bank/ui';
import { stripHtml } from '../../domain/extractAnswers';
import FoxMascot, { FOX_LINES, pickLine } from '../../components/FoxMascot';
import HowToPlaySidebar from '../../components/HowToPlaySidebar';
import CoinBurst from '../../components/CoinBurst';
import ScorePopup from '../../components/ScorePopup';
import StackAttackCanvas from './StackAttackCanvas';
import StackAttackResults from './StackAttackResults';
import { useStackLogic } from './hooks/useStackLogic';

// ─── Constants ────────────────────────────────────────────────────────────────

const STACK_RULES = [
  'Answer questions to stack blocks on your tower',
  'Click an answer button when the swinging block is above its target',
  'Landing within 24px of centre = PERFECT! → golden block',
  '3 correct answers in a row activates Streak Fire 🔥',
  'Wrong answer costs 1 life — you have 3 total',
  'The block swings faster every 3 correct answers',
  'Lose all 3 lives and the tower topples!',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StackAttack() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const {
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
  } = useStackLogic({ tag_ids, item_bank_id });

  // ── Fox mascot dialogue ────────────────────────────────────────────────────
  const [foxLine, setFoxLine] = useState<string>(FOX_LINES.stack_idle);

  useEffect(() => {
    if (phase === 'idle') setFoxLine(FOX_LINES.stack_idle);
    if (phase === 'swinging') setFoxLine(FOX_LINES.stack_playing);
  }, [phase]);

  /**
   * wrongFeedback — set to the correct answer text when the player picks wrong.
   * Shown during the ~570ms answer_reveal freeze so kids learn before continuing.
   * Cleared when phase returns to 'swinging'.
   */
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  // Use a ref so the keyboard handler closure always reads the current value.
  const wrongFeedbackRef = useRef<string | null>(null);
  wrongFeedbackRef.current = wrongFeedback;

  useEffect(() => {
    if (phase === 'swinging') setWrongFeedback(null);
  }, [phase]);

  // ── Keyboard: Players use number keys 1–4 to pick an answer by index.
  // Guard: ignore key presses while wrongFeedback panel is showing (answer_reveal).
  useEffect(() => {
    if (phase !== 'swinging') return;

    function handleKey(e: KeyboardEvent) {
      // Ignore if the wrong-feedback panel is already open.
      if (wrongFeedbackRef.current !== null) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1 && currentAnswers[idx]) {
        e.preventDefault();
        const chosen = currentAnswers[idx];
        setFoxLine(
          chosen.isCorrect
            ? pickLine(FOX_LINES.stack_correct)
            : pickLine(FOX_LINES.stack_wrong),
        );
        if (!chosen.isCorrect) {
          const correct = currentAnswers.find((a) => a.isCorrect);
          setWrongFeedback(correct ? correct.text : '—');
        }
        submitAnswer(chosen.isCorrect);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, currentAnswers, submitAnswer]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isIdle = phase === 'idle';
  const isActive = phase === 'swinging' || phase === 'answer_reveal';
  const answersDisabled = phase === 'answer_reveal';

  // CoinBurst / ScorePopup anchor: near the tower top centre
  const burstX = canvasDims.w / 2;
  const burstY = towerTargetTop - 20;

  return (
    <div className="flex w-full">
      {/* How to Play sidebar — desktop only */}
      <HowToPlaySidebar rules={STACK_RULES} />

      {/* Game column */}
      <div className="flex flex-col flex-1 items-center gap-3 pt-6 pb-6 min-w-0">

        {/* Title bar */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ width: canvasDims.w }}
        >
          <h2 className="text-xl font-bold">Stack Attack</h2>
          <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
        </div>

        {/* ── Question card — above canvas ──────────────────────────────── */}
        {isActive && currentQuestion && (
          <div
            className="shrink-0 rounded-xl border-2 border-amber-600/70 bg-stone-900/95 px-5 py-3 text-center shadow-lg"
            style={{ width: canvasDims.w }}
          >
            <p className="text-white text-sm font-semibold leading-snug">
              {stripHtml(currentQuestion.text ?? currentQuestion.name ?? '')}
            </p>
          </div>
        )}

        {/* ── Game canvas frame ─────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl overflow-hidden bg-[#1a3a0a] game-bezel shrink-0"
          style={{ width: canvasDims.w, height: canvasDims.h }}
        >
          {/* Screen flash — wrong-answer red overlay (key remount re-triggers animation) */}
          {screenFlash > 0 && (
            <div
              key={screenFlash}
              className="absolute inset-0 z-[15] pointer-events-none [animation:screen-flash_300ms_ease-out_forwards]"
            />
          )}

          {/* Game visuals — tower, swinging block, HUD, effects */}
          {isActive && (
            <StackAttackCanvas
              phase={phase}
              tower={tower}
              droppingBlock={droppingBlock}
              swingBlockRef={swingBlockRef}
              towerTargetTop={towerTargetTop}
              swingY={swingY}
              cameraOffsetY={cameraOffsetY}
              score={score}
              lives={lives}
              streak={streak}
              streakVisible={streakVisible}
              canvasW={canvasDims.w}
              canvasH={canvasDims.h}
            />
          )}

          {/* CoinBurst — golden-block particle explosion at z-30 */}
          {showCoinBurst && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              <CoinBurst
                x={burstX}
                y={burstY}
                onDone={() => {/* hook self-resets after 800ms */}}
              />
            </div>
          )}

          {/* ScorePopup — +40 floating label at z-30 */}
          {showScorePopup && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              <ScorePopup
                value={40}
                label={scorePopupLabel}
                x={burstX}
                y={burstY - 30}
                onDone={() => {/* hook self-resets after 900ms */}}
              />
            </div>
          )}

          {/* ── Idle overlay ──────────────────────────────────────────────── */}
          {isIdle && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 text-white p-6">
              <FoxMascot line={foxLine} />
              <p className="text-xl font-bold">Stack Attack</p>
              <p className="text-sm text-white/60 text-center max-w-xs">
                Answer questions to stack blocks. Time your click for a PERFECT! landing.
              </p>
              <Button onClick={startGame} className="mt-1 bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-lg shadow-amber-900/50">
                Start Game
              </Button>
            </div>
          )}

          {/* ── Results overlay ───────────────────────────────────────────── */}
          {phase === 'results' && (
            <div className="absolute inset-0 z-10">
              <StackAttackResults
                score={score}
                towerHeight={tower.length}
                goldenBlocks={goldenBlocks}
                maxStreak={maxStreak}
                wrongCount={wrongCount}
                correctCount={correctCount}
                item_bank_id={item_bank_id}
                onPlayAgain={startGame}
                onBack={() => navigate('/games')}
              />
            </div>
          )}
        </div>

        {/* ── Answer buttons / wrong-feedback panel — below canvas ──────── */}
        {isActive && (
          answersDisabled && wrongFeedback !== null ? (
            /* Wrong-answer feedback panel: shown during answer_reveal freeze */
            <div
              className="flex flex-col items-center justify-center gap-3 shrink-0 py-2"
              style={{ width: canvasDims.w }}
            >
              <p className="text-2xl font-black text-red-400 drop-shadow">✗ Wrong!</p>
              <div className="bg-emerald-900/80 border-2 border-emerald-400/70 rounded-xl px-6 py-3 text-center">
                <p className="text-emerald-300/70 text-xs font-medium mb-1 uppercase tracking-wide">
                  Correct answer
                </p>
                <p className="text-emerald-200 text-base font-bold">{wrongFeedback}</p>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-wrap justify-center gap-2 shrink-0"
              style={{ maxWidth: canvasDims.w }}
            >
              {currentAnswers.map((answer, idx) => (
                <button
                  key={answer.id}
                  type="button"
                  disabled={answersDisabled}
                  aria-label={`Answer ${idx + 1}: ${answer.text}`}
                  onClick={() => {
                    setFoxLine(
                      answer.isCorrect
                        ? pickLine(FOX_LINES.stack_correct)
                        : pickLine(FOX_LINES.stack_wrong),
                    );
                    if (!answer.isCorrect) {
                      const correct = currentAnswers.find((a) => a.isCorrect);
                      setWrongFeedback(correct ? correct.text : '—');
                    }
                    submitAnswer(answer.isCorrect);
                  }}
                  className={[
                    'flex-1 min-w-[130px] max-w-[190px] rounded-xl border-2 px-3 py-4',
                    'text-amber-100 text-base font-semibold text-center leading-tight',
                    'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
                    answersDisabled
                      ? 'opacity-40 cursor-not-allowed bg-amber-900/50 border-amber-700/30'
                      : 'bg-amber-900/85 border-amber-700/60 hover:bg-amber-800/90 hover:border-amber-600/80 active:scale-95',
                  ].join(' ')}
                >
                  <span className="block text-[10px] font-bold text-amber-400/70 mb-0.5 uppercase tracking-wide">
                    {idx + 1}
                  </span>
                  {answer.text}
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Fox mascot strip — below buttons (active phases only) ─────── */}
        {/* isIdle is excluded: the idle overlay already renders FoxMascot inside the canvas */}
        {isActive && (
          <div className="flex justify-start shrink-0" style={{ width: canvasDims.w }}>
            <FoxMascot line={foxLine} />
          </div>
        )}
      </div>

      {/* Right spacer — mirrors sidebar width so canvas centres on full page */}
      <div className="hidden lg:block w-64 shrink-0" />
    </div>
  );
}
