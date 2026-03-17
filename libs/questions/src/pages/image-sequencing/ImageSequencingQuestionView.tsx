import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@item-bank/ui';
import type { QuestionRow, QuestionChoice } from '../../components/QuestionsTable';

type ImageSequencingQuestionViewProps = {
  question: QuestionRow;
};

type DisplayItem = {
  canonicalId: number;
  image: string;
  markPercent: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCanonicalItems(choices: QuestionChoice[] | undefined): DisplayItem[] {
  return [...(choices ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      canonicalId: c.id,
      image: c.answer,
      markPercent: parseFloat(c.fraction),
    }));
}

const ImageSequencingQuestionView = ({ question }: ImageSequencingQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const allowPartialCredit = question.sequencingAllowPartialCredit ?? false;

  const canonicalItems = useMemo(
    () => buildCanonicalItems(question.choices),
    [question.choices]
  );
  const [items, setItems] = useState<DisplayItem[]>(() =>
    shuffle(buildCanonicalItems(question.choices))
  );
  const [checked, setChecked] = useState(false);
  const [flashWrong, setFlashWrong] = useState(false);

  useEffect(() => {
    if (!flashWrong) return;
    const id = setTimeout(() => setFlashWrong(false), 820);
    return () => clearTimeout(id);
  }, [flashWrong]);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  const score = useMemo(() => {
    if (!checked) return null;
    if (allowPartialCredit) {
      let earnedPercent = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].canonicalId === i) earnedPercent += items[i].markPercent;
      }
      const earned = Math.round((earnedPercent / 100) * question.mark * 100) / 100;
      return { earned, isFullyCorrect: earnedPercent >= 100 };
    }
    const allCorrect = items.every((item, i) => item.canonicalId === i);
    return { earned: allCorrect ? question.mark : 0, isFullyCorrect: allCorrect };
  }, [checked, items, allowPartialCredit, question.mark]);

  const handleCheck = useCallback(() => {
    setChecked(true);
    const isCorrect = allowPartialCredit
      ? items.reduce((sum, item, i) => (item.canonicalId === i ? sum + item.markPercent : sum), 0) >= 100
      : items.every((item, i) => item.canonicalId === i);
    if (!isCorrect) setFlashWrong(true);
  }, [items, allowPartialCredit]);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setFlashWrong(false);
    setItems(shuffle([...canonicalItems]));
  }, [canonicalItems]);

  const handleShowSolution = useCallback(() => {
    setFlashWrong(false);
    setItems([...canonicalItems]);
    setChecked(true);
  }, [canonicalItems]);

  return (
    <>
      {/* Static image list */}
      <div
        className={cn(
          'flex flex-col gap-2 p-4 rounded-2xl mb-6 border transition-colors',
          'border-border bg-card',
          flashWrong && 'animate-wrong-flash'
        )}
      >
        {items.map((item, index) => (
          <div
            key={item.canonicalId}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30"
          >
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <img src={item.image} alt="" className="h-16 w-24 object-cover rounded-lg shrink-0" />
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="default"
            className="rounded-xl font-semibold gap-1.5"
            onClick={checked ? handleRetry : handleCheck}
          >
            {checked ? <RotateCcw size={15} /> : <Check size={15} />}
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && (
            <Button
              variant="default"
              className="rounded-xl font-semibold gap-1.5"
              onClick={handleShowSolution}
            >
              <Lightbulb size={15} />
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <span
              className={cn(
                'inline-flex items-center rounded-xl border ps-3 pe-3 py-1 text-sm font-semibold',
                score.isFullyCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-border text-foreground'
              )}
            >
              {formatNum(score.earned)} / {formatNum(question.mark)}
            </span>
          )}
        </div>

        {/* Mark badge */}
        <div className="py-2 ps-4 pe-4 rounded-xl border border-border bg-card text-foreground font-semibold text-[0.95rem]">
          {formatNum(question.mark)}
        </div>
      </div>
    </>
  );
};

export default ImageSequencingQuestionView;
