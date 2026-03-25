import type { ExamQuestion as ExamQuestionType, QuestionAnswer } from '@item-bank/types';

interface ExamQuestionProps {
  question: ExamQuestionType;
  answer: QuestionAnswer | undefined;
  onChange: (answer: QuestionAnswer) => void;
}

/**
 * Renders one exam question with the appropriate input control.
 *
 * Supported question types:
 *   - multiple_choice → radio group of labelled choices
 *   - true_false      → two radio buttons (True / False)
 *   - numerical       → number input
 *   - all others      → textarea fallback (essay, short_answer, etc.)
 *
 * The answer stored is always { type, value } so the server can decode it.
 */
export function ExamQuestion({ question, answer, onChange }: ExamQuestionProps) {
  const { type, content } = question;
  const currentValue = answer?.value;

  const handleChange = (value: unknown) => {
    onChange({ type, value });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Question stem */}
      <p className="text-base font-medium text-foreground leading-relaxed">{content.text}</p>

      {/* ── Multiple choice ─────────────────────────── */}
      {type === 'multiple_choice' && content.choices && (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Select your answer</legend>
          {content.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={choice.id}
                checked={currentValue === choice.id}
                onChange={() => handleChange(choice.id)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-foreground">{choice.text}</span>
            </label>
          ))}
        </fieldset>
      )}

      {/* ── True / False ────────────────────────────── */}
      {type === 'true_false' && (
        <fieldset className="flex gap-3">
          <legend className="sr-only">Select True or False</legend>
          {(['true', 'false'] as const).map((val) => (
            <label
              key={val}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={val}
                checked={currentValue === val}
                onChange={() => handleChange(val)}
                className="accent-primary"
              />
              <span className="text-sm font-medium text-foreground capitalize">{val}</span>
            </label>
          ))}
        </fieldset>
      )}

      {/* ── Numerical ───────────────────────────────── */}
      {type === 'numerical' && (
        <input
          type="number"
          value={currentValue !== undefined ? String(currentValue) : ''}
          onChange={(e) =>
            handleChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
          className="w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Numerical answer"
        />
      )}

      {/* ── Fallback (essay, short_answer, etc.) ───── */}
      {type !== 'multiple_choice' && type !== 'true_false' && type !== 'numerical' && (
        <textarea
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(e) => handleChange(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          aria-label="Your answer"
          placeholder="Type your answer here…"
        />
      )}
    </div>
  );
}
