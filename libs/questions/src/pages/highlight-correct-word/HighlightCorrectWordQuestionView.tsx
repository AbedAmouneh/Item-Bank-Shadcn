import { Box, Button, Chip, Typography, alpha, styled, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HighlightCorrectWordQuestionViewProps } from './types';
import {
  sanitizeHighlightHtml,
  extractPlainText,
  tokenizeText,
  buildRunsFromIndices,
  getCorrectTokenRuns,
  getSolutionTokenIndices,
  computeScore,
} from './utils';

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const HighlightCorrectWordQuestionView = ({ question }: HighlightCorrectWordQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();

  const penaltyPercent = question.highlightPenaltyPercent ?? 25;

  // Sanitize once: removes editor controls so tokens and solution are clean.
  const sanitizedHtml = useMemo(
    () => sanitizeHighlightHtml(question.question_text ?? ''),
    [question.question_text]
  );

  const tokens = useMemo(() => {
    const plain = extractPlainText(sanitizedHtml);
    return tokenizeText(plain);
  }, [sanitizedHtml]);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const correctRuns = useMemo(
    () => getCorrectTokenRuns(sanitizedHtml),
    [sanitizedHtml]
  );

  // Build runs from current selection, split by authored highlight boundaries
  // so adjacent correct spans are scored independently.
  const selectedRuns = useMemo(
    () => buildRunsFromIndices(tokens, selectedIndices, correctRuns),
    [tokens, selectedIndices, correctRuns]
  );

  // Score (only computed after Check)
  const score = useMemo(() => {
    if (!checked) return null;
    return computeScore(question.mark, penaltyPercent, selectedRuns, correctRuns);
  }, [checked, selectedRuns, correctRuns, question.mark, penaltyPercent]);

  // Precompute: which token indices belong to authored correct highlights (for Show Solution).
  const solutionIndices = useMemo(
    () => getSolutionTokenIndices(sanitizedHtml),
    [sanitizedHtml]
  );

  // Precompute: for each selected token, whether its run is correct (post-check).
  // Exact position-based: a run is correct only when it exactly matches
  // one authored highlighted run token span.
  const runCorrectnessMap = useMemo(() => {
    const map = new Map<number, boolean>();
    if (!checked || !score) return map;
    for (let i = 0; i < selectedRuns.length; i++) {
      const run = selectedRuns[i];
      const isCorrect = score.selectedRunIsCorrect[i] === true;
      run.indices.forEach((idx) => map.set(idx, isCorrect));
    }
    return map;
  }, [checked, score, selectedRuns]);

  const handleTokenClick = useCallback(
    (idx: number) => {
      if (checked || showSolution) return;
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [checked, showSolution]
  );

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setSelectedIndices(new Set());
  }, []);

  const handleShowSolution = useCallback(() => setShowSolution(true), []);

  const hasSelection = selectedIndices.size > 0;
  const isFullyCorrect = score?.isFullyCorrect ?? false;

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  return (
    <>
      {/* Clickable token text */}
      <Box
        className="text-base leading-loose mb-6"
        sx={{ color: theme.palette.text.primary, wordBreak: 'break-word' }}
      >
        {tokens.map((token, idx) => {
          // Determine per-token visual state
          let bg = 'transparent';
          let borderColor = 'transparent';
          let color = 'inherit';
          let fontWeight = 400;

          if (showSolution && solutionIndices.has(idx)) {
            bg = alpha(theme.palette.success.main, 0.15);
            borderColor = theme.palette.success.main;
            color = theme.palette.success.main;
            fontWeight = 600;
          } else if (checked && runCorrectnessMap.has(idx)) {
            const isCorrect = runCorrectnessMap.get(idx) === true;
            bg = alpha(
              isCorrect ? theme.palette.success.main : theme.palette.error.main,
              0.15
            );
            borderColor = isCorrect ? theme.palette.success.main : theme.palette.error.main;
            color = isCorrect ? theme.palette.success.main : theme.palette.error.main;
            fontWeight = 600;
          } else if (!checked && selectedIndices.has(idx)) {
            bg = alpha(theme.palette.primary.main, 0.12);
            borderColor = theme.palette.primary.main;
            color = theme.palette.primary.main;
            fontWeight = 600;
          }

          const isInteractive = !checked && !showSolution;

          return (
            <Box
              key={idx}
              component="span"
              onClick={() => handleTokenClick(idx)}
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              onKeyDown={
                isInteractive
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTokenClick(idx);
                      }
                    }
                  : undefined
              }
              className="inline-block px-0.5 py-[0.125rem] mx-0.5 rounded-[0.1875rem]"
              sx={{
                border: `1px solid ${borderColor}`,
                backgroundColor: bg,
                color,
                fontWeight,
                cursor: isInteractive ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                lineHeight: 1.8,
                ...(isInteractive && {
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                  },
                }),
              }}
            >
              {token}
            </Box>
          );
        })}

        {tokens.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            —
          </Typography>
        )}
      </Box>

      {/* Controls row */}
      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasSelection}
            className="normal-case font-semibold"
            sx={{ borderRadius: theme.spacing(1.5) }}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && !isFullyCorrect && !showSolution && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={{ borderRadius: theme.spacing(1.5) }}
            >
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <Chip
              className="font-semibold text-sm rounded-xl"
              label={`${formatNum(score.earned)} / ${formatNum(question.mark)}`}
              color={isFullyCorrect ? 'success' : 'default'}
              variant={isFullyCorrect ? 'filled' : 'outlined'}
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

export default HighlightCorrectWordQuestionView;
