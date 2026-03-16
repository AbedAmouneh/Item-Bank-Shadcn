import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';

export type JustificationMode = 'disabled' | 'optional' | 'required';

type JustificationInputProps = {
  mode: JustificationMode;
  fraction: number;
  onModeChange: (mode: JustificationMode) => void;
  onFractionChange: (fraction: number) => void;
};

function JustificationInput({ mode, fraction, onModeChange, onFractionChange }: JustificationInputProps) {
  const { t } = useTranslation('questions');

  return (
    <Box className="flex gap-4 flex-wrap items-end">
      <FormControl size="small" style={{ minWidth: 200 }}>
        <InputLabel>{t('editor.drag_drop_image.justification_mode_label')}</InputLabel>
        <Select
          label={t('editor.drag_drop_image.justification_mode_label')}
          value={mode}
          onChange={(e) => onModeChange(e.target.value as JustificationMode)}
        >
          <MenuItem value="disabled">{t('editor.drag_drop_image.justification_mode_disabled')}</MenuItem>
          <MenuItem value="optional">{t('editor.drag_drop_image.justification_mode_optional')}</MenuItem>
          <MenuItem value="required">{t('editor.drag_drop_image.justification_mode_required')}</MenuItem>
        </Select>
      </FormControl>

      {mode !== 'disabled' && (
        <TextField
          label={t('editor.drag_drop_image.justification_fraction_label')}
          type="number"
          value={fraction}
          onChange={(e) => onFractionChange(Number(e.target.value))}
          size="small"
          inputProps={{ min: 0, max: 100, step: 1 }}
          style={{ width: 160 }}
        />
      )}
    </Box>
  );
}

export default memo(JustificationInput);
