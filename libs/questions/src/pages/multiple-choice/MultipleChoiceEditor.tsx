import { memo, useCallback, useState, useMemo } from 'react';
import {
  Box,
  Stack,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Typography,
  Snackbar,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import SelectionControls from './components/SelectionControls';
import ChoiceItem from './components/ChoiceItem';
import { useChoiceValidation } from './hooks/useChoiceValidation';

type ChoiceNumbering = 'none' | 'numeric' | 'upper_alpha' | 'lower_alpha' | 'roman';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

function AddMultipleChoice() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const watchedChoices = watch('choices');
  const choices: Choice[] = useMemo(() => watchedChoices || [], [watchedChoices]);
  const choiceNumbering: ChoiceNumbering = watch('choiceNumbering') || 'none';
  const minSelections: number = watch('minSelections') || 1;
  const maxSelections: number = watch('maxSelections') || 1;
  const allowPartialCredit: boolean = watch('allowPartialCredit') || false;
  const allowShuffle: boolean = watch('allowShuffle') || false;

  const validation = useChoiceValidation(choices, minSelections, maxSelections);

  const canDelete = useMemo(() => choices.length > 2, [choices.length]);
  const canAdd = useMemo(() => choices.length < 8, [choices.length]);

  const handleChoiceNumberingChange = useCallback(
    (event: SelectChangeEvent) => {
      setValue('choiceNumbering', event.target.value);
    },
    [setValue]
  );

  const handleMinSelectionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setValue('minSelections', value);
    },
    [setValue]
  );

  const handleMaxSelectionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = Number(event.target.value);
      if (allowPartialCredit && value < 2) {
        value = 2;
      }
      setValue('maxSelections', value);
    },
    [allowPartialCredit, setValue]
  );

  const handleAllowPartialCreditChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setValue('allowPartialCredit', checked);

      // Partial credit implies multi-answer authoring; ensure max selections allows >1.
      if (checked) {
        const nextMax = Math.max(2, Math.min(Math.max(maxSelections, 2), choices.length));
        if (nextMax !== maxSelections) {
          setValue('maxSelections', nextMax);
        }
        if (minSelections > nextMax) {
          setValue('minSelections', nextMax);
        }
      }
    },
    [choices.length, maxSelections, minSelections, setValue]
  );

  const handleAllowShuffleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue('allowShuffle', event.target.checked);
    },
    [setValue]
  );

  const handleChoiceTextChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, text: value } : c))
      );
    },
    [setValue, choices]
  );

  const handleChoiceCorrectToggle = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        const effectiveMaxSelections = allowPartialCredit ? choices.length : maxSelections;
        const currentCorrectCount = choices.filter((c) => c.isCorrect).length;
        if (currentCorrectCount >= effectiveMaxSelections) {
          setSnackbarMessage(
            t('editor.error_max_selections_exceeded', {
              max: effectiveMaxSelections,
              count: effectiveMaxSelections,
            })
          );
          return;
        }

        if (!allowPartialCredit && maxSelections === 1) {
          setValue(
            'choices',
            choices.map((c) => ({
              ...c,
              isCorrect: c.id === id,
            }))
          );
        } else {
          setValue(
            'choices',
            choices.map((c) => (c.id === id ? { ...c, isCorrect: true } : c))
          );
        }
      } else {
        setValue(
          'choices',
          choices.map((c) => (c.id === id ? { ...c, isCorrect: false } : c))
        );
      }
    },
    [allowPartialCredit, setValue, choices, maxSelections, t]
  );

  const handleChoiceFeedbackToggle = useCallback(
    (id: string, checked: boolean) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, feedbackEnabled: checked } : c))
      );
    },
    [setValue, choices]
  );

  const handleChoiceFeedbackTextChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, feedbackText: value } : c))
      );
    },
    [setValue, choices]
  );

  const handleDeleteChoice = useCallback(
    (id: string) => {
      if (choices.length <= 2) {
        return;
      }
      setValue(
        'choices',
        choices.filter((c) => c.id !== id)
      );
    },
    [setValue, choices]
  );

  const handleAddChoice = useCallback(() => {
    if (choices.length >= 8) {
      return;
    }
    setValue('choices', [
      ...choices,
      {
        id: crypto.randomUUID(),
        text: '',
        isCorrect: false,
        feedbackEnabled: false,
        feedbackText: '',
      },
    ]);
  }, [setValue, choices]);

  return (
    <Box className="flex flex-col gap-6">
      <SelectionControls
        choiceNumbering={choiceNumbering}
        minSelections={minSelections}
        maxSelections={maxSelections}
        onChoiceNumberingChange={handleChoiceNumberingChange}
        onMinSelectionsChange={handleMinSelectionsChange}
        onMaxSelectionsChange={handleMaxSelectionsChange}
        minError={validation.minError}
        maxError={validation.maxError}
        rangeError={validation.rangeError}
        validationErrors={validation.validationErrors}
      />

      <Box className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <Typography variant="body2" className="font-semibold" sx={{ color: 'text.primary' }}>
          {t('editor.choices')} *
        </Typography>
        <Box className="flex gap-4 items-center flex-wrap">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={allowPartialCredit}
                onChange={handleAllowPartialCreditChange}
              />
            }
            label={t('editor.allow_partial_credit')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={allowShuffle}
                onChange={handleAllowShuffleChange}
              />
            }
            label={t('editor.allow_shuffle')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
          />
        </Box>
      </Box>

      <Stack spacing={2}>
        {choices.map((choice, index) => (
          <Box key={choice.id}>
            <ChoiceItem
              choice={choice}
              index={index}
              canDelete={canDelete}
              onTextChange={handleChoiceTextChange}
              onCorrectToggle={handleChoiceCorrectToggle}
              onFeedbackToggle={handleChoiceFeedbackToggle}
              onFeedbackTextChange={handleChoiceFeedbackTextChange}
              onDelete={handleDeleteChoice}
            />
            {index < choices.length - 1 && <Divider className="my-2" />}
          </Box>
        ))}
      </Stack>

      <Button
        variant="text"
        startIcon={<AddIcon />}
        onClick={handleAddChoice}
        disabled={!canAdd}
        className="self-start normal-case text-sm"
      >
        {t('editor.add_choice')}
      </Button>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarMessage(null)}
          severity="warning"
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default memo(AddMultipleChoice);
