/**
 * MeteorCatcher — asteroid dodging game where players steer a ship to catch
 * meteors labelled with the correct answer.
 *
 * Architecture:
 *  - useMeteorLogic owns all game state and the rAF movement loop.
 *  - MeteorCatcherCanvas renders the 700×480 Cubeforge star-field backdrop.
 *  - This component owns the HTML overlay (ship, meteors, question pill, HUD,
 *    boss section, feedback widgets) and keyboard / touch input.
 *
 * Phase machine: idle → playing → boss → playing (loop) | results
 *
 * Layout (vertical flex column in the centre panel):
 *   [title bar]
 *   [question pill]        ← above canvas, shows the current question
 *   [canvas]               ← star-field backdrop + all HTML overlay visuals
 *   [controls strip]       ← ← → buttons for mobile + boss answer buttons
 *   [fox mascot strip]
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@item-bank/ui';
import { stripHtml } from '../../domain/extractAnswers';
import FoxMascot, { FOX_LINES, pickLine } from '../../components/FoxMascot';
import CoinBurst from '../../components/CoinBurst';
import ScorePopup from '../../components/ScorePopup';
import LivesBar from '../../components/LivesBar';
import StreakFire from '../../components/StreakFire';
import MeteorCatcherCanvas from './MeteorCatcherCanvas';
import MeteorCatcherResults from './MeteorCatcherResults';
import { useMeteorLogic, METEOR_SIZE, BOSS_SIZE, setShipKeyLeft, setShipKeyRight } from './hooks/useMeteorLogic';

// ─── Constants ────────────────────────────────────────────────────────────────

const RULES = [
  'Steer your ship with ← → keys (or the on-screen buttons)',
  'Catch the meteor labelled with the correct answer',
  'Dodge wrong-answer meteors — catching one costs a life',
  'All meteors passing off-screen = no life lost, but zero score',
  '3 catches in a row activates Streak Fire 🔥 for bonus points',
  'Every 5 correct catches summons a Boss Meteor!',
  'Boss needs 2 correct hits — answer via buttons then steer under it',
  'You have 3 lives — lose them all and it\'s game over',
];

/** Pixel-octagon clip-path used for all answer meteor divs. */
const OCTAGON_CLIP =
  'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

/** Triangular notch carved into the top of the ship, giving it a cockpit silhouette. */
const SHIP_CLIP =
  'polygon(0% 35%, 37% 35%, 50% 0%, 63% 35%, 100% 35%, 100% 100%, 0% 100%)';

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeteorCatcher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const {
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
  } = useMeteorLogic({ tag_ids, item_bank_id });

  // ── Fox mascot dialogue ────────────────────────────────────────────────────
  const [foxLine, setFoxLine] = useState<string>(FOX_LINES.meteor_idle);

  useEffect(() => {
    if (phase === 'idle')    setFoxLine(FOX_LINES.meteor_idle);
    if (phase === 'playing') setFoxLine(FOX_LINES.meteor_playing);
    if (phase === 'boss')    setFoxLine(pickLine(FOX_LINES.meteor_correct));
  }, [phase]);

  // ── Boss answer keyboard (1/2/3 during boss phase) ─────────────────────────
  // Guard ref prevents answering twice during the processing delay.
  const bossAnsweringRef = useRef(false);

  useEffect(() => {
    if (phase !== 'boss') {
      bossAnsweringRef.current = false;
      return;
    }

    function handleKey(e: KeyboardEvent) {
      if (bossAnsweringRef.current) return;
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx !== -1 && currentAnswers[idx]) {
        e.preventDefault();
        bossAnsweringRef.current = true;
        const answer = currentAnswers[idx];
        setFoxLine(
          answer.isCorrect
            ? pickLine(FOX_LINES.meteor_correct)
            : pickLine(FOX_LINES.meteor_wrong),
        );
        submitBossAnswer(answer.isCorrect);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, currentAnswers, submitBossAnswer]);

  // Reset boss answer guard when phase transitions away from boss.
  useEffect(() => {
    if (phase !== 'boss') bossAnsweringRef.current = false;
  }, [phase]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isIdle    = phase === 'idle';
  const isPlaying = phase === 'playing';
  const isBoss    = phase === 'boss';
  const isResults = phase === 'results';
  const isActive  = isPlaying || isBoss;

  const { w, h } = canvasDims;

  return (
    <div className="flex w-full">
      {/* How-to-play sidebar — desktop only */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 ps-4 pt-6 gap-2 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">How to play</p>
        {RULES.map((rule, i) => (
          <p key={i} className="leading-snug">
            <span className="text-primary font-bold me-1">{i + 1}.</span>
            {rule}
          </p>
        ))}
      </div>

      {/* Game column */}
      <div className="flex flex-col flex-1 items-center gap-3 pt-6 pb-6 min-w-0">

        {/* Title bar */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ width: w }}
        >
          <h2 className="text-xl font-bold">Meteor Catcher</h2>
          <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
        </div>

        {/* ── Question pill — above canvas ───────────────────────────────── */}
        {isActive && currentQuestion && (
          <div
            className="shrink-0 rounded-full border-2 border-sky-400/70 bg-sky-950/90 px-6 py-2 text-center shadow-lg"
            style={{ width: w }}
          >
            <p className="text-white text-sm font-semibold leading-snug">
              {stripHtml(currentQuestion.text ?? (currentQuestion as { name?: string }).name ?? '')}
            </p>
            {isBoss && (
              <p className="text-sky-300 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {bossHealth === 2 ? 'Boss — Part 1' : 'Boss — Part 2'}
              </p>
            )}
          </div>
        )}

        {/* ── Game canvas frame ──────────────────────────────────────────── */}
        <div
          className="relative rounded-xl overflow-hidden border border-border shrink-0"
          style={{ width: w, height: h, background: '#060618' }}
        >
          {/* Cubeforge star-field backdrop */}
          <MeteorCatcherCanvas width={w} height={h} gameKey={gameKey} />

          {/* Wrong-answer red screen flash — key remount retriggers animation */}
          {screenFlash > 0 && (
            <div
              key={screenFlash}
              className="absolute inset-0 z-[15] pointer-events-none [animation:screen-flash_300ms_ease-out_forwards]"
            />
          )}

          {/* ── HTML overlay: all dynamic game elements ────────────────── */}
          {isActive && (
            <div className="absolute inset-0 pointer-events-none">

              {/* HUD strip */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 pb-2 text-white">
                <span className="text-lg font-black tabular-nums text-yellow-400">⭐ {score}</span>
                <StreakFire streak={streak} visible={streakVisible} />
                <LivesBar lives={lives} maxLives={3} />
              </div>

              {/* ── Answer meteors (playing phase) ──────────────────────── */}
              {isPlaying && meteors.map((meteor, i) => {
                const isFlashing = flashMeteorId === meteor.id;
                return (
                  <div
                    key={meteor.id}
                    ref={(el) => { meteorDivRefs.current[i] = el; }}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -METEOR_SIZE,
                      insetInlineStart: Math.round(meteor.centerX - METEOR_SIZE / 2),
                      width: METEOR_SIZE,
                      height: METEOR_SIZE,
                      clipPath: OCTAGON_CLIP,
                      background: isFlashing
                        ? '#ef4444'
                        : 'linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 60%, #38bdf8 100%)',
                      boxShadow: isFlashing
                        ? '0 0 16px rgba(239,68,68,0.8)'
                        : '0 0 12px rgba(56,189,248,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: isFlashing ? 'meteor-flash 450ms ease-out forwards' : undefined,
                    }}
                  >
                    <span
                      className="text-white text-[11px] font-bold text-center leading-tight px-1 select-none"
                      style={{ clipPath: 'none' }}
                    >
                      {meteor.text}
                    </span>
                  </div>
                );
              })}

              {/* ── Boss meteor (boss phase) ─────────────────────────────── */}
              {isBoss && (
                <>
                  {/* Boss health bar — 2 pixel segments */}
                  <div className="absolute top-10 inset-x-0 flex justify-center gap-1 px-4">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-red-400 text-xs font-bold uppercase tracking-wide me-1">BOSS</span>
                      {[0, 1].map((seg) => (
                        <div
                          key={seg}
                          className="h-3 w-16 rounded-sm border border-red-500/50 transition-colors duration-300"
                          style={{
                            background: seg < bossHealth ? '#dc2626' : 'rgba(220,38,38,0.15)',
                            boxShadow: seg < bossHealth ? '0 0 8px rgba(220,38,38,0.6)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Boss meteor div */}
                  <div
                    ref={bossDivRef}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -BOSS_SIZE,
                      insetInlineStart: Math.round(w / 2 - BOSS_SIZE / 2),
                      width: BOSS_SIZE,
                      height: BOSS_SIZE,
                      clipPath: OCTAGON_CLIP,
                      background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
                      boxShadow: '0 0 24px rgba(220,38,38,0.7), 0 0 48px rgba(220,38,38,0.3)',
                      filter: bossCracked ? 'brightness(0.55) saturate(0.6)' : undefined,
                      opacity: bossExploding ? 0 : 1,
                      transition: 'opacity 0.3s, filter 0.4s',
                    }}
                  />
                </>
              )}

              {/* ── Player spaceship ─────────────────────────────────────── */}
              <div
                ref={shipDivRef}
                aria-label="Player ship"
                style={{
                  position: 'absolute',
                  top: shipY,
                  // Initial x is set here; the rAF loop overrides it each frame.
                  insetInlineStart: Math.round(w / 2 - 26),
                  width: 52,
                  height: 28,
                  background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 50%, #0284c7 100%)',
                  clipPath: SHIP_CLIP,
                  boxShadow: '0 0 16px rgba(56,189,248,0.6), 0 2px 8px rgba(0,0,0,0.5)',
                }}
              />

              {/* CoinBurst — particle explosion at catch/boss defeat position */}
              {showCoinBurst && (
                <CoinBurst
                  x={showCoinBurst.x}
                  y={showCoinBurst.y}
                  onDone={() => {/* hook self-resets via setTimeout */}}
                />
              )}

              {/* ScorePopup — floating "+N ✨" label */}
              {showScorePopup && (
                <ScorePopup
                  value={showScorePopup.value}
                  label={showScorePopup.label}
                  x={showScorePopup.x}
                  y={showScorePopup.y}
                  onDone={() => {/* hook self-resets via setTimeout */}}
                />
              )}
            </div>
          )}

          {/* ── Idle overlay ───────────────────────────────────────────── */}
          {isIdle && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 text-white p-6">
              <p className="text-5xl select-none">☄️</p>
              <FoxMascot line={foxLine} />
              <p className="text-xl font-bold">Meteor Catcher</p>
              <p className="text-sm text-white/60 text-center max-w-xs">
                Steer your ship to catch meteors labelled with the correct answer.
                Dodge the wrong ones!
              </p>
              <Button onClick={startGame} className="mt-1">Start Game</Button>
            </div>
          )}

          {/* ── Results overlay ─────────────────────────────────────────── */}
          {isResults && (
            <div className="absolute inset-0 z-10 bg-[#060618]/95">
              <MeteorCatcherResults
                score={score}
                catches={catchCount}
                bossesDefeated={bossesDefeated}
                maxStreak={maxStreak}
                wrongHits={wrongHits}
                item_bank_id={item_bank_id}
                onPlayAgain={startGame}
                onBack={() => navigate('/games')}
              />
            </div>
          )}
        </div>

        {/* ── Controls strip — below canvas ─────────────────────────────── */}
        {isActive && (
          <div
            className="flex items-center justify-between shrink-0 gap-3"
            style={{ width: w }}
          >
            {/* Mobile steering buttons — hold to move, release to stop */}
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Move ship left"
                onPointerDown={() => setShipKeyLeft(true)}
                onPointerUp={() => setShipKeyLeft(false)}
                onPointerLeave={() => setShipKeyLeft(false)}
                className="w-12 h-12 rounded-xl bg-sky-700/60 border border-sky-500/40 flex items-center justify-center text-white text-xl font-bold hover:bg-sky-600/70 active:scale-95 select-none touch-none"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Move ship right"
                onPointerDown={() => setShipKeyRight(true)}
                onPointerUp={() => setShipKeyRight(false)}
                onPointerLeave={() => setShipKeyRight(false)}
                className="w-12 h-12 rounded-xl bg-sky-700/60 border border-sky-500/40 flex items-center justify-center text-white text-xl font-bold hover:bg-sky-600/70 active:scale-95 select-none touch-none"
              >
                →
              </button>
            </div>

            {/* Boss answer buttons (boss phase only) */}
            {isBoss && (
              <div className="flex flex-wrap justify-end gap-2 flex-1 max-w-[460px]">
                {currentAnswers.map((answer, idx) => (
                  <button
                    key={answer.id}
                    type="button"
                    aria-label={`Answer ${idx + 1}: ${answer.text}`}
                    onClick={() => {
                      if (bossAnsweringRef.current) return;
                      bossAnsweringRef.current = true;
                      setFoxLine(
                        answer.isCorrect
                          ? pickLine(FOX_LINES.meteor_correct)
                          : pickLine(FOX_LINES.meteor_wrong),
                      );
                      submitBossAnswer(answer.isCorrect);
                    }}
                    className="flex-1 min-w-[120px] max-w-[180px] rounded-xl border-2 px-3 py-3 text-white text-sm font-semibold text-center leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 bg-red-900/60 border-red-500/50 hover:bg-red-800/70 hover:border-red-400 active:scale-95"
                  >
                    <span className="block text-[10px] font-bold text-red-300/70 mb-0.5 uppercase tracking-wide">
                      {idx + 1}
                    </span>
                    {answer.text}
                  </button>
                ))}
              </div>
            )}

            {/* Spacer when not in boss phase so the ← → buttons stay at the start */}
            {isPlaying && <div className="flex-1" />}
          </div>
        )}

        {/* ── Fox mascot strip — below controls ─────────────────────────── */}
        {isActive && (
          <div className="flex justify-start shrink-0" style={{ width: w }}>
            <FoxMascot line={foxLine} />
          </div>
        )}
      </div>

      {/* Right spacer — mirrors sidebar width to keep canvas centred */}
      <div className="hidden lg:block w-64 shrink-0" />
    </div>
  );
}
