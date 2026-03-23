import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause } from 'lucide-react';
import { Button, Slider } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Format seconds as MM:SS. Returns '--:--' for invalid values. */
function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '--:--';
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** Normalise a string for case-insensitive, punctuation-stripped comparison. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '').trim();
}

/** Compute the Levenshtein edit distance between two strings. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ---------------------------------------------------------------------------
// AudioPlayer — inline sub-component
// ---------------------------------------------------------------------------

type AudioPlayerProps = {
  src: string;
};

function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      void el.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleScrub = useCallback((values: number[]) => {
    const el = audioRef.current;
    if (!el || values[0] === undefined) return;
    el.currentTime = values[0];
    setCurrentTime(values[0]);
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />
      <Slider
        min={0}
        max={duration || 1}
        step={0.01}
        value={[currentTime]}
        onValueChange={handleScrub}
        aria-label="Audio scrubber"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
          className="rounded-full p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpellingDictationView
// ---------------------------------------------------------------------------

type SpellingDictationViewProps = {
  question: QuestionRow;
};

/**
 * Student-facing view for the Spelling Dictation question type.
 *
 * Plays audio (when available), accepts a typed answer, and shows a
 * character-by-character diff against the closest correct spelling after Check.
 */
export default function SpellingDictationView({ question }: SpellingDictationViewProps) {
  const { t } = useTranslation('questions');

  const apiBase = import.meta.env.VITE_API_BASE_URL as string;
  const audioUrl = question.spellingAudioUrl ?? null;
  const correctAnswers = question.spellingCorrectAnswers ?? [];
  const hint = question.spellingHint ?? '';
  const mark = question.mark ?? 10;

  const [studentAnswer, setStudentAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const isCorrect =
    checked &&
    correctAnswers.some((a) => normalise(studentAnswer) === normalise(a));

  // Find the best-matching correct answer by edit distance
  const bestMatch: string = correctAnswers.reduce(
    (best, a) =>
      editDistance(normalise(studentAnswer), normalise(a)) <
      editDistance(normalise(studentAnswer), normalise(best))
        ? a
        : best,
    correctAnswers[0] ?? '',
  );

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleShowSolution = useCallback(() => {
    setStudentAnswer(correctAnswers[0] ?? '');
    setShowSolution(true);
  }, [correctAnswers]);

  const handleTryAgain = useCallback(() => {
    setStudentAnswer('');
    setChecked(false);
    setShowSolution(false);
  }, []);

  // ------------------------------------------------------------------
  // Character-diff rendering
  // ------------------------------------------------------------------

  function renderCharDiff(): React.ReactNode {
    const answer = studentAnswer;
    const target = bestMatch;
    const nodes: React.ReactNode[] = [];

    for (let i = 0; i < answer.length; i++) {
      const isMatch = i < target.length && answer[i] === target[i];
      nodes.push(
        <span
          key={`a${i}`}
          className={isMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        >
          {answer[i]}
        </span>,
      );
    }

    // Missing characters from target
    for (let i = answer.length; i < target.length; i++) {
      nodes.push(
        <span key={`m${i}`} className="italic text-muted-foreground">
          {target[i]}
        </span>,
      );
    }

    return <span className="font-mono text-base">{nodes}</span>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section A — Audio */}
      {audioUrl ? (
        <AudioPlayer src={`${apiBase}${audioUrl}`} />
      ) : (
        <p className="italic text-muted-foreground text-sm">
          {t('spelling_dictation_no_audio')}
        </p>
      )}

      {/* Section B — Hint */}
      {hint.trim() !== '' && (
        <p className="italic text-muted-foreground text-sm">💡 {hint}</p>
      )}

      {/* Section C — Answer input */}
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={checked}
        value={studentAnswer}
        onChange={(e) => setStudentAnswer(e.target.value)}
        placeholder={t('answer')}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
      />

      {/* Section D — Char diff (after check) */}
      {checked && studentAnswer.trim() !== '' && !showSolution && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          {renderCharDiff()}
        </div>
      )}

      {/* Section E — Buttons & score */}
      {!checked ? (
        <Button
          onClick={handleCheck}
          disabled={studentAnswer.trim() === ''}
        >
          {t('spelling_dictation_check')}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {/* Score chip */}
          <span
            className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${
              isCorrect
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {isCorrect
              ? t('spelling_dictation_score_correct', { mark })
              : t('spelling_dictation_score_wrong', { mark })}
          </span>

          {/* Show solution (only when wrong) */}
          {!isCorrect && (
            <Button variant="outline" size="sm" onClick={handleShowSolution}>
              {t('spelling_dictation_show_solution')}
            </Button>
          )}

          {/* Try again */}
          <Button variant="outline" size="sm" onClick={handleTryAgain}>
            {t('spelling_dictation_try_again')}
          </Button>
        </div>
      )}
    </div>
  );
}
