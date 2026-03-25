/**
 * QuizResults — shown after all questions are answered.
 *
 * Saves the session to the server on mount via a fire-and-forget mutation.
 * A subtle "✓ Saved" indicator appears on success; errors are silent.
 *
 * Displays final score, accuracy, and gives the player the option
 * to play again or return to the lobby.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import { Trophy } from 'lucide-react';
import type { GameResult } from '../../domain/types';
import { useGameScores } from '../../domain/hooks';
import ScoreHistory from '../../components/ScoreHistory';

interface QuizResultsProps {
  result: GameResult;
  /** Passed through so the saved session is scoped to the right item bank. */
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function QuizResults({
  result,
  item_bank_id,
  onPlayAgain,
  onBackToLobby,
}: QuizResultsProps) {
  const { t } = useTranslation('common');
  const accuracy = result.total > 0
    ? Math.round((result.correct / result.total) * 100)
    : 0;

  const { scores, save } = useGameScores('quiz-arcade');
  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // hasSavedRef prevents a second save if React re-runs this effect (e.g. Strict Mode double-invoke).
  const hasSavedRef = useRef(false);

  // Fire once on mount — one component mount = one completed game session.
  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    save({ score: result.score, correct: result.correct, total: result.total, accuracy });
    mutate({
      game: 'quiz-arcade',
      score: result.score,
      accuracy,
      total_qs: result.total,
      correct_qs: result.correct,
      item_bank_id,
    });
  }, [save, mutate, result, accuracy, item_bank_id]);

  const emoji =
    accuracy >= 90 ? '🏆' : accuracy >= 70 ? '⭐' : accuracy >= 50 ? '👍' : '💪';

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-10 text-white text-center">
      <Trophy size={48} className="text-yellow-400" />

      <div>
        <p className="text-5xl font-extrabold text-yellow-400 mb-1">
          {result.score}
        </p>
        <p className="text-sm text-white/60 uppercase tracking-widest">{t('games.final_score')}</p>
      </div>

      <div className="flex gap-8 text-sm">
        <div>
          <p className="font-bold text-lg">{result.correct}/{result.total}</p>
          <p className="text-white/60">{t('games.correct_stat')}</p>
        </div>
        <div>
          <p className="font-bold text-lg">{accuracy}%</p>
          <p className="text-white/60">{t('games.accuracy_stat')}</p>
        </div>
        <div>
          <p className="font-bold text-lg">{emoji}</p>
          <p className="text-white/60">{t('games.rating_stat')}</p>
        </div>
      </div>

      {/* Subtle save indicator — only shown after the API call succeeds */}
      {isSuccess && (
        <p className="text-xs text-emerald-400">{t('games.saved')}</p>
      )}

      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBackToLobby} className="border-white/30 text-white hover:bg-white/10">
          {t('games.back_to_games')}
        </Button>
        <Button onClick={onPlayAgain}>
          {t('games.play_again')}
        </Button>
      </div>

      <ScoreHistory scores={scores} />
    </div>
  );
}
