import { Flag } from 'lucide-react';

import { cn } from '@item-bank/ui';
import type { ExamQuestion, QuestionAnswer } from '@item-bank/types';

interface QuestionMapProps {
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<number, QuestionAnswer>;
  flagged: Set<number>;
  onNavigate: (index: number) => void;
  onToggleFlag: (questionId: number) => void;
}

/**
 * Side-panel grid showing one numbered button per question.
 *
 * Colour coding:
 *   - Active (current):  solid primary ring
 *   - Answered:          solid primary fill
 *   - Flagged:           orange outline
 *   - Unanswered:        default outline
 */
export function QuestionMap({
  questions,
  currentIndex,
  answers,
  flagged,
  onNavigate,
  onToggleFlag,
}: QuestionMapProps) {
  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Questions
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, index) => {
          const isAnswered = q.id in answers;
          const isFlagged = flagged.has(q.id);
          const isCurrent = index === currentIndex;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onNavigate(index)}
              aria-label={`Question ${q.position}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'h-8 w-8 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                isCurrent && 'ring-2 ring-primary ring-offset-1',
                isAnswered && !isFlagged && 'bg-primary text-primary-foreground',
                isFlagged &&
                  'border-2 border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20',
                !isAnswered &&
                  !isFlagged &&
                  'border border-border bg-card text-foreground hover:bg-accent',
              )}
            >
              {q.position}
            </button>
          );
        })}
      </div>

      {/* Flag button for the current question */}
      {currentQuestion && (
        <button
          type="button"
          onClick={() => onToggleFlag(currentQuestion.id)}
          className={cn(
            'flex items-center gap-1.5 text-xs mt-1 px-2 py-1 rounded transition-colors',
            flagged.has(currentQuestion.id)
              ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
          aria-pressed={flagged.has(currentQuestion.id)}
          aria-label="Flag this question for review"
        >
          <Flag size={12} />
          {flagged.has(currentQuestion.id) ? 'Flagged' : 'Flag for review'}
        </button>
      )}

      {/* Legend */}
      <div className="flex flex-col gap-1 pt-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-orange-400 inline-block" /> Flagged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-border inline-block" /> Unanswered
        </span>
      </div>
    </div>
  );
}
