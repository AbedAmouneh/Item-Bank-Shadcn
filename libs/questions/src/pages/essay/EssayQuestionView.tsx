import { useState, useMemo, useCallback } from 'react';

import { Editor } from '@tinymce/tinymce-react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@item-bank/ui';

import type { QuestionRow } from '../../components/QuestionsTable';

type EssayQuestionViewProps = {
  question: QuestionRow;
};

function stripHtml(value: string): string {
  if (typeof DOMParser === 'undefined') {
    return value.replace(/<[^>]+>/g, ' ');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  return doc.body.textContent ?? '';
}

const EssayQuestionView = ({ question }: EssayQuestionViewProps) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [response, setResponse] = useState('');
  const { t, i18n } = useTranslation('questions');

  const responseFormat = question.essayResponseFormat ?? 'html';
  const isHtmlMode =
    responseFormat === 'html' || responseFormat === 'html_with_file_picker';

  const responseText = useMemo(
    () => (isHtmlMode ? stripHtml(response) : response),
    [isHtmlMode, response]
  );
  const wordCount = useMemo(
    () => responseText.trim().split(/\s+/).filter(Boolean).length,
    [responseText]
  );
  const charCount = responseText.length;

  const baseEditorInit = useMemo(
    () => ({
      height: 300,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      toolbar_mode: 'floating' as const,
      statusbar: false,
      placeholder: t('editor.essay.enter_response'),
      content_style: isDarkMode
        ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #1e1e2e; color: rgba(255,255,255,0.9); }`
        : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #ffffff; color: rgba(0,0,0,0.9); }',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language, t, isDarkMode]
  );

  const filePickerCallback = useCallback(
    (
      callback: (url: string, meta?: { title?: string; text?: string; alt?: string }) => void,
      _value: string,
      meta: { filetype?: string }
    ) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (meta.filetype === 'image') input.accept = 'image/*';
      else if (meta.filetype === 'media') input.accept = 'video/*,audio/*';
      else input.accept = '*/*';

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? '');
          callback(result, { title: file.name, text: file.name, alt: file.name });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
    []
  );

  const htmlEditorInit = useMemo(
    () => ({
      ...baseEditorInit,
      plugins: ['lists', 'link'],
      toolbar: 'bold italic underline | bullist numlist | link',
    }),
    [baseEditorInit]
  );

  const htmlWithPickerEditorInit = useMemo(
    () => ({
      ...baseEditorInit,
      plugins: ['lists', 'link', 'image', 'media'],
      toolbar: 'bold italic underline | bullist numlist | link image media',
      file_picker_types: 'file image media',
      file_picker_callback: filePickerCallback,
      automatic_uploads: false,
    }),
    [baseEditorInit, filePickerCallback]
  );

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        {isHtmlMode ? (
          <div
            className={cn(
              'rounded-[0.375rem] overflow-hidden border border-border',
              '[&_.tox-tinymce]:!border-0'
            )}
          >
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              value={response}
              onEditorChange={setResponse}
              init={
                responseFormat === 'html_with_file_picker'
                  ? htmlWithPickerEditorInit
                  : htmlEditorInit
              }
            />
          </div>
        ) : (
          <textarea
            rows={10}
            className={cn(
              'w-full rounded-[0.375rem] border border-border bg-card px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'resize-none'
            )}
            placeholder={t('editor.essay.enter_response') || 'Enter your response...'}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
        )}

        <div className="flex gap-4 justify-end">
          <div className="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground">
            <span className="text-xs">
              {t('editor.essay.words') || 'Words'}: {wordCount}
            </span>
            <span className="text-xs">•</span>
            <span className="text-xs">
              {t('editor.essay.characters') || 'Characters'}: {charCount}
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex items-start gap-3 mb-4 rounded-[0.375rem] border border-border px-4 py-3',
          'text-sm text-foreground'
        )}
        role="alert"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
        <span>{t('editor.essay.manual_grading_message')}</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <span className="text-sm text-muted-foreground">
          {t('editor.essay.manual_grading_title')}
        </span>
        <div
          className={cn(
            'py-2 px-4 font-semibold text-[0.95rem] rounded-[0.375rem]',
            'bg-card border border-border text-foreground'
          )}
        >
          {question.mark}
        </div>
      </div>
    </>
  );
};

export default EssayQuestionView;
