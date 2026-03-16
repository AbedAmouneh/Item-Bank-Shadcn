import { Box, Button, TextField, useTheme, styled, alpha } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type FillInBlanksQuestionViewProps = {
  question: QuestionRow;
};

type BlankData = {
  key: string;
  acceptableAnswers: Array<{ text: string; ignoreCasing: boolean }>;
};

type BlankFeedback = 'correct' | 'wrong' | undefined;

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const FillInBlanksQuestionView = ({ question }: FillInBlanksQuestionViewProps) => {
  const theme = useTheme();
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

  const getInputStyle = (feedback: BlankFeedback) => {
    if (feedback === 'correct') {
      return {
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        borderColor: theme.palette.success.main,
        color: theme.palette.success.main,
      };
    }
    if (feedback === 'wrong') {
      return {
        backgroundColor: alpha(theme.palette.error.main, 0.1),
        borderColor: theme.palette.error.main,
        color: theme.palette.error.main,
      };
    }
    return {};
  };

  const hasAnswers = Object.values(userAnswers).some((val) => val.trim());

  return (
    <>
      <Box
        className="text-base leading-[1.8] mb-6"
        sx={(theme) => ({ color: theme.palette.text.primary })}
      >
        {parsedContent.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
          } else {
            const key = part.content;
            const feedback = getBlankFeedback(key);
            const inputStyles = getInputStyle(feedback);

            return (
              <TextField
                key={index}
                size="small"
                value={userAnswers[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                disabled={checked}
                className="mx-1 min-w-[120px]"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme.spacing(1),
                    ...inputStyles,
                  },
                }}
                InputProps={{
                  endAdornment: feedback && (
                    <Box className="flex items-center ml-1">
                      {feedback === 'correct' ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <CloseIcon fontSize="small" color="error" />
                      )}
                    </Box>
                  ),
                }}
              />
            );
          }
        })}
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={!checked && !hasAnswers}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !areAllAnswersCorrect() && (
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

export default FillInBlanksQuestionView;
