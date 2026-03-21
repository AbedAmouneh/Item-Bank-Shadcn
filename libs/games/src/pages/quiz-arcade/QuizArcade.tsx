/**
 * QuizArcade — timed multiple-choice quiz powered by Cubeforge.
 *
 * Architecture: HTML overlay (question + answers + HUD) sits on top of
 * a Cubeforge canvas that renders only the visual effects (particle bursts,
 * camera shake, timer bar). The game logic is a React state machine that
 * cycles through: idle → countdown → question → answer_reveal → results.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
const REVEAL_DELAY = 1400; // ms to show correct/wrong before advancing

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
  const tagId = searchParams.get('tag_id');

  const { data, isLoading, isError } = useGameQuestions({
    type: questionType,
    ...(tagId ? { item_bank_id: undefined } : {}),
  });

  const questions = (data?.items ?? []).filter(
    (q) => extractAnswers(q).length > 0,
  );

  // ── State ────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<GameScreen>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [countdown, setCountdown] = useState(3);
  const [showBurst, setShowBurst] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);

  const currentQuestion = questions[currentIndex];
  const answers: GameAnswer[] = currentQuestion ? extractAnswers(currentQuestion) : [];

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (countdown <= 0) { setScreen('question'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, countdown]);

  // ── Question timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'question') return;
    if (timeLeft <= 0) { handleTimeUp(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const startGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setSelected(null);
    setCountdown(3);
    setResult(null);
    setScreen('countdown');
  };

  const advance = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setScreen('results');
    } else {
      setCurrentIndex(next);
      setSelected(null);
      setTimeLeft(QUESTION_TIME);
      setScreen('question');
    }
  }, [currentIndex, questions.length]);

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

  const handleTimeUp = () => {
    setSelected('__timeout__');
    setScreen('answer_reveal');
    setStreak(0);
    setShouldShake(true);
    setTimeout(advance, REVEAL_DELAY);
  };

  useEffect(() => {
    if (screen === 'results' && result === null) {
      setResult({ score, total: questions.length, correct, streak });
    }
  }, [screen, score, questions.length, correct, streak, result]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        Loading questions…
      </div>
    );
  }

  if (isError || questions.length === 0) {
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

      {/* Game frame */}
      <div
        className="relative rounded-xl overflow-hidden border border-border"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        {/* Cubeforge canvas — visual effects layer */}
        <div className="absolute inset-0">
          <QuizCanvas
            width={CANVAS_W}
            height={CANVAS_H}
            timerFraction={screen === 'question' ? timeLeft / QUESTION_TIME : 1}
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
              <p className="text-sm text-white/60">{questions.length} questions • {QUESTION_TIME}s each</p>
              <Button onClick={startGame} className="mt-2">Start Game</Button>
            </div>
          )}

          {screen === 'countdown' && (
            <div className="flex items-center justify-center flex-1 text-white">
              <p className="text-8xl font-black animate-pulse">
                {countdown > 0 ? countdown : 'GO!'}
              </p>
            </div>
          )}

          {(screen === 'question' || screen === 'answer_reveal') && currentQuestion && (
            <>
              <QuizHud
                score={score}
                questionIndex={currentIndex}
                total={questions.length}
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
                />
              </div>
            </>
          )}

          {screen === 'results' && result && (
            <QuizResults
              result={result}
              onPlayAgain={startGame}
              onBackToLobby={() => navigate('/games')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
