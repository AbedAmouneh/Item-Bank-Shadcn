import { memo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { type NumericalAnswerEntry, MARK_OPTIONS } from './types';

type NumericalAnswerRowProps = {
  answer: NumericalAnswerEntry;
  index: number;
  onChange: (id: string, field: keyof NumericalAnswerEntry, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

const NumericalAnswerRow = memo(function NumericalAnswerRow({
  answer,
  index,
  onChange,
  onRemove,
  canRemove,
}: NumericalAnswerRowProps) {
  const { t } = useTranslation('questions');
  const id = answer.id;

  return (
    <Box
      className="flex items-center gap-3 p-3 w-full box-border min-w-0 rounded border flex-wrap"
      sx={(theme) => ({
        backgroundColor: theme.palette.action.hover,
        borderColor: theme.palette.divider,
      })}
    >
      <TextField
        label={`Answer ${index + 1}`}
        value={answer.answer}
        onChange={(e) => onChange(id, 'answer', e.target.value)}
        type="number"
        size="small"
        sx={(theme) => ({
          flex: '1 1 140px',
          minWidth: 120,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.background.paper,
            fontSize: '0.8125rem',
            height: 36,
          },
          '& .MuiOutlinedInput-input': { py: 1.5, px: 2.5 },
        })}
        slotProps={{ htmlInput: { step: 'any' } }}
      />

      <TextField
        label="Error *"
        value={answer.error}
        onChange={(e) => onChange(id, 'error', e.target.value)}
        type="number"
        size="small"
        sx={(theme) => ({
          flex: '1 1 120px',
          minWidth: 100,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.background.paper,
            fontSize: '0.8125rem',
            height: 36,
          },
          '& .MuiOutlinedInput-input': { py: 1.5, px: 2.5 },
        })}
        slotProps={{ htmlInput: { step: 'any', min: 0 } }}
      />

      <FormControl size="small" sx={{ flex: '1 1 110px', minWidth: 90 }}>
        <InputLabel id={`mark-label-${id}`}>{t('mark')} *</InputLabel>
        <Select
          labelId={`mark-label-${id}`}
          value={answer.mark}
          label={`${t('mark')} *`}
          onChange={(e) => onChange(id, 'mark', Number(e.target.value))}
          sx={{
            height: 36,
            fontSize: '0.8125rem',
            '& .MuiSelect-select': { py: 0.6 },
          }}
        >
          {MARK_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt} %
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        className="shrink-0"
        control={
          <Switch
            size="small"
            checked={answer.feedback}
            onChange={(e) => onChange(id, 'feedback', e.target.checked)}
            color="primary"
          />
        }
        label={t('editor.feedback')}
        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
      />

      {canRemove ? (
        <IconButton
          size="small"
          className="shrink-0 p-1"
          onClick={() => onRemove(id)}
          aria-label={t('editor.remove_answer')}
        >
          <DeleteOutlineIcon sx={{ fontSize: 20 }} />
        </IconButton>
      ) : (
        <Box className="w-8 shrink-0" />
      )}
    </Box>
  );
});

export default NumericalAnswerRow;
