import 'mathlive';
import { type QuestionRow } from '../../components/QuestionsTable';
import {
  Box,
  TextField,
  useTheme,
  Button,
  styled,
  Typography,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
} from '@mui/material';
import { useState, useCallback, useMemo, useRef, useEffect, createElement } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

type NumericalQuestionViewProps = {
  question: QuestionRow;
};

type MathFieldElement = HTMLElement & {
  value: string;
  mathVirtualKeyboardPolicy?: 'auto' | 'manual' | 'sandboxed';
};

type UnitMathProps = {
  latex: string;
  size?: string;
};

const UnitMath = ({ latex, size = '0.95rem' }: UnitMathProps) => {
  const mathFieldRef = useRef<MathFieldElement | null>(null);

  useEffect(() => {
    if (!mathFieldRef.current) return;
    mathFieldRef.current.value = latex;
    mathFieldRef.current.mathVirtualKeyboardPolicy = 'manual';
  }, [latex]);

  return createElement('math-field', {
    ref: (node: MathFieldElement | null) => {
      mathFieldRef.current = node;
      if (!node) return;
      node.value = latex;
      node.mathVirtualKeyboardPolicy = 'manual';
    },
    'read-only': true,
    style: {
      display: 'inline-block',
      minHeight: '1.2rem',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      fontSize: size,
      pointerEvents: 'none',
      verticalAlign: 'middle',
    },
  });
};

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const SolutionBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.semantic.solution.background,
  border: `1px solid ${theme.palette.semantic.solution.border}`,
}));

const NumericalQuestionView = ({ question }: NumericalQuestionViewProps) => {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const { t } = useTranslation('questions');

  const numericalAnswers = useMemo(() => question.numericalAnswers ?? [], [question.numericalAnswers]);
  const numericalUnits = useMemo(() => question.numericalUnits ?? [], [question.numericalUnits]);
  const hasUnits = numericalUnits.length > 0;
  const unitHandling = question.numericalUnitHandling ?? 'disabled';
  const unitInputMethod = question.numericalUnitInputMethod ?? 'text_input';
  const unitPenaltyNum = Math.min(
    100,
    Math.max(0, Number(question.numericalUnitPenalty) || 0)
  );

  const normalizeUnit = useCallback((value: string) => {
    let s = value.trim().toLowerCase();
    s = s.replace(/\\?exponentiale/g, 'e');
    return s;
  }, []);

  const selectedUnit = useMemo(() => {
    if (!hasUnits) return undefined;
    const normalized = normalizeUnit(unitValue);
    if (!normalized) return undefined;
    return numericalUnits.find((u) => normalizeUnit(u.unit) === normalized);
  }, [hasUnits, normalizeUnit, numericalUnits, unitValue]);

  const parsedValue = useMemo(() => {
    if (inputValue === '') return undefined;
    const num = parseFloat(inputValue);
    return Number.isNaN(num) ? undefined : num;
  }, [inputValue]);

  const effectiveAnswerValue = useMemo(() => {
    if (parsedValue === undefined) return undefined;
    if (!hasUnits || !selectedUnit) return parsedValue;


    const multiplier = typeof selectedUnit.multiplier === 'number'
      ? selectedUnit.multiplier
      : (parseFloat(String(selectedUnit.multiplier)) || 1);
    return parsedValue / multiplier;
  }, [hasUnits, parsedValue, selectedUnit]);

  const matchedAnswer = useMemo(() => {
    if (!checked || effectiveAnswerValue === undefined) return undefined;
    return numericalAnswers.find(
      (a) => Math.abs(effectiveAnswerValue - a.answer) <= a.error
    );
  }, [checked, effectiveAnswerValue, numericalAnswers]);

  const hasUnitInput = useMemo(() => normalizeUnit(unitValue) !== '', [normalizeUnit, unitValue]);

  const unitIsValidForHandling = useMemo(() => {
    if (!hasUnits || unitHandling === 'disabled') return true;
    if (unitHandling === 'optional' && !hasUnitInput) return true;
    return !!selectedUnit;
  }, [hasUnitInput, hasUnits, selectedUnit, unitHandling]);

  const earnedMark = useMemo(() => {
    if (!checked || !matchedAnswer) return 0;
    if (
      hasUnits &&
      unitHandling === 'required' &&
      !unitIsValidForHandling &&
      unitInputMethod !== 'text_input'
    ) {
      return 0;
    }
    const shouldApplyUnitPenalty =
      hasUnits &&
      unitHandling === 'required' &&
      unitInputMethod === 'text_input' &&
      !unitIsValidForHandling;
    const markPercent = shouldApplyUnitPenalty
      ? Math.max(0, matchedAnswer.mark - unitPenaltyNum)
      : matchedAnswer.mark;
    return (markPercent / 100) * question.mark;
  }, [
    checked,
    hasUnits,
    matchedAnswer,
    question.mark,
    unitHandling,
    unitInputMethod,
    unitIsValidForHandling,
    unitPenaltyNum,
  ]);

  const isCorrect = checked && earnedMark >= question.mark;
  const isPartial = checked && earnedMark > 0 && earnedMark < question.mark;
  const isWrong = checked && earnedMark === 0;

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleRetry = useCallback(() => {
    setInputValue('');
    setUnitValue('');
    setChecked(false);
    setShowSolution(false);
  }, []);

  const handleShowSolution = useCallback(() => setShowSolution(true), []);

  return (
    <>
      <Box>
    
      {showSolution && numericalAnswers.length > 0 && (
        <SolutionBox className="p-4 mt-4 mb-4">
          <Box className="flex items-start gap-3 mb-3">
            <InfoOutlinedIcon
              className="text-xl mt-1 shrink-0"
              sx={{ color: theme.palette.info.light }}
            />
            <Typography
              component="span"
              className="font-semibold text-[0.95rem]"
              sx={{ color: theme.palette.text.primary }}
            >
              {t('correct_answers_are')}
            </Typography>
          </Box>
          <Box component="ul" className="m-0 pl-9 list-none">
            {numericalAnswers.flatMap((a, i) => {
              const mult = (u: { multiplier: number | string }) =>
                typeof u.multiplier === 'number' ? u.multiplier : (parseFloat(String(u.multiplier)) || 1);
              if (hasUnits && numericalUnits.length > 0) {
                return numericalUnits.map((u) => (
                  <Box
                    component="li"
                    key={`${a.id ?? i}-${u.id}`}
                    className="text-[0.95rem] mb-1 last:mb-0"
                    sx={{ color: theme.palette.info.light, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0 0.25em' }}
                  >
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                      {a.mark}% {a.answer * mult(u)} <UnitMath latex={u.unit} size="0.9rem" />
                    </Box>
                    {a.error ? (
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                        ± {a.error * mult(u)} <UnitMath latex={u.unit} size="0.9rem" />
                      </Box>
                    ) : null}
                  </Box>
                ));
              }
              return [
                <Box
                  component="li"
                  key={a.id ?? i}
                  className="text-[0.95rem] mb-1 last:mb-0"
                  sx={{ color: theme.palette.info.light }}
                >
                  {a.mark}% {a.answer}
                  {a.error ? ` ± ${a.error}` : ''}
                </Box>,
              ];
            })}
          </Box>
        </SolutionBox>
      )}


        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('editor.add_answer')}
            fullWidth={!hasUnits}
            size="small"
            type="number"
            disabled={checked}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            slotProps={{ htmlInput: { step: 'any' } }}
            sx={{
              flex: hasUnits ? '1 1 260px' : undefined,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: isCorrect
                  ? theme.palette.success.main
                  : isPartial
                    ? theme.palette.warning.main
                    : isWrong
                      ? theme.palette.error.main
                      : theme.palette.background.paper,
              },
            }}
          />

          {hasUnits && unitInputMethod === 'drop_down' && (
            <FormControl size="small" sx={{ minWidth: 200, flex: '0 0 200px' }}>
              <Select
                displayEmpty
                disabled={checked}
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                renderValue={(selected) =>
                  selected ? <UnitMath latex={String(selected)} /> : <em>Select unit</em>
                }
              >
                <MenuItem value="">
                  <em>Select unit</em>
                </MenuItem>
                {numericalUnits.map((u) => (
                  <MenuItem key={u.id} value={u.unit}>
                    <UnitMath latex={u.unit} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {hasUnits && unitInputMethod === 'text_input' && (
            <TextField
              placeholder="Unit"
              size="small"
              disabled={checked}
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              sx={{ minWidth: 200, flex: '0 0 200px' }}
            />
          )}

          {hasUnits && unitInputMethod === 'multiple_choice_selection' && (
            <FormControl sx={{ flex: '1 1 260px', minWidth: 240 }}>
              <RadioGroup
                row
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
              >
                {numericalUnits.map((u) => (
                  <FormControlLabel
                    key={u.id}
                    value={u.unit}
                    control={<Radio size="small" disabled={checked} />}
                    label={<UnitMath latex={u.unit} />}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          )}
        </Box>
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4 mt-6">
        <Box className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={
              inputValue === '' ||
              (hasUnits &&
                unitHandling === 'required' &&
                (unitInputMethod === 'text_input' ? !unitValue.trim() : !unitIsValidForHandling))
            }
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={{ borderRadius: theme.spacing(1.5) }}
          >
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !isCorrect && !showSolution && (
            <Button
              onClick={handleShowSolution}
              variant="contained"
              startIcon={<LightbulbIcon />}
              className="normal-case font-semibold"
              sx={{ borderRadius: theme.spacing(1.5) }}
            >
              {t('show_solution')}
            </Button>
          )}
        </Box>
        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">
          {checked
            ? `${Number.isInteger(earnedMark) ? earnedMark : Number(earnedMark.toFixed(1))}/${question.mark}`
            : question.mark}
        </MarkBox>
      </Box>
    </>
  );
};

export default NumericalQuestionView;
