import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import NumericalAnswerRow from './NumericalAnswerRow';
import NumericalUnitRow from './NumericalUnitRow';
import {
  type NumericalAnswerEntry,
  type NumericalUnit,
  type NumericalUnitHandling,
  type NumericalUnitInputMethod,
  UNIT_HANDLING_OPTIONS,
  UNIT_INPUT_METHOD_OPTIONS,
  createEmptyNumericalAnswer,
  createEmptyNumericalUnit,
  latexUnitToPlainText,
} from './types';

function NumericalEditor() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const answers = (watch('numericalAnswers') || [createEmptyNumericalAnswer()]) as NumericalAnswerEntry[];
  const unitHandling = (watch('numericalUnitHandling') || 'disabled') as NumericalUnitHandling;
  const unitInputMethod = (watch('numericalUnitInputMethod') || 'text_input') as NumericalUnitInputMethod;
  const unitPenalty = watch('numericalUnitPenalty') ?? '0';
  const units = (watch('numericalUnits') || [createEmptyNumericalUnit()]) as NumericalUnit[];

  const answersRef = useRef<NumericalAnswerEntry[]>(answers);
  answersRef.current = answers;
  const unitsRef = useRef<NumericalUnit[]>(units);
  unitsRef.current = units;

  const showUnits = unitHandling === 'optional' || unitHandling === 'required';
  const showCalculatorIcon = unitInputMethod !== 'text_input';

  const prevUnitInputMethodRef = useRef<NumericalUnitInputMethod>(unitInputMethod);
  useEffect(() => {
    if (prevUnitInputMethodRef.current !== 'text_input' && unitInputMethod === 'text_input') {
      const converted = unitsRef.current.map((u) => ({
        ...u,
        unit: latexUnitToPlainText(u.unit),
      }));
      setValue('numericalUnits', converted);
    }
    prevUnitInputMethodRef.current = unitInputMethod;
  }, [unitInputMethod, setValue]);

  // --- Answer handlers ---
  const onAnswerChange = useCallback(
    (id: string, field: keyof NumericalAnswerEntry, newValue: unknown) => {
      setValue(
        'numericalAnswers',
        answersRef.current.map((a) => (a.id === id ? { ...a, [field]: newValue } : a))
      );
    },
    [setValue]
  );

  const onAnswerRemove = useCallback(
    (id: string) => {
      setValue('numericalAnswers', answersRef.current.filter((a) => a.id !== id));
    },
    [setValue]
  );

  const handleAddAnswer = useCallback(() => {
    setValue('numericalAnswers', [...answersRef.current, createEmptyNumericalAnswer()]);
  }, [setValue]);

  // --- Unit handlers ---
  const onUnitChange = useCallback(
    (id: string, field: keyof NumericalUnit, newValue: string) => {
      setValue(
        'numericalUnits',
        unitsRef.current.map((u) => (u.id === id ? { ...u, [field]: newValue } : u))
      );
    },
    [setValue]
  );

  const onUnitRemove = useCallback(
    (id: string) => {
      setValue('numericalUnits', unitsRef.current.filter((u) => u.id !== id));
    },
    [setValue]
  );

  const handleAddUnit = useCallback(() => {
    setValue('numericalUnits', [...unitsRef.current, createEmptyNumericalUnit()]);
  }, [setValue]);

  const canRemoveAnswer = answers.length > 1;
  const canRemoveUnit = units.length > 1;

  return (
    <Box className="flex flex-col gap-4">
      {/* Answers section */}
      <Typography
        variant="body2"
        component="label"
        className="block text-[0.8125rem] font-normal leading-tight"
        sx={{ color: 'text.secondary' }}
      >
        {t('editor.answers')} <Box component="span" sx={{ color: 'error.main' }}>*</Box>
      </Typography>

      {answers.map((answer, index) => (
        <NumericalAnswerRow
          key={answer.id}
          answer={answer}
          index={index}
          onChange={onAnswerChange}
          onRemove={onAnswerRemove}
          canRemove={canRemoveAnswer}
        />
      ))}

      <Button
        variant="text"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddAnswer}
        className="self-start normal-case font-medium"
      >
        {t('editor.add_answer')}
      </Button>

      <Divider />

      {/* Unit handling row */}
      <Box className="flex items-center gap-3 flex-wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Unit handling</InputLabel>
          <Select
            value={unitHandling}
            label="Unit handling"
            onChange={(e) => setValue('numericalUnitHandling', e.target.value as NumericalUnitHandling)}
            renderValue={(selected) => {
              const opt = UNIT_HANDLING_OPTIONS.find((o) => o.value === selected);
              return opt?.label ?? selected;
            }}
          >
            {UNIT_HANDLING_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Box>
                  <Typography variant="body2" className="font-medium leading-snug">
                    {opt.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                    className="leading-snug block"
                  >
                    {opt.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {unitHandling === 'required' && (
          <>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Unit is entered using</InputLabel>
              <Select
                value={unitInputMethod}
                label="Unit is entered using"
                onChange={(e) => setValue('numericalUnitInputMethod', e.target.value as NumericalUnitInputMethod)}
              >
                {UNIT_INPUT_METHOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Unit penalty (%) *"
              value={unitPenalty}
              onChange={(e) => setValue('numericalUnitPenalty', e.target.value)}
              type="number"
              size="small"
              sx={{ width: 160 }}
              slotProps={{ htmlInput: { step: 1, min: 0, max: 100 } }}
            />
          </>
        )}
      </Box>

      {/* Units list */}
      {showUnits && (
        <Box className="flex flex-col gap-4">
          <Typography
            variant="body2"
            component="label"
            className="block text-[0.8125rem] font-normal leading-tight"
            sx={{ color: 'text.secondary' }}
          >
            Units <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>

          {units.map((unit, index) => (
            <NumericalUnitRow
              key={unit.id}
              unit={unit}
              index={index}
              showCalculatorIcon={showCalculatorIcon}
              onChange={onUnitChange}
              onRemove={onUnitRemove}
              canRemove={canRemoveUnit}
            />
          ))}

          <Button
            variant="text"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddUnit}
            className="self-start normal-case font-medium"
          >
            Add Unit
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default memo(NumericalEditor);
