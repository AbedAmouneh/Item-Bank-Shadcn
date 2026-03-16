import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  alpha,
  styled,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { extractHighlightedPhrases, PENALTY_OPTIONS } from './utils';

const PhraseChip = styled(Chip)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  backgroundColor: alpha(theme.palette.success.main, 0.12),
  color: theme.palette.success.main,
  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
  fontWeight: 500,
  '& .MuiChip-label': { padding: '0 10px' },
}));

function HighlightCorrectWordEditor({ questionText }: { questionText?: string }) {
  const { watch, setValue, register, unregister } = useFormContext();
  const { t } = useTranslation('questions');

  const phrases: string[] = useMemo(
    () => extractHighlightedPhrases(questionText ?? ''),
    [questionText]
  );

  const lastSyncedSig = useRef<string | null>(null);

  // Keep form state in sync when TinyMCE content changes
  useEffect(() => {
    const sig = JSON.stringify(phrases);
    if (sig === lastSyncedSig.current) return;
    lastSyncedSig.current = sig;
    setValue('highlightCorrectPhrases', phrases);
  }, [phrases, setValue]);

  useEffect(() => {
    register('highlightCorrectPhrases', {
      validate: {
        atLeastOne: (vals: string[]) =>
          (vals ?? []).length >= 1 ||
          t('editor.highlight_correct_word.error_no_phrases', {
            defaultValue: 'Highlight at least one word or phrase before saving.',
          }),
      },
    });
    return () => {
      unregister('highlightCorrectPhrases', { keepValue: true });
    };
  }, [register, unregister, t]);

  const penaltyPercent: number = watch('highlightPenaltyPercent') ?? 25;

  const hasPhrases = phrases.length >= 1;

  return (
    <Box className="flex flex-col gap-5">
      {/* Penalty dropdown */}
      <FormControl size="small" className="max-w-[260px]">
        <InputLabel id="hcw-penalty-label">
          {t('editor.highlight_correct_word.penalty_label', { defaultValue: 'Penalty per wrong word' })}
        </InputLabel>
        <Select
          labelId="hcw-penalty-label"
          label={t('editor.highlight_correct_word.penalty_label', { defaultValue: 'Penalty per wrong word' })}
          value={penaltyPercent}
          onChange={(e) => setValue('highlightPenaltyPercent', Number(e.target.value))}
        >
          {PENALTY_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}%
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Highlighted phrases list */}
      <Box>
        <Typography
          variant="body2"
          className="font-semibold mb-3"
          sx={{ color: 'text.primary' }}
        >
          {t('editor.highlight_correct_word.phrases_label', { defaultValue: 'Highlighted phrases' })}{' '}
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
            ({t('editor.highlight_correct_word.remove_hint', { defaultValue: 'hover a phrase in the editor to remove it' })})
          </Typography>
        </Typography>

        {hasPhrases ? (
          <Box className="flex flex-wrap gap-2">
            {phrases.map((phrase, i) => (
              <PhraseChip key={`${phrase}-${i}`} label={phrase} size="small" />
            ))}
          </Box>
        ) : (
          <Alert severity="warning" variant="outlined" className="text-sm">
            {t('editor.highlight_correct_word.error_no_phrases', {
              defaultValue: 'Highlight at least one word or phrase before saving.',
            })}
          </Alert>
        )}
      </Box>
    </Box>
  );
}

export default memo(HighlightCorrectWordEditor);
