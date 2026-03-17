import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, cn } from '@item-bank/ui';

type ResponseFormat = 'html' | 'html_with_file_picker' | 'plain_text';

function AddEssay() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const responseFormat: ResponseFormat = watch('responseFormat') || 'html';
  const enableWordLimit = watch('enableWordLimit');
  const minLimit = watch('minLimit') ?? '';
  const maxLimit = watch('maxLimit') ?? '';
  const allowAttachments: boolean = watch('allowAttachments') || false;
  const numberOfAttachments: number = watch('numberOfAttachments') ?? 1;
  const attachmentsFormat: string[] = watch('attachmentsFormat') || [];

  const handleResponseFormatChange = useCallback(
    (value: string) => {
      setValue('responseFormat', value);
    },
    [setValue]
  );

  const handleWordLimitToggle = useCallback(
    (checked: boolean) => {
      setValue('enableWordLimit', checked);
    },
    [setValue]
  );

  const handleAttachmentsToggle = useCallback(
    (checked: boolean) => {
      setValue('allowAttachments', checked);
    },
    [setValue]
  );

  const handleFormatToggle = useCallback(
    (format: string) => {
      const current = attachmentsFormat ?? [];
      if (current.includes(format)) {
        setValue('attachmentsFormat', current.filter((f) => f !== format));
      } else {
        setValue('attachmentsFormat', [...current, format]);
      }
    },
    [attachmentsFormat, setValue]
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Response format */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('editor.response_format')} *
        </label>
        <Select value={responseFormat} onValueChange={handleResponseFormatChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="html">{t('editor.response_format_html')}</SelectItem>
            <SelectItem value="html_with_file_picker">{t('editor.response_format_html_with_file_picker')}</SelectItem>
            <SelectItem value="plain_text">{t('editor.response_format_plain_text')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Word limit toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" className="sr-only peer" checked={!!enableWordLimit} onChange={(e) => handleWordLimitToggle(e.target.checked)} />
        <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
          <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
        </div>
        <span className="text-sm text-foreground">{t('editor.enable_word_limit')}</span>
      </label>

      {/* Word limit fields — conditional */}
      {enableWordLimit && (
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('editor.min_words')}</label>
            <Input
              type="number"
              value={minLimit}
              onChange={(e) => setValue('minLimit', e.target.value)}
              className="w-28 text-sm"
              min={0}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('editor.max_words')}</label>
            <Input
              type="number"
              value={maxLimit}
              onChange={(e) => setValue('maxLimit', e.target.value)}
              className="w-28 text-sm"
              min={0}
            />
          </div>
        </div>
      )}

      <hr className="border-border" />

      {/* Attachments toggle */}
      {responseFormat === 'html_with_file_picker' && (
        <>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" className="sr-only peer" checked={!!allowAttachments} onChange={(e) => handleAttachmentsToggle(e.target.checked)} />
            <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{t('editor.allow_attachments')}</span>
          </label>

          {allowAttachments && (
            <div className="flex flex-col gap-4">
              {/* Number of attachments + required toggle */}
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('editor.number_of_attachments')}</label>
                  <Input
                    type="number"
                    value={numberOfAttachments}
                    onChange={(e) => setValue('numberOfAttachments', Number(e.target.value))}
                    className="w-28 text-sm"
                    min={1}
                  />
                </div>
              </div>

              {/* Allowed file types — pill badges */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('editor.attachments_format')}</p>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'].map((format) => {
                    const active = (attachmentsFormat ?? []).includes(format);
                    return (
                      <button
                        key={format}
                        type="button"
                        onClick={() => handleFormatToggle(format)}
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        .{format}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default memo(AddEssay);
