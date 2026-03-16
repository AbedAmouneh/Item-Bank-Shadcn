import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, TextField, Typography, alpha, styled, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useTranslation } from 'react-i18next';

type FillInBlanksImageViewProps = {
  question: QuestionRow;
};

const MAX_CANVAS_WIDTH = 800;

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

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
  const theme = useTheme();
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
      <Typography variant="body2" color="text.secondary">
        {t('editor.background_image', { defaultValue: 'Background image' })}: {t('common:not_available', { defaultValue: 'Not available' })}
      </Typography>
    );
  }

  return (
    <Box className="flex flex-col gap-3">
      <Box
        className="overflow-hidden w-fit max-w-full"
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}
      >
        <Box
          className="relative"
          style={{ width: canvasWidth, height: canvasHeight }}
          sx={{
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
                ? theme.palette.success.main
                : theme.palette.error.main;
            const bgColor = !checked
              ? 'rgba(255, 255, 255, 0.9)'
              : correct
                ? alpha(theme.palette.success.main, 0.16)
                : alpha(theme.palette.error.main, 0.16);

            return (
              <Box
                key={zone.id}
                className="absolute flex items-center px-1"
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                }}
                sx={{
                  borderRadius: 1,
                  border: `2px solid ${borderColor}`,
                  backgroundColor: bgColor,
                }}
              >
                <TextField
                  value={userAnswers[zone.id] ?? ''}
                  onChange={(e) => setUserAnswers((prev) => ({ ...prev, [zone.id]: e.target.value }))}
                  disabled={checked}
                  size="small"
                  placeholder={`Zone ${index + 1}`}
                  variant="standard"
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': { fontSize: '0.75rem', lineHeight: 1.1 },
                    '& .MuiInputBase-input': { p: 0, textAlign: 'center' },
                    '& .MuiInput-underline:before, & .MuiInput-underline:after': { display: 'none' },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={!checked && !hasAnyAnswer}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(muiTheme) => ({ borderRadius: muiTheme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && !allCorrect && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={(muiTheme) => ({ borderRadius: muiTheme.spacing(1.5) })}
            >
              {t('show_solution')}
            </Button>
          )}

        </Box>

        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">
          {checked && earnedMark !== null ? `${earnedMark} / ${question.mark}` : question.mark}
        </MarkBox>
      </Box>
    </Box>
  );
}
