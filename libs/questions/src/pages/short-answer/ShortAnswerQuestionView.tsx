import { type QuestionRow } from '../../components/QuestionsTable';
import { Box, TextField, useTheme, Button, styled, Typography } from "@mui/material";
import { useState, useCallback, useMemo } from "react";
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from "react-i18next";

type ShortAnswerQuestionViewProps = {
  question: QuestionRow;
};

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const SolutionBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.semantic.solution.background,
  border: `1px solid ${theme.palette.semantic.solution.border}`,
}));

const ShortAnswerQuestionView = ({ question }: ShortAnswerQuestionViewProps) => {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [answer, setAnswer] = useState('');
  const { t } = useTranslation("questions");

  const correctChoiceMatch = useMemo(() => {
    if(answer.length === 0) return undefined;
    return question.choices?.find(choice => choice.ignore_casing ? choice.answer.toLowerCase() === answer.toLowerCase() : choice.answer === answer)
  }, [answer, question.choices]);

  const earnedMark = useMemo(() => {
    if (!checked) return 0;
    if (!correctChoiceMatch) return 0;
    return Math.round(parseFloat(correctChoiceMatch.fraction) * question.mark);
  }, [checked, correctChoiceMatch, question.mark]);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  const handleRetry = useCallback(() => {
    setAnswer('');
    setChecked(false);
    setShowSolution(false);
  }, []);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, [])

  return (
    <>
      <Box>
        <TextField
          placeholder={t('editor.add_answer')}
          fullWidth
          size="small"
          disabled={checked}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              backgroundColor:
                checked &&
                correctChoiceMatch &&
                +correctChoiceMatch.fraction >= 1
                  ? theme.palette.success.main
                  : checked &&
                      correctChoiceMatch &&
                      +correctChoiceMatch.fraction < 1
                    ? theme.palette.warning.main
                    : checked && !correctChoiceMatch
                      ? theme.palette.error.main
                      : theme.palette.background.paper,
            },
          }}
        />
      </Box>

      {showSolution && question.choices && question.choices.length > 0 && (
        <SolutionBox className="p-4 mt-4 mb-4">
          <Box className="flex items-start gap-3 mb-3">
            <InfoOutlinedIcon
              className="text-xl mt-1 shrink-0"
              sx={(theme) => ({ color: theme.palette.info.light })}
            />
            <Typography
              component="span"
              className="font-semibold text-[0.95rem]"
              sx={(theme) => ({ color: theme.palette.text.primary })}
            >
              {t('correct_answers_are')}
            </Typography>
          </Box>
          <Box component="ul" className="m-0 pl-9 list-none">
            {question.choices.map((choice) => {
              const percent = Math.round(parseFloat(choice.fraction) * 100);
              return (
                <Box
                  component="li"
                  key={choice.id}
                  className="text-[0.95rem] mb-1 last:mb-0"
                  sx={(theme) => ({ color: theme.palette.info.light })}
                >
                  {percent}% {choice.answer}
                </Box>
              );
            })}
          </Box>
        </SolutionBox>
      )}

      <Box className="flex items-center justify-between flex-wrap gap-4 mt-6">
        <Box className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={answer.length === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>
          {checked &&
            (!correctChoiceMatch || +correctChoiceMatch.fraction < 1) &&
            !showSolution && (
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
        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">
          {checked ? `${earnedMark}/${question.mark}` : question.mark}
        </MarkBox>
      </Box>
    </>
  );
}

export default ShortAnswerQuestionView