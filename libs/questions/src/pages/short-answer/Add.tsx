import { memo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

export type AnswerEntry = {
  id: string;
  text: string;
  mark: number;
  ignoreCasing: boolean;
  feedback: boolean;
};

export function createEmptyAnswer(id?: string): AnswerEntry {
  return {
    id: id ?? crypto.randomUUID(),
    text: '',
    mark: 100,
    ignoreCasing: true,
    feedback: false,
  };
}

type AnswerRowProps = {
  answer: AnswerEntry;
  onChange: (id: string, field: keyof AnswerEntry, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

const AnswerRow = memo(function AnswerRow({
  answer,
  onChange,
  onRemove,
  canRemove,
}: AnswerRowProps) {
  const { t } = useTranslation('questions');
  const id = answer.id;
  return (
    <Box
      className="flex items-center gap-3 p-3 w-full box-border min-w-0 rounded border"
      sx={(theme) => ({
        backgroundColor: theme.palette.action.hover,
        borderColor: theme.palette.divider,
      })}
    >
      <TextField
        placeholder={t('editor.add_answer')}
        value={answer.text}
        onChange={(e) => onChange(id, 'text', e.target.value)}
        size="small"
        className="flex-[0_0_36%] min-w-0 [&_.MuiOutlinedInput-root]:text-[0.8125rem] [&_.MuiOutlinedInput-root]:h-[34px] [&_.MuiOutlinedInput-input]:py-1.5 [&_.MuiOutlinedInput-input]:px-2.5"
        sx={(theme) => ({
          '& .MuiOutlinedInput-root': { backgroundColor: theme.palette.background.paper },
        })}
      />

      <Box className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <FormControl size="small" className="min-w-[82px]">
          <InputLabel id={`mark-label-${id}`}>{t('mark')} *</InputLabel>
          <Select
            labelId={`mark-label-${id}`}
            value={answer.mark}
            label={`${t('mark')} *`}
            onChange={(e) => onChange(id, 'mark', Number(e.target.value))}
            className="h-[34px]"
            sx={(theme) => ({
              fontSize: '0.8125rem',
              '& .MuiSelect-select': { py: 0.6 },
            })}
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
              checked={answer.ignoreCasing}
              onChange={(e) => onChange(id, 'ignoreCasing', e.target.checked)}
              color="primary"
              sx={{ '& .MuiSwitch-root': { p: 0.5 } }}
            />
          }
          label={t('editor.ignore_casing')}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
        />

        <FormControlLabel
          className="shrink-0"
          control={
            <Switch
              size="small"
              checked={answer.feedback}
              onChange={(e) => onChange(id, 'feedback', e.target.checked)}
              color="primary"
              sx={{ '& .MuiSwitch-root': { p: 0.5 } }}
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
    </Box>
  );
});

function Add() {
  const { watch, setValue, formState: { errors } } = useFormContext();
  const { t } = useTranslation('questions');

  const answers = (watch('answers') || [createEmptyAnswer()]) as AnswerEntry[];
  const answersRef = useRef<AnswerEntry[]>(answers);
  answersRef.current = answers;

  const onAnswerChange = useCallback(
    (id: string, field: keyof AnswerEntry, newValue: unknown) => {
      setValue(
        'answers',
        answersRef.current.map((a) =>
          a.id === id ? { ...a, [field]: newValue } : a
        )
      );
    },
    [setValue]
  );

  const onAnswerRemove = useCallback(
    (id: string) => {
      setValue(
        'answers',
        answersRef.current.filter((a) => a.id !== id)
      );
    },
    [setValue]
  );

  const handleAddAnswer = useCallback(() => {
    setValue('answers', [
      ...answersRef.current,
      createEmptyAnswer(),
    ]);
  }, [setValue]);
  const canRemove = answers.length > 1;

  return (
    <Box className="flex flex-col gap-4">
      <Typography
        variant="body2"
        component="label"
        className="block text-[0.8125rem] font-normal leading-tight"
        sx={{ color: 'text.secondary' }}
      >
        {t('editor.answers')} <Box component="span" className="text-red-600">*</Box>
      </Typography>
      {errors.answers?.message && (
        <Typography variant="caption" color="error" className="block -mt-2">
          {errors.answers.message}
        </Typography>
      )}

      {answers.map((answer) => (
        <AnswerRow
          key={answer.id}
          answer={answer}
          onChange={onAnswerChange}
          onRemove={onAnswerRemove}
          canRemove={canRemove}
        />
      ))}

      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddAnswer}
        className="self-start normal-case font-medium"
      >
        {t('editor.add_answer')}
      </Button>
    </Box>
  );
}

export default memo(Add);
