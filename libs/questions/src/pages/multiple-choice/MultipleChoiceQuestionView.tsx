import { Box, Button, alpha, styled } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type MultipleChoiceQuestionViewProps = {
  question: QuestionRow;
};

type ChoiceFeedback = 'correct' | 'wrong' | undefined;

const ChoicePill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'feedback',
})<{ selected?: boolean; feedback?: ChoiceFeedback }>(({ theme, selected, feedback }) => {
  const getBackgroundColor = () => {
    if (feedback === 'correct') {
      return alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.4 : 0.25);
    }
    if (feedback === 'wrong') {
      return alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.4 : 0.25);
    }
    if (selected) {
      return alpha(theme.palette.primary.main, 0.15);
    }
    return 'transparent';
  };

  const getBorderColor = () => {
    if (feedback === 'correct') return theme.palette.success.main;
    if (feedback === 'wrong') return theme.palette.error.main;
    if (selected) return 'transparent';
    return theme.palette.semantic.choice.unselectedBorder;
  };

  const getTextColor = () => {
    if (feedback === 'correct') return theme.palette.success.main;
    if (feedback === 'wrong') return theme.palette.error.main;
    if (selected) return theme.palette.common.white;
    return theme.palette.text.secondary;
  };

  return {
    width: '100%',
    borderRadius: 9999,
    marginBottom: theme.spacing(1),
    backgroundColor: getBackgroundColor(),
    border: `1px solid ${getBorderColor()}`,
    color: getTextColor(),
    cursor: feedback ? 'default' : 'pointer',
  };
});

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

function parseFraction(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMark(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

const MultipleChoiceQuestionView = ({ question }: MultipleChoiceQuestionViewProps) => {
  const [selectedChoices, setSelectedChoices] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation('questions');

  const choices = question.choices ?? [];
  const allowPartialCredit = question.multipleChoiceAllowPartialCredit ?? false;
  const configuredMaxSelections = question.maxSelections ?? 1;

  const choiceWeights = useMemo(
    () =>
      choices.map((choice) => ({
        id: choice.id,
        weight: Math.max(0, parseFraction(choice.fraction)),
      })),
    [choices]
  );

  const correctChoiceIds = useMemo(
    () => choiceWeights.filter((choice) => choice.weight > 0).map((choice) => choice.id),
    [choiceWeights]
  );

  const totalCorrectWeight = useMemo(
    () => choiceWeights.reduce((sum, choice) => sum + choice.weight, 0),
    [choiceWeights]
  );

  const allowMultipleSelection =
    allowPartialCredit || configuredMaxSelections > 1 || correctChoiceIds.length > 1;

  const toggleChoice = useCallback((choiceId: number) => {
    if (checked) return;

    setSelectedChoices((prev) => {
      const newSet = new Set(prev);
      if (allowMultipleSelection) {
        if (newSet.has(choiceId)) {
          newSet.delete(choiceId);
        } else {
          const maxSelectable = allowPartialCredit
            ? choices.length
            : Math.max(1, configuredMaxSelections);
          if (newSet.size >= maxSelectable) return prev;
          newSet.add(choiceId);
        }
      } else {
        newSet.clear();
        newSet.add(choiceId);
      }
      return newSet;
    });
  }, [allowMultipleSelection, allowPartialCredit, checked, choices.length, configuredMaxSelections]);

  const getChoiceFeedback = (choiceId: number): ChoiceFeedback => {
    if (!checked || !selectedChoices.has(choiceId)) return undefined;
    const isCorrect = correctChoiceIds.includes(choiceId);
    return isCorrect ? 'correct' : 'wrong';
  };

  const isAnswerCorrect = useMemo(() => {
    if (selectedChoices.size !== correctChoiceIds.length) return false;
    return correctChoiceIds.every((id) => selectedChoices.has(id));
  }, [selectedChoices, correctChoiceIds]);

  const earnedMark = useMemo(() => {
    if (!checked) return null;
    if (!allowPartialCredit) return isAnswerCorrect ? question.mark : 0;
    if (totalCorrectWeight <= 0) return 0;

    const selectedWeight = choiceWeights.reduce(
      (sum, choice) => (selectedChoices.has(choice.id) ? sum + choice.weight : sum),
      0
    );
    const ratio = Math.max(0, Math.min(1, selectedWeight / totalCorrectWeight));
    return Math.round(question.mark * ratio * 100) / 100;
  }, [
    allowPartialCredit,
    checked,
    choiceWeights,
    isAnswerCorrect,
    question.mark,
    selectedChoices,
    totalCorrectWeight,
  ]);

  const markLabel =
    checked && earnedMark !== null
      ? `${formatMark(earnedMark)} / ${formatMark(question.mark)}`
      : formatMark(question.mark);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setSelectedChoices(new Set());
  }, []);

  const handleShowSolution = useCallback(() => {
    setSelectedChoices(new Set(correctChoiceIds));
    setChecked(true);
  }, [correctChoiceIds]);

  const getFeedbackIcon = (feedback: ChoiceFeedback) => {
    if (feedback === 'correct') return <CheckCircleIcon fontSize="small" />;
    if (feedback === 'wrong') return <CloseIcon fontSize="small" />;
    return null;
  };

  return (
    <>
      <Box className="flex flex-col gap-0 mb-6">
        {choices.map((choice) => {
          const feedback = getChoiceFeedback(choice.id);
          const isSelected = selectedChoices.has(choice.id);

          return (
            <Box key={choice.id}>
              <ChoicePill
                className="flex items-center gap-3 py-3 px-4 text-base"
                selected={isSelected && !checked}
                feedback={feedback}
                onClick={() => toggleChoice(choice.id)}
              >
                <span className="opacity-90">•</span>
                <Box
                  component="span"
                  sx={{ '& p': { margin: 0 }, '& ul, & ol': { margin: 0, paddingInlineStart: 20 } }}
                  dangerouslySetInnerHTML={{ __html: choice.answer }}
                />
                {feedback && <Box className="ml-auto">{getFeedbackIcon(feedback)}</Box>}
              </ChoicePill>
              {checked && choice.feedback && isSelected && (
                <Box
                  className="text-sm mt-1 ml-8 italic opacity-90"
                  sx={{ '& p': { margin: 0 } }}
                  dangerouslySetInnerHTML={{ __html: choice.feedback }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={!checked && selectedChoices.size === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !isAnswerCorrect && (
            <Button
              onClick={handleShowSolution}
              variant="contained"
              startIcon={<LightbulbIcon />}
              className="normal-case font-semibold"
              sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
            >
              {t('show_solution')}
            </Button>
          )}
        </Box>
        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">{markLabel}</MarkBox>
      </Box>
    </>
  );
};

export default MultipleChoiceQuestionView;
