import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Radio,
  Switch,
  TextField,
  Typography,
  alpha,
  styled,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

type SelectWordOption = { id: string; text: string; isCorrect: boolean };
type SelectWordGroup = { key: string; options: SelectWordOption[] };

const KEY_REGEX = /\[\[([^\]]+)\]\]/g;

function parseKeysFromText(text: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  KEY_REGEX.lastIndex = 0;
  while ((m = KEY_REGEX.exec(text)) !== null) {
    const key = m[1].trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function createDefaultGroup(key: string): SelectWordGroup {
  return {
    key,
    options: [
      { id: crypto.randomUUID(), text: '', isCorrect: true },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
    ],
  };
}

const GroupCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
  backgroundColor: theme.palette.action.hover,
}));

function SelectCorrectWordEditor({ questionText }: { questionText?: string }) {
  const { watch, setValue, register, unregister } = useFormContext();
  const { t } = useTranslation('questions');

  const watchedGroups = watch('selectWordGroups');
  const groups: SelectWordGroup[] = useMemo(() => watchedGroups ?? [], [watchedGroups]);
  const allowPartialCredit: boolean = watch('allowPartialCreditScoring') ?? false;

  const parsedKeys = useMemo(() => parseKeysFromText(questionText ?? ''), [questionText]);
  const lastSyncedSig = useRef<string | null>(null);

  useEffect(() => {
    register('selectWordGroups', {
      validate: {
        minOptions: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.length >= 2) ||
          t('editor.select_correct_word.error_min_options', { defaultValue: 'Each key must have at least 2 options.' }),
        exactlyOneCorrect: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.filter((o) => o.isCorrect).length === 1) ||
          t('editor.select_correct_word.error_no_correct', { defaultValue: 'Each key must have exactly one correct option.' }),
        noEmptyOptions: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.every((o) => o.text.trim())) ||
          t('editor.select_correct_word.error_empty_options', { defaultValue: 'All options must have text before saving.' }),
      },
    });
    return () => {
      unregister('selectWordGroups', { keepValue: true });
    };
  }, [register, unregister, t]);

  useEffect(() => {
    const sig = JSON.stringify(parsedKeys);
    if (sig === lastSyncedSig.current) return;

    const existingByKey = new Map(groups.map((g) => [g.key, g.options]));
    const newGroups: SelectWordGroup[] = parsedKeys.map((key) => {
      const existing = existingByKey.get(key);
      if (existing && existing.length >= 2) return { key, options: existing };
      return createDefaultGroup(key);
    });

    const unchanged =
      newGroups.length === groups.length &&
      newGroups.every((g, i) => {
        const cur = groups[i];
        return cur?.key === g.key && cur?.options === g.options;
      });

    lastSyncedSig.current = sig;
    if (!unchanged) setValue('selectWordGroups', newGroups);
  }, [parsedKeys, groups, setValue]);

  const handleOptionText = useCallback(
    (groupKey: string, optId: string, text: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : { ...g, options: g.options.map((o) => (o.id === optId ? { ...o, text } : o)) }
        )
      );
    },
    [groups, setValue]
  );

  const handleSetCorrect = useCallback(
    (groupKey: string, optId: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : { ...g, options: g.options.map((o) => ({ ...o, isCorrect: o.id === optId })) }
        )
      );
    },
    [groups, setValue]
  );

  const handleAddOption = useCallback(
    (groupKey: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : {
                ...g,
                options: [...g.options, { id: crypto.randomUUID(), text: '', isCorrect: false }],
              }
        )
      );
    },
    [groups, setValue]
  );

  const handleDeleteOption = useCallback(
    (groupKey: string, optId: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) => {
          if (g.key !== groupKey || g.options.length <= 2) return g;
          const filtered = g.options.filter((o) => o.id !== optId);
          const hasCorrect = filtered.some((o) => o.isCorrect);
          return {
            ...g,
            options: hasCorrect
              ? filtered
              : filtered.map((o, i) => (i === 0 ? { ...o, isCorrect: true } : o)),
          };
        })
      );
    },
    [groups, setValue]
  );

  const hasKeys = parsedKeys.length >= 1;
  const hasGroupErrors = groups.some(
    (g) => g.options.length < 2 || g.options.filter((o) => o.isCorrect).length !== 1
  );
  const hasEmptyOptions = groups.some((g) => g.options.some((o) => !o.text.trim()));

  if (!hasKeys) {
    return (
      <Typography
        role="alert"
        className="text-sm"
        sx={(theme) => ({ color: theme.palette.error.main })}
      >
        {t('editor.select_correct_word.error_no_keys', { defaultValue: 'Use [[key]] in the question text to add selectable word groups.' })}
      </Typography>
    );
  }

  return (
    <Box className="flex flex-col gap-6">
      <Box className="flex justify-between items-center flex-wrap gap-4">
        <Typography variant="body2" className="font-semibold" sx={{ color: 'text.primary' }}>
          {t('editor.select_correct_word.options_label', { defaultValue: 'Options by key' })} *
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={allowPartialCredit}
              onChange={(e) => setValue('allowPartialCreditScoring', e.target.checked)}
            />
          }
          label={t('editor.select_correct_word.partial_credit', { defaultValue: 'Allow partial credit' })}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
        />
      </Box>

      {groups.map((group) => (
        <GroupCard className="flex flex-col gap-2 p-4 rounded-2xl" key={group.key}>
          <Typography
            variant="body2"
            className="font-semibold text-sm"
            sx={(theme) => ({ color: theme.palette.text.secondary })}
          >
            {group.key}
          </Typography>
          {group.options.map((option, optIndex) => (
            <Box key={option.id} className="flex items-center gap-2">
              <Radio
                size="small"
                checked={option.isCorrect}
                onChange={() => handleSetCorrect(group.key, option.id)}
                className="shrink-0"
                title={t('editor.select_correct_word.correct_label', { defaultValue: 'Mark as correct' })}
              />
              <TextField
                value={option.text}
                onChange={(e) => handleOptionText(group.key, option.id, e.target.value)}
                placeholder={t('editor.select_correct_word.option_placeholder', {
                  index: optIndex + 1,
                  defaultValue: 'Option {{index}}...',
                })}
                size="small"
                className="flex-1"
                error={!option.text.trim()}
              />
              <IconButton
                size="small"
                onClick={() => handleDeleteOption(group.key, option.id)}
                disabled={group.options.length <= 2}
                className="shrink-0"
                sx={{ color: 'error.main', '&:disabled': { opacity: 0.3 } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="text"
            startIcon={<AddIcon />}
            onClick={() => handleAddOption(group.key)}
            className="self-start normal-case text-sm"
          >
            {t('editor.select_correct_word.add_option', { defaultValue: 'Add option' })}
          </Button>
        </GroupCard>
      ))}

      {hasGroupErrors && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.select_correct_word.error_no_correct')}
        </Alert>
      )}
      {hasEmptyOptions && (
        <Alert severity="warning" variant="outlined" className="text-sm">
          {t('editor.select_correct_word.error_empty_options')}
        </Alert>
      )}
    </Box>
  );
}

export default memo(SelectCorrectWordEditor);
