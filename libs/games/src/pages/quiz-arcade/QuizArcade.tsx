/**
 * QuizArcade — timed multiple-choice quiz powered by Cubeforge.
 *
 * Architecture: HTML overlay (question + answers + HUD) sits on top of
 * a Cubeforge canvas that renders only the visual effects (particle bursts,
 * camera shake, timer bar). The game logic is a React state machine that
 * cycles through: idle → countdown → question → answer_reveal → results.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Question } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import { useGameQuestions } from '../../domain/hooks';
import { extractAnswers } from '../../domain/extractAnswers';
import type { GameScreen, GameResult, GameAnswer } from '../../domain/types';
import QuizCanvas from './QuizCanvas';
import QuizHud from './QuizHud';
import QuizQuestionDisplay from './QuizQuestionDisplay';
import QuizAnswerGrid from './QuizAnswerGrid';
import QuizResults from './QuizResults';

const CANVAS_W = 700;
const CANVAS_H = 480;
const QUESTION_TIME = 15; // seconds per question
const REVEAL_DELAY = 1500; // ms to show correct/wrong before advancing

// ─── Scoring ─────────────────────────────────────────────────────────────────

function calcScore(timeLeft: number, streak: number): number {
  const base = 10;
  const speedBonus = Math.round((timeLeft / QUESTION_TIME) * 90);
  const multiplier = streak >= 3 ? 2 : 1;
  return (base + speedBonus) * multiplier;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuizArcade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const questionType = searchParams.get('type') ?? 'multiple_choice';
  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const { data, isLoading, isError } = useGameQuestions({
    type: questionType,
    tag_ids,
    item_bank_id,
  });

  // Questions that have at least one extractable answer — used for the
  // idle screen count and to seed each shuffle.
  const allQuestions = useMemo(
    () => (data?.items ?? []).filter((q) => extractAnswers(q).length > 0),
    [data],
  );

  // ── State ────────────────────────────────────────────────────────────────

  const [screen, setScreen] = useState<GameScreen>('idle');
  // Shuffled copy populated (and reshuffled) by startGame each time.
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  // Starts at 3, counts down to -1. When < 0 the game begins.
  const [countdown, setCountdown] = useState(3);
  const [showBurst, setShowBurst] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);

  // Ref forwarded to answer button A so we can focus it on every new question.
  const firstAnswerRef = useRef<HTMLButtonElement>(null);

  const currentQuestion = gameQuestions[currentIndex];
  const answers: GameAnswer[] = useMemo(
    () => (currentQuestion ? extractAnswers(currentQuestion) : []),
    [currentQuestion],
  );

  // ── Countdown timer ───────────────────────────────────────────────────────
  // countdown 3 → 2 → 1 → 0 (shows "GO!") → -1 → start question.
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (countdown < 0) { setScreen('question'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, countdown]);

  // ── Advance to next question ──────────────────────────────────────────────
  const advance = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= gameQuestions.length) {
      setScreen('results');
    } else {
      setCurrentIndex(next);
      setSelected(null);
      setTimeLeft(QUESTION_TIME);
      setScreen('question');
    }
  }, [currentIndex, gameQuestions.length]);

  // ── Time-up handler ───────────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    setSelected('__timeout__');
    setScreen('answer_reveal');
    setStreak(0);
    setShouldShake(true);
    setTimeout(advance, REVEAL_DELAY);
  }, [advance]);

  // ── Question timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'question') return;
    if (timeLeft <= 0) { handleTimeUp(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft, handleTimeUp]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    // Reshuffle questions on every new session including Play Again.
    setGameQuestions([...allQuestions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setSelected(null);
    setCountdown(3);
    setResult(null);
    setScreen('countdown');
  }, [allQuestions]);

  const handleAnswer = (answerId: string) => {
    if (screen !== 'question' || selected !== null) return;
    setSelected(answerId);
    setScreen('answer_reveal');

    const isCorrect = answers.find((a) => a.id === answerId)?.isCorrect ?? false;
    if (isCorrect) {
      const earned = calcScore(timeLeft, streak);
      setScore((s) => s + earned);
      setCorrect((c) => c + 1);
      setStreak((k) => k + 1);
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1200);
    } else {
      setStreak(0);
      setShouldShake(true);
    }

    setTimeout(advance, REVEAL_DELAY);
  };

  useEffect(() => {
    if (screen === 'results' && result === null) {
      setResult({ score, total: gameQuestions.length, correct, streak });
    }
  }, [screen, score, gameQuestions.length, correct, streak, result]);

  // Move keyboard focus to answer A whenever a new question becomes active.
  // This lets players navigate the answers without reaching for the mouse.
  useEffect(() => {
    if (screen === 'question') {
      firstAnswerRef.current?.focus();
    }
  }, [screen, currentIndex]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isLoading && (isError || allQuestions.length === 0)) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-muted-foreground">
          {isError ? 'Could not load questions.' : 'No published questions match these filters.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between w-full max-w-[700px]">
        <h2 className="text-xl font-bold">🎯 Quiz Arcade</h2>
        <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>

      {/* Responsive wrapper — allows horizontal scroll on narrow viewports */}
      <div className="w-full overflow-x-auto">
        {/* Game frame */}
        <div
          className="relative rounded-xl overflow-hidden border border-border mx-auto"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          {isLoading ? (
            /* Loading spinner centred inside the dark game frame */
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d2a]">
              <div
                className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin"
                role="status"
                aria-label="Loading questions"
              />
            </div>
          ) : (
            <>
              {/* Cubeforge canvas — visual effects layer */}
              <div className="absolute inset-0">
                <QuizCanvas
                  width={CANVAS_W}
                  height={CANVAS_H}
                  timerFraction={
                    screen === 'question' || screen === 'answer_reveal'
                      ? timeLeft / QUESTION_TIME
                      : 0
                  }
                  showBurst={showBurst}
                  shouldShake={shouldShake}
                  onShakeDone={() => setShouldShake(false)}
                />
              </div>

              {/* HTML overlay — interactive game layer */}
              <div className="absolute inset-0 z-10 flex flex-col">
                {screen === 'idle' && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white">
                    <p className="text-4xl">🎯</p>
                    <p className="text-xl font-bold">Quiz Arcade</p>
                    <p className="text-sm text-white/60">
                      {allQuestions.length} questions • {QUESTION_TIME}s each
                    </p>
                    <Button onClick={startGame} className="mt-2">Start Game</Button>
                  </div>
                )}

                {screen === 'countdown' && (
                  <div className="flex items-center justify-center flex-1 text-white">
                    {/* key remounts the element each second, re-triggering the CSS animation */}
                    <p key={countdown} className="text-8xl font-black [animation:quiz-pop_0.35s_ease-out]">
                      {countdown > 0 ? countdown : 'GO!'}
                    </p>
                  </div>
                )}

                {(screen === 'question' || screen === 'answer_reveal') && currentQuestion && (
                  <>
                    <QuizHud
                      score={score}
                      questionIndex={currentIndex}
                      total={gameQuestions.length}
                      timeLeft={timeLeft}
                      streak={streak}
                    />
                    <div className="flex flex-col justify-between flex-1">
                      <QuizQuestionDisplay
                        question={{
                          id: currentQuestion.id,
                          text: currentQuestion.text ?? '',
                          type: currentQuestion.type,
                          answers,
                        }}
                      />
                      <QuizAnswerGrid
                        answers={answers}
                        selected={selected}
                        onSelect={handleAnswer}
                        disabled={screen === 'answer_reveal'}
                        firstButtonRef={firstAnswerRef}
                      />
                    </div>
                  </>
                )}

                {screen === 'results' && result && (
                  <QuizResults
                    result={result}
                    item_bank_id={item_bank_id}
                    onPlayAgain={startGame}
                    onBackToLobby={() => navigate('/games')}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── How to Play ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-[700px] rounded-xl border border-white/10 bg-[#0a0a1f] px-5 py-4">
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
          How to Play
        </p>
        <div className="flex flex-col gap-2">
          {[
            'A question appears — pick the correct answer before time runs out',
            'Each question has a 15-second timer',
            'Faster answers earn more points, up to 100 per question',
            '3 correct answers in a row doubles your score multiplier',
            'Press A, B, C, or D to answer using the keyboard',
            'A wrong answer or timeout resets your streak',
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
