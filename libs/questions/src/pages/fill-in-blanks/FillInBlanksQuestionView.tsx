import { useCallback, useState, useMemo } from 'react';
import { Check, RotateCcw, Lightbulb, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type FillInBlanksQuestionViewProps = {
  question: QuestionRow;
};

type BlankData = {
  key: string;
  acceptableAnswers: Array<{ text: string; ignoreCasing: boolean }>;
};

type BlankFeedback = 'correct' | 'wrong' | undefined;

const FillInBlanksQuestionView = ({ question }: FillInBlanksQuestionViewProps) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation("questions");

  // Parse choices to get answer groups by key
  const answerGroups = useMemo(() => {
    const groups: Record<string, BlankData> = {};

    (question.choices || []).forEach((choice) => {
      // Extract key and text from format: "[key] text" or just "[key]"
      // Try format with text first: [key] text
      let bracketMatch = choice.answer.match(/^\[([^\]]+)\]\s*(.+)$/);

      // If that fails, try just [key]
      if (!bracketMatch) {
        bracketMatch = choice.answer.match(/^\[([^\]]+)\]$/);
        if (bracketMatch) {
          // Format is just [key] with no answer text - skip this choice
          return;
        }
      }

      if (bracketMatch) {
        const key = bracketMatch[1].trim();
        const text = bracketMatch[2].trim();
        if (!groups[key]) {
          groups[key] = {
            key,
            acceptableAnswers: [],
          };
        }
        groups[key].acceptableAnswers.push({
          text,
          ignoreCasing: choice.ignore_casing,
        });
      }
    });

    return groups;
  }, [question.choices]);

  // Parse question text to find blanks
  const parsedContent = useMemo(() => {
    const parts: Array<{ type: 'text' | 'blank'; content: string }> = [];
    const text = question.fillInBlanksContent || question.question_text || '';

    // Find all [[key]] patterns
    const blankPattern = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let patternMatch;

    while ((patternMatch = blankPattern.exec(text)) !== null) {
      // Add text before the blank
      if (patternMatch.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, patternMatch.index),
        });
      }
      // Add the blank
      parts.push({
        type: 'blank',
        content: patternMatch[1], // The key
      });
      lastIndex = blankPattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return parts;
  }, [question.fillInBlanksContent, question.question_text]);

  const validateAnswer = useCallback((key: string, userInput: string): boolean => {
    const answerGroup = answerGroups[key];
    if (!answerGroup) {
      return false;
    }

    return answerGroup.acceptableAnswers.some((acceptable) => {
      const userText = acceptable.ignoreCasing ? userInput.toLowerCase() : userInput;
      const acceptableText = acceptable.ignoreCasing
        ? acceptable.text.toLowerCase()
        : acceptable.text;
      return userText.trim() === acceptableText.trim();
    });
  }, [answerGroups]);

  const getBlankFeedback = useCallback((key: string): BlankFeedback => {
    if (!checked) return undefined;
    const userInput = userAnswers[key] || '';
    if (!userInput.trim()) return 'wrong';
    return validateAnswer(key, userInput) ? 'correct' : 'wrong';
  }, [checked, userAnswers, validateAnswer]);

  const areAllAnswersCorrect = useCallback(() => {
    const blankKeys = parsedContent
      .filter((part) => part.type === 'blank')
      .map((part) => part.content);

    return blankKeys.every((key) => {
      const userInput = userAnswers[key] || '';
      return userInput.trim() && validateAnswer(key, userInput);
    });
  }, [parsedContent, userAnswers, validateAnswer]);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setUserAnswers({});
  }, []);

  const handleShowSolution = useCallback(() => {
    const solutions: Record<string, string> = {};
    Object.keys(answerGroups).forEach((key) => {
      const answerGroup = answerGroups[key];
      if (answerGroup.acceptableAnswers.length > 0) {
        solutions[key] = answerGroup.acceptableAnswers[0].text;
      }
    });
    setUserAnswers(solutions);
    setChecked(true);
  }, [answerGroups]);

  const handleInputChange = useCallback((key: string, value: string) => {
    if (checked) return;
    setUserAnswers((prev) => ({ ...prev, [key]: value }));
  }, [checked]);

  const getInputClassName = (feedback: BlankFeedback) => {
    if (feedback === 'correct') {
      return 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400';
    }
    if (feedback === 'wrong') {
      return 'border-destructive bg-destructive/10 text-destructive';
    }
    return 'border-border bg-background text-foreground';
  };

  const hasAnswers = Object.values(userAnswers).some((val) => val.trim());

  return (
    <>
      <div className="text-base leading-[1.8] mb-6 text-foreground">
        {parsedContent.map((part, index) => {
          if (part.type === 'text') {
            // Content comes from TinyMCE editor output stored in the database — trusted source
            return <span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
          } else {
            const key = part.content;
            const feedback = getBlankFeedback(key);

            return (
              <span key={index} className="mx-1 inline-flex items-center relative">
                <input
                  type="text"
                  value={userAnswers[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  disabled={checked}
                  className={cn(
                    'min-w-[120px] h-8 rounded-lg border px-2 text-sm transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
                    'disabled:cursor-not-allowed disabled:opacity-75',
                    feedback ? 'pe-7' : '',
                    getInputClassName(feedback)
                  )}
                />
                {feedback && (
                  <span className="absolute end-2 flex items-center">
                    {feedback === 'correct' ? (
                      <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <X size={14} className="text-destructive" />
                    )}
                  </span>
                )}
              </span>
            );
          }
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!checked && !hasAnswers}
            onClick={checked ? handleRetry : handleCheck}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checked ? <RotateCcw size={15} /> : <Check size={15} />}
            {checked ? t('retry') : t('check')}
          </button>
          {checked && !areAllAnswersCorrect() && (
            <button
              type="button"
              onClick={handleShowSolution}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Lightbulb size={15} />
              {t('show_solution')}
            </button>
          )}
        </div>
        <div className="py-2 px-4 font-semibold text-[0.95rem] rounded-xl border border-border bg-card text-foreground">
          {question.mark}
        </div>
      </div>
    </>
  );
};

export default FillInBlanksQuestionView;
