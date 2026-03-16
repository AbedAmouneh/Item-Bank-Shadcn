import { memo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Divider,
  Alert,
  Collapse,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

type ChoiceNumbering = 'none' | 'numeric' | 'upper_alpha' | 'lower_alpha' | 'roman';

type SelectionControlsProps = {
  choiceNumbering: ChoiceNumbering;
  minSelections: number;
  maxSelections: number;
  onChoiceNumberingChange: (event: SelectChangeEvent) => void;
  onMinSelectionsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMaxSelectionsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  minError: boolean;
  maxError: boolean;
  rangeError: boolean;
  validationErrors?: string[];
};

function SelectionControls({
  choiceNumbering,
  minSelections,
  maxSelections,
  onChoiceNumberingChange,
  onMinSelectionsChange,
  onMaxSelectionsChange,
  minError,
  maxError,
  rangeError,
  validationErrors = [],
}: SelectionControlsProps) {
  const { t } = useTranslation('questions');

  return (
    <>
      <Collapse in={validationErrors.length > 0}>
        <Alert severity="error" className="mb-6">
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {t('editor.validation_errors')}
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>
                <Typography variant="body2">{error}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      </Collapse>

      <Box className="flex gap-6 flex-wrap items-end mb-6 justify-between">
        <FormControl className="min-w-[200px]" size="small">
          <InputLabel id="choice-numbering-label">
            {t('editor.choice_numbering')} *
          </InputLabel>
          <Select
            labelId="choice-numbering-label"
            value={choiceNumbering}
            label={`${t('editor.choice_numbering')} *`}
            onChange={onChoiceNumberingChange}
          >
            <MenuItem value="none">{t('editor.no_numbering')}</MenuItem>
            <MenuItem value="numeric">{t('editor.numbering_numeric')}</MenuItem>
            <MenuItem value="upper_alpha">{t('editor.numbering_upper_alpha')}</MenuItem>
            <MenuItem value="lower_alpha">{t('editor.numbering_lower_alpha')}</MenuItem>
            <MenuItem value="roman">{t('editor.numbering_roman')}</MenuItem>
          </Select>
        </FormControl>

        <Box className="flex items-center gap-4">
          <Typography
            variant="body2"
            className="text-sm whitespace-nowrap min-w-fit"
            sx={{ color: 'text.secondary' }}
          >
            {t('editor.num_selections_allowed')}
          </Typography>
          <Box className="flex gap-3 items-start">
            <TextField
              label={`${t('editor.min')} *`}
              type="number"
              size="small"
              value={minSelections}
              onChange={onMinSelectionsChange}
              error={minError || rangeError}
              helperText={
                minError
                  ? t('editor.error_min_gte_one')
                  : rangeError
                  ? t('editor.error_min_lte_max')
                  : ''
              }
              slotProps={{
                htmlInput: { min: 1, step: 1 },
              }}
              className="w-20 [&_.MuiInputBase-root]:text-sm [&_.MuiInputLabel-root]:text-sm"
            />
            <TextField
              label={`${t('editor.max')} *`}
              type="number"
              size="small"
              value={maxSelections}
              onChange={onMaxSelectionsChange}
              error={maxError || rangeError}
              helperText={
                maxError
                  ? t('editor.error_max_gte_one')
                  : rangeError
                  ? t('editor.error_max_gte_min')
                  : ''
              }
              slotProps={{
                htmlInput: { min: 1, step: 1 },
              }}
              className="w-20 [&_.MuiInputBase-root]:text-sm [&_.MuiInputLabel-root]:text-sm"
            />
          </Box>
        </Box>
      </Box>

      <Divider />
    </>
  );
}

export default memo(SelectionControls);
