import {
  Box,
  TextField,
  styled,
  Typography,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Editor } from '@tinymce/tinymce-react';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type EssayQuestionViewProps = {
  question: QuestionRow;
};

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const EditorWrapper = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  '& .tox-tinymce': {
    border: 'none !important',
  },
}));

function stripHtml(value: string): string {
  if (typeof DOMParser === 'undefined') {
    return value.replace(/<[^>]+>/g, ' ');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  return doc.body.textContent ?? '';
}

const EssayQuestionView = ({ question }: EssayQuestionViewProps) => {
  const theme = useTheme();
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
      skin: theme.palette.mode === 'dark' ? 'oxide-dark' : 'oxide',
      content_css: theme.palette.mode === 'dark' ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      toolbar_mode: 'floating' as const,
      statusbar: false,
      placeholder: t('editor.essay.enter_response'),
      content_style:
        theme.palette.mode === 'dark'
          ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: ${theme.palette.background.default}; color: ${alpha(theme.palette.text.primary, 0.9)}; }`
          : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; }',
    }),
    [i18n.language, t, theme]
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
      <Box className="flex flex-col gap-4 mb-6">
        {isHtmlMode ? (
          <EditorWrapper>
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
          </EditorWrapper>
        ) : (
          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder={t('editor.essay.enter_response') || 'Enter your response...'}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            sx={(muiTheme) => ({
              '& .MuiOutlinedInput-root': {
                borderRadius: muiTheme.spacing(1.5),
                backgroundColor: muiTheme.palette.background.paper,
              },
            })}
          />
        )}

        <Box className="flex gap-4 justify-end">
          <Box
            className="flex items-center gap-2 py-1 px-2 text-sm"
            sx={(theme) => ({ color: theme.palette.text.secondary })}
          >
            <Typography variant="caption">
              {t('editor.essay.words') || 'Words'}: {wordCount}
            </Typography>
            <Typography variant="caption">•</Typography>
            <Typography variant="caption">
              {t('editor.essay.characters') || 'Characters'}: {charCount}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert
        severity="info"
        icon={<InfoOutlinedIcon fontSize="inherit" />}
        variant="outlined"
        className="mb-4"
      >
        {t('editor.essay.manual_grading_message')}
      </Alert>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('editor.essay.manual_grading_title')}
        </Typography>
        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">{question.mark}</MarkBox>
      </Box>
    </>
  );
};

export default EssayQuestionView;
