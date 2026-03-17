import { memo, useCallback, useMemo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { cn, Input } from '@item-bank/ui';

const defaultToolbar = 'bold italic underline | bullist numlist | outdent indent | undo redo | link';

function RecordAudioEditor() {
  const { watch, setValue } = useFormContext();
  const { t, i18n } = useTranslation('questions');

  const informationForGraders = watch('informationForGraders') ?? '';
  const numberOfRecordingsMin = watch('numberOfRecordingsMin') ?? 1;
  const numberOfRecordingsMax = watch('numberOfRecordingsMax') ?? 1;
  const recordingDurationMinSeconds = watch('recordingDurationMinSeconds') ?? 10;
  const recordingDurationMaxSeconds = watch('recordingDurationMaxSeconds') ?? 30;

  const recordingsRangeError = useMemo(() => {
    const min = Number(numberOfRecordingsMin);
    const max = Number(numberOfRecordingsMax);
    if (min > max) return t('editor.record_audio.min_lte_max_recordings') ?? 'Min must be ≤ max';
    return null;
  }, [numberOfRecordingsMin, numberOfRecordingsMax, t]);

  const durationRangeError = useMemo(() => {
    const min = Number(recordingDurationMinSeconds);
    const max = Number(recordingDurationMaxSeconds);
    if (min > max) return t('editor.record_audio.min_lte_max_duration') ?? 'Min must be ≤ max';
    return null;
  }, [recordingDurationMinSeconds, recordingDurationMaxSeconds, t]);

  const handleRecordingsMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('numberOfRecordingsMin', v ?? 1);
    },
    [setValue]
  );

  const handleRecordingsMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('numberOfRecordingsMax', v ?? 1);
    },
    [setValue]
  );

  const handleDurationMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('recordingDurationMinSeconds', v ?? 10);
    },
    [setValue]
  );

  const handleDurationMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('recordingDurationMaxSeconds', v ?? 30);
    },
    [setValue]
  );

  const recordingsLabel = t('editor.record_audio.number_of_recordings_allowed') ?? 'Number of recordings allowed';
  const durationLabel = t('editor.record_audio.recording_duration_seconds') ?? 'Recording duration (in seconds)';
  const minLabel = t('editor.record_audio.min') ?? 'min';
  const maxLabel = t('editor.record_audio.max') ?? 'max';
  const informationForGradersLabel = t('editor.record_audio.information_for_graders') ?? 'Information for graders';

  const graderEditorInit = useMemo(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const contentStyle = isDarkMode
      ? 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #0f0f0f; color: rgba(255,255,255,0.9); }'
      : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; }';
    return {
      height: 200,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link'],
      toolbar: defaultToolbar,
      toolbar_mode: 'floating' as const,
      statusbar: false,
      content_style: contentStyle,
    };
  }, [i18n.language]);

  return (
    <div className="flex flex-col gap-4">
      {/* Information for graders */}
      <div>
        <p className="text-sm mb-3 font-medium text-muted-foreground">{informationForGradersLabel}</p>
        <div
          className={cn(
            'rounded-xl overflow-hidden border transition-all',
            'border-border focus-within:border-primary/60',
            '[&_.tox-tinymce]:border-none [&_.tox-tinymce]:rounded-none'
          )}
        >
          <Editor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            licenseKey="gpl"
            value={informationForGraders}
            onEditorChange={(value) => setValue('informationForGraders', value, { shouldValidate: false })}
            init={graderEditorInit}
          />
        </div>
      </div>

      {/* Number of recordings */}
      <div className="rounded-lg border border-border bg-card/60 p-6 mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-4">{recordingsLabel}</p>
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-muted-foreground">{minLabel}</label>
            <Input
              type="number"
              value={numberOfRecordingsMin}
              onChange={handleRecordingsMinChange}
              className={cn('text-sm', recordingsRangeError && 'border-destructive focus-visible:ring-destructive')}
              min={0}
            />
            {recordingsRangeError && (
              <span className="text-xs text-destructive">{recordingsRangeError}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-muted-foreground">{maxLabel}</label>
            <Input
              type="number"
              value={numberOfRecordingsMax}
              onChange={handleRecordingsMaxChange}
              className={cn('text-sm', recordingsRangeError && 'border-destructive focus-visible:ring-destructive')}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Recording duration */}
      <div className="rounded-lg border border-border bg-card/60 p-6 mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-4">{durationLabel}</p>
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-muted-foreground">{minLabel}</label>
            <Input
              type="number"
              value={recordingDurationMinSeconds}
              onChange={handleDurationMinChange}
              className={cn('text-sm', durationRangeError && 'border-destructive focus-visible:ring-destructive')}
              min={0}
            />
            {durationRangeError && (
              <span className="text-xs text-destructive">{durationRangeError}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-muted-foreground">{maxLabel}</label>
            <Input
              type="number"
              value={recordingDurationMaxSeconds}
              onChange={handleDurationMaxChange}
              className={cn('text-sm', durationRangeError && 'border-destructive focus-visible:ring-destructive')}
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RecordAudioEditor);
