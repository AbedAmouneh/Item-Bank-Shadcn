import { Box, Button, Chip, Typography, alpha, styled } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectCorrectWordQuestionViewProps } from './types';
import { decodeGroups, sanitizeKeyHtml, parseQuestionText } from './utils';

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const OptionChip = styled(Box, {
  shouldForwardProp: (prop) =>
    !['isSelected', 'isCorrect', 'isChecked', 'showSolution'].includes(prop as string),
})<{
  component?: React.ElementType;
  isSelected?: boolean;
  isCorrect?: boolean;
  isChecked?: boolean;
  showSolution?: boolean;
}>(({ theme, isSelected, isCorrect, isChecked, showSolution }) => {
  let backgroundColor = 'transparent';
  let borderColor = alpha(theme.palette.divider, 0.5);
  let color = theme.palette.text.primary;

  if (showSolution && isCorrect) {
    backgroundColor = alpha(theme.palette.success.main, 0.15);
    borderColor = theme.palette.success.main;
    color = theme.palette.success.main;
  } else if (isChecked && isSelected) {
    if (isCorrect) {
      backgroundColor = alpha(theme.palette.success.main, 0.15);
      borderColor = theme.palette.success.main;
      color = theme.palette.success.main;
    } else {
      backgroundColor = alpha(theme.palette.error.main, 0.15);
      borderColor = theme.palette.error.main;
      color = theme.palette.error.main;
    }
  } else if (isSelected) {
    backgroundColor = alpha(theme.palette.primary.main, 0.12);
    borderColor = theme.palette.primary.main;
    color = theme.palette.primary.main;
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: theme.spacing(0.25, 1),
    borderRadius: theme.spacing(1),
    border: `1px solid ${borderColor}`,
    backgroundColor,
    color,
    cursor: isChecked ? 'default' : 'pointer',
    fontSize: '0.875rem',
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 0.15s ease',
    userSelect: 'none',
    ...(!isChecked && {
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        borderColor: alpha(theme.palette.primary.main, 0.5),
      },
    }),
  };
});

const SelectCorrectWordQuestionView = ({ question }: SelectCorrectWordQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const allowPartialCredit = question.selectWordAllowPartialCredit ?? false;

  const groups = useMemo(() => decodeGroups(question.choices), [question.choices]);
  const parsedParts = useMemo(
    () => parseQuestionText(sanitizeKeyHtml(question.question_text ?? '')),
    [question.question_text]
  );

  const [selectedByKey, setSelectedByKey] = useState<Record<string, number | null>>({});
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const allKeys = useMemo(() => Object.keys(groups), [groups]);

  const score = useMemo(() => {
    if (!checked) return null;
    if (allKeys.length === 0) return { earned: 0, isFullyCorrect: false };
    const correctCount = allKeys.filter((key) => {
      const selected = selectedByKey[key];
      const correctOpt = groups[key]?.options.find((o) => o.isCorrect);
      return selected !== null && selected !== undefined && correctOpt && selected === correctOpt.id;
    }).length;
    if (allowPartialCredit) {
      const earned = Math.round((correctCount / allKeys.length) * question.mark * 100) / 100;
      return { earned, isFullyCorrect: correctCount === allKeys.length };
    }
    const isFullyCorrect = correctCount === allKeys.length;
    return { earned: isFullyCorrect ? question.mark : 0, isFullyCorrect };
  }, [checked, selectedByKey, groups, allKeys, allowPartialCredit, question.mark]);

  const isAllCorrect = score?.isFullyCorrect ?? false;

  const handleSelect = useCallback(
    (key: string, optId: number) => {
      if (checked) return;
      setSelectedByKey((prev) => ({ ...prev, [key]: optId }));
    },
    [checked]
  );

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setSelectedByKey({});
  }, []);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  const hasAllSelections =
    allKeys.length > 0 &&
    allKeys.every((key) => selectedByKey[key] !== null && selectedByKey[key] !== undefined);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  return (
    <>
      <Box
        className="text-base leading-[2] mb-6"
        sx={(theme) => ({ color: theme.palette.text.primary })}
      >
        {parsedParts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
          }
          const keyOptions = groups[part.key]?.options ?? [];
          return (
            <Box
              key={index}
              component="span"
              className="inline-flex items-center flex-wrap gap-0.5 mx-1"
            >
              {keyOptions.map((opt, i) => (
                <Box
                  key={opt.id}
                  component="span"
                  className="inline-flex items-center gap-0.5"
                >
                  {i > 0 && (
                    <Typography
                      component="span"
                      variant="caption"
                      className="px-0.5"
                      sx={(theme) => ({ color: theme.palette.text.disabled })}
                    >
                      |
                    </Typography>
                  )}
                  <OptionChip
                    component="span"
                    isSelected={selectedByKey[part.key] === opt.id}
                    isCorrect={opt.isCorrect}
                    isChecked={checked}
                    showSolution={showSolution}
                    onClick={() => handleSelect(part.key, opt.id)}
                    role="button"
                    tabIndex={checked ? -1 : 0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(part.key, opt.id);
                      }
                    }}
                  >
                    {opt.text}
                  </OptionChip>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasAllSelections}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && !isAllCorrect && !showSolution && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
            >
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <Chip
              className="font-semibold text-sm rounded-xl"
              label={`${formatNum(score.earned)} / ${formatNum(question.mark)}`}
              color={score.isFullyCorrect ? 'success' : 'default'}
              variant={score.isFullyCorrect ? 'filled' : 'outlined'}
            />
          )}
        </Box>

        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">
          {formatNum(question.mark)}
        </MarkBox>
      </Box>
    </>
  );
};

export default SelectCorrectWordQuestionView;
