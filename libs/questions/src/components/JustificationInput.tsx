import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@item-bank/ui'
import { useTranslation } from 'react-i18next'
import { memo } from 'react'

export type JustificationMode = 'disabled' | 'optional' | 'required'

type JustificationInputProps = {
  mode: JustificationMode
  fraction: number
  onModeChange: (mode: JustificationMode) => void
  onFractionChange: (fraction: number) => void
}

function JustificationInput({ mode, fraction, onModeChange, onFractionChange }: JustificationInputProps) {
  const { t } = useTranslation('questions')

  return (
    <div className="flex gap-4 flex-wrap items-end">
      <div className="min-w-[200px]">
        <Select value={mode} onValueChange={(v) => onModeChange(v as JustificationMode)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={t('editor.drag_drop_image.justification_mode_label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="disabled">{t('editor.drag_drop_image.justification_mode_disabled')}</SelectItem>
            <SelectItem value="optional">{t('editor.drag_drop_image.justification_mode_optional')}</SelectItem>
            <SelectItem value="required">{t('editor.drag_drop_image.justification_mode_required')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode !== 'disabled' && (
        <Input
          type="number"
          value={fraction}
          onChange={(e) => onFractionChange(Number(e.target.value))}
          min={0}
          max={100}
          step={1}
          className="w-40 text-sm"
          placeholder={t('editor.drag_drop_image.justification_fraction_label')}
        />
      )}
    </div>
  )
}

export default memo(JustificationInput)
