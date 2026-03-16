import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

export function useChoiceValidation(
  choices: Choice[],
  minSelections: number,
  maxSelections: number
) {
  const { t } = useTranslation('questions');

  return useMemo(() => {
    const minError = minSelections < 1;
    const maxError = maxSelections < 1;
    const rangeError = minSelections > maxSelections;

    const correctChoicesCount = choices.filter((c) => c.isCorrect).length;
    const correctCountError =
      correctChoicesCount > 0 &&
      (correctChoicesCount < minSelections || correctChoicesCount > maxSelections);

    const hasEmptyChoices = choices.some((c) => !c.text.trim());
    const noCorrectChoices = correctChoicesCount === 0;

    const validationErrors: string[] = [];

    if (minError) {
      validationErrors.push(t('editor.error_min_gte_one'));
    }
    if (maxError) {
      validationErrors.push(t('editor.error_max_gte_one'));
    }
    if (rangeError) {
      validationErrors.push(t('editor.error_min_lte_max'));
    }
    if (hasEmptyChoices) {
      validationErrors.push(t('editor.error_empty_choices'));
    }
    if (noCorrectChoices) {
      validationErrors.push(t('editor.error_no_correct_choices'));
    }
    if (correctCountError) {
      validationErrors.push(
        t('editor.error_correct_count_range', {
          count: correctChoicesCount,
          min: minSelections,
          max: maxSelections,
        })
      );
    }

    return {
      minError,
      maxError,
      rangeError,
      correctCountError,
      hasEmptyChoices,
      noCorrectChoices,
      validationErrors,
      hasErrors: validationErrors.length > 0,
    };
  }, [choices, minSelections, maxSelections, t]);
}
