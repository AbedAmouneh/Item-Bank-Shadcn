import { Box, Button, alpha, styled } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TrueFalseQuestionViewProps = {
  question: QuestionRow;
};

type OptionPillFeedback = 'correct' | 'wrong' | undefined;

const OptionPill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'feedback',
})<{ selected?: boolean; feedback?: OptionPillFeedback }>(({ theme, selected, feedback }) => {
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

const TrueFalseQuestionView = ({ question }: TrueFalseQuestionViewProps) => {
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation("questions");

  const correctAnswer = question.correct_choice ?? true;
  const isCorrect = selectedOption === correctAnswer;

  const getFeedback = (value: boolean): OptionPillFeedback => {
    if (!checked || selectedOption !== value) return undefined;
    return isCorrect ? 'correct' : 'wrong';
  };

  const handleShowSolution = useCallback(() => {
    setSelectedOption(correctAnswer);
    setChecked(true);
  }, [correctAnswer]);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setSelectedOption(null);
  }, []);

  return (
    <>
      <Box className="flex flex-col gap-0 mb-6">
        <OptionPill
          className="flex items-center gap-3 py-3 px-4 text-base"
          selected={selectedOption === true && !checked}
          feedback={getFeedback(true)}
          onClick={() => !checked && setSelectedOption(true)}
        >
          <span className="opacity-90">•</span>
          <span>{t('editor.true')}</span>
        </OptionPill>
        <OptionPill
          className="flex items-center gap-3 py-3 px-4 text-base"
          selected={selectedOption === false && !checked}
          feedback={getFeedback(false)}
          onClick={() => !checked && setSelectedOption(false)}
        >
          <span className="opacity-90">•</span>
          <span>{t('editor.false')}</span>
        </OptionPill>
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={!checked && selectedOption === null}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !isCorrect && (
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
        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">{question.mark}</MarkBox>
      </Box>
    </>
  );
};

export default TrueFalseQuestionView;
