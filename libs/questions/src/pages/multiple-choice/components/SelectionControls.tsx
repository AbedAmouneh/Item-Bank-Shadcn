import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@item-bank/ui';

type ChoiceNumbering = 'none' | 'numeric' | 'upper_alpha' | 'lower_alpha' | 'roman';

type SelectionControlsProps = {
  choiceNumbering: ChoiceNumbering;
  minSelections: number;
  maxSelections: number;
  onChoiceNumberingChange: (value: string) => void;
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
    <div className="flex flex-col gap-6">

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <p className="font-semibold text-xs">{t('editor.validation_errors')}</p>
          <ul className="list-disc ps-5 space-y-0.5">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-xs">{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-6 flex-wrap items-end justify-between">

        {/* Choice numbering select */}
        <div className="min-w-[200px] flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('editor.choice_numbering')} *
          </label>
          <Select value={choiceNumbering} onValueChange={onChoiceNumberingChange}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('editor.no_numbering')}</SelectItem>
              <SelectItem value="numeric">{t('editor.numbering_numeric')}</SelectItem>
              <SelectItem value="upper_alpha">{t('editor.numbering_upper_alpha')}</SelectItem>
              <SelectItem value="lower_alpha">{t('editor.numbering_lower_alpha')}</SelectItem>
              <SelectItem value="roman">{t('editor.numbering_roman')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min/max selections */}
        <div className="flex items-end gap-4">
          <span className="text-sm text-muted-foreground whitespace-nowrap pb-2">
            {t('editor.num_selections_allowed')}
          </span>
          <div className="flex gap-3 items-start">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">{t('editor.min')} *</label>
              <Input
                type="number"
                value={minSelections}
                onChange={onMinSelectionsChange}
                min={1}
                step={1}
                className={`w-20 text-sm ${(minError || rangeError) ? 'border-destructive' : ''}`}
              />
              {(minError || rangeError) && (
                <p className="text-xs text-destructive">
                  {minError ? t('editor.error_min_gte_one') : t('editor.error_min_lte_max')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">{t('editor.max')} *</label>
              <Input
                type="number"
                value={maxSelections}
                onChange={onMaxSelectionsChange}
                min={1}
                step={1}
                className={`w-20 text-sm ${(maxError || rangeError) ? 'border-destructive' : ''}`}
              />
              {(maxError || rangeError) && (
                <p className="text-xs text-destructive">
                  {maxError ? t('editor.error_max_gte_one') : t('editor.error_max_gte_min')}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      <hr className="border-border" />

    </div>
  );
}

export default memo(SelectionControls);
