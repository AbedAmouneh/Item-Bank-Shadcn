import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type FillInBlanksImageViewProps = {
  question: QuestionRow;
};

const MAX_CANVAS_WIDTH = 800;

function isAnswerCorrect(
  zone: NonNullable<QuestionRow['inputAreas']>[number],
  userValue: string
): boolean {
  const value = userValue.trim();
  if (!value) return false;
  return zone.answers.some((answer) => {
    const expected = answer.text.trim();
    if (answer.ignoreCasing) {
      return value.toLowerCase() === expected.toLowerCase();
    }
    return value === expected;
  });
}

function getZoneCredit(
  zone: NonNullable<QuestionRow['inputAreas']>[number],
  userValue: string
): number {
  const value = userValue.trim();
  if (!value) return 0;

  const matchingMarks = zone.answers
    .filter((answer) =>
      answer.ignoreCasing
        ? value.toLowerCase() === answer.text.trim().toLowerCase()
        : value === answer.text.trim()
    )
    .map((answer) => Math.max(0, answer.mark));

  if (matchingMarks.length === 0) return 0;
  return Math.max(...matchingMarks) / 100;
}

export default function FillInBlanksImageView({ question }: FillInBlanksImageViewProps) {
  const { t } = useTranslation('questions');
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [checked, setChecked] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const zones = useMemo(() => question.inputAreas ?? [], [question.inputAreas]);

  useEffect(() => {
    const src = question.background_image;
    if (!src) {
      setCanvasWidth(MAX_CANVAS_WIDTH);
      setCanvasHeight(600);
      return;
    }

    const img = new window.Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (img.naturalWidth > MAX_CANVAS_WIDTH) {
        const ratio = MAX_CANVAS_WIDTH / img.naturalWidth;
        setCanvasWidth(MAX_CANVAS_WIDTH);
        setCanvasHeight(Math.round(img.naturalHeight * ratio));
      } else {
        setCanvasWidth(img.naturalWidth || MAX_CANVAS_WIDTH);
        setCanvasHeight(img.naturalHeight || 600);
      }
    };
    img.onerror = () => {
      setCanvasWidth(MAX_CANVAS_WIDTH);
      setCanvasHeight(600);
    };
    img.src = src;
  }, [question.background_image]);

  useEffect(() => {
    setChecked(false);
    setUserAnswers({});
  }, [question.id]);

  const hasAnyAnswer = useMemo(
    () => Object.values(userAnswers).some((value) => value.trim().length > 0),
    [userAnswers]
  );

  const allCorrect = useMemo(
    () => zones.length > 0 && zones.every((zone) => isAnswerCorrect(zone, userAnswers[zone.id] ?? '')),
    [userAnswers, zones]
  );

  const earnedMark = useMemo(() => {
    if (!checked || zones.length === 0) return null;
    const totalCredit = zones.reduce(
      (sum, zone) => sum + getZoneCredit(zone, userAnswers[zone.id] ?? ''),
      0
    );
    const ratio = totalCredit / zones.length;
    return Math.round(question.mark * ratio * 100) / 100;
  }, [checked, question.mark, userAnswers, zones]);

  const handleCheck = useCallback(() => setChecked(true), []);
  const handleRetry = useCallback(() => {
    setChecked(false);
    setUserAnswers({});
  }, []);
  const handleShowSolution = useCallback(() => {
    const next: Record<string, string> = {};
    for (const zone of zones) {
      next[zone.id] = zone.answers[0]?.text ?? '';
    }
    setUserAnswers(next);
    setChecked(true);
  }, [zones]);

  if (!question.background_image) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('editor.background_image')}: {t('common:not_available')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden w-fit max-w-full border border-border rounded">
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundImage: `url(${question.background_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top left',
          }}
        >
          {zones.map((zone, index) => {
            const correct = checked ? isAnswerCorrect(zone, userAnswers[zone.id] ?? '') : undefined;
            const borderColor = !checked
              ? '#1976d2'
              : correct
                ? '#22c55e'
                : '#ef4444';
            const bgColor = !checked
              ? 'rgba(255, 255, 255, 0.9)'
              : correct
                ? 'rgba(34, 197, 94, 0.16)'
                : 'rgba(239, 68, 68, 0.16)';

            return (
              <div
                key={zone.id}
                className="absolute flex items-center ps-1 pe-1"
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  borderRadius: 4,
                  border: `2px solid ${borderColor}`,
                  backgroundColor: bgColor,
                }}
              >
                <input
                  value={userAnswers[zone.id] ?? ''}
                  onChange={(e) => setUserAnswers((prev) => ({ ...prev, [zone.id]: e.target.value }))}
                  disabled={checked}
                  placeholder={`Zone ${index + 1}`}
                  className={cn(
                    'w-full bg-transparent text-[0.75rem] leading-[1.1] text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0',
                    'disabled:opacity-70 disabled:cursor-not-allowed'
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="default"
            disabled={!checked && !hasAnyAnswer}
            onClick={checked ? handleRetry : handleCheck}
            className="font-semibold rounded-xl gap-1.5"
          >
            {checked ? <RotateCcw size={16} /> : <Check size={16} />}
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && !allCorrect && (
            <Button
              variant="default"
              onClick={handleShowSolution}
              className="font-semibold rounded-xl gap-1.5"
            >
              <Lightbulb size={16} />
              {t('show_solution')}
            </Button>
          )}
        </div>

        <div className="py-2 px-4 font-semibold text-[0.95rem] rounded-xl bg-card border border-border text-foreground">
          {checked && earnedMark !== null ? `${earnedMark} / ${question.mark}` : question.mark}
        </div>
      </div>
    </div>
  );
}
