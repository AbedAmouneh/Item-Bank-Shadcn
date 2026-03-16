import { useCallback, memo } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

function Add() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const correctAnswer = watch('correctAnswer') || 'True';

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue('correctAnswer', event.target.value as 'True' | 'False');
  }, [setValue]);

  return (
    <Box className="flex flex-col gap-3">
      <Typography
        variant="body2"
        component="label"
        className="block text-[0.8125rem] font-normal leading-tight"
        sx={{ color: 'text.secondary' }}
      >
        {t('editor.correct_answer')}
      </Typography>

      <FormControl component="fieldset">
        <RadioGroup
          row
          name="correct-answer-group"
          value={correctAnswer}
          onChange={handleChange}
          className="gap-4"
        >
          <FormControlLabel
            value="True"
            control={<Radio color="primary" />}
            label={t('editor.true')}
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
                color: 'text.secondary',
              },
            }}
          />
          <FormControlLabel
            value="False"
            control={<Radio color="primary" />}
            label={t('editor.false')}
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
                color: 'text.secondary',
              },
            }}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}

export default memo(Add);