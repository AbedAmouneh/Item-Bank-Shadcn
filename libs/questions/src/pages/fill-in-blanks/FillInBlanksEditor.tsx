import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  styled,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { createEmptyAnswer } from '../../domain/factory';
import { type AnswerEntry } from '../../domain/types';

const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

const KEY_REGEX = /\[\[([^\]]+)\]\]/g;

function parseKeysFromText(text: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  KEY_REGEX.lastIndex = 0;
  while ((m = KEY_REGEX.exec(text)) !== null) {
    const key = m[1].trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function hasMeaningfulHtmlContent(html: string): boolean {
  const plainText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return plainText.length > 0;
}

export type AnswerGroup = { key: string; answers: AnswerEntry[] };

type FillInBlanksEditorProps = {
  questionContent?: string;
  contentError?: string;
  layout?: 'full' | 'content' | 'answers';
};

const AnswerRow = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
}));

const ContentEditorWrapper = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  '& .tox-tinymce': {
    border: 'none !important',
  },
}));

function FillInBlanksEditor({
  questionContent = '',
  contentError,
  layout = 'full',
}: FillInBlanksEditorProps) {
  const { watch, setValue } = useFormContext();
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();

  const watchedAnswerGroups = watch('answerGroups');
  const answerGroups = useMemo<AnswerGroup[]>(
    () => watchedAnswerGroups ?? [],
    [watchedAnswerGroups]
  );
  const manualMarking = watch('manualMarking') ?? false;
  const requireUniqueKeyAnswers = watch('requireUniqueKeyAnswers') ?? false;
  const content = watch('content') ?? '';

  const parsedKeys = useMemo(
    () => parseKeysFromText(questionContent || content),
    [questionContent, content]
  );
  const hasKeys = parsedKeys.length >= 1;
  const showNoKeyError = hasMeaningfulHtmlContent(content) && !hasKeys;
  const showContentSection = layout !== 'answers';
  const showAnswersSection = layout !== 'content';
  const lastSyncedKeysSignature = useRef<string | null>(null);

  const editorInit = useMemo(
    () => ({
      height: 240,
      menubar: false,
      skin: theme.palette.mode === 'dark' ? 'oxide-dark' : 'oxide',
      content_css: theme.palette.mode === 'dark' ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['advlist', 'lists', 'link', 'wordcount', 'help'],
      toolbar:
        'undo redo | blocks fontfamily fontsize | bullist numlist | key | bold italic underline strikethrough | superscript subscript | outdent indent | link',
      toolbar_mode: 'floating' as const,
      statusbar: true,
      placeholder: t('editor.fill_in_blanks.content_placeholder'),
      setup: (editor: TinyMCEEditor) => {
        editor.ui.registry.addButton('key', {
          text: t('editor.fill_in_blanks.toolbar_key'),
          onAction: () => {
            const defaultKey = t('editor.fill_in_blanks.key_default', {
              defaultValue: 'KeyText',
            });
            editor.insertContent(`[[${defaultKey}]]`);
            editor.focus();
          },
        });
      },
      content_style:
        theme.palette.mode === 'dark'
          ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: ${theme.palette.background.default}; color: ${alpha(theme.palette.text.primary, 0.9)}; }`
          : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; }',
    }),
    [i18n.language, t, theme]
  );

  useEffect(() => {
    if (!showAnswersSection) {
      return;
    }

    const keysSignature = JSON.stringify(parsedKeys);
    if (keysSignature === lastSyncedKeysSignature.current) {
      return;
    }

    const existingByKey = new Map(answerGroups.map((g) => [g.key, g.answers]));
    const newGroups: AnswerGroup[] = parsedKeys.map((key) => {
      const existing = existingByKey.get(key);
      return {
        key,
        answers: existing && existing.length > 0 ? existing : [createEmptyAnswer()],
      };
    });

    const isUnchanged =
      newGroups.length === answerGroups.length &&
      newGroups.every((group, index) => {
        const currentGroup = answerGroups[index];
        return currentGroup?.key === group.key && currentGroup?.answers === group.answers;
      });

    lastSyncedKeysSignature.current = keysSignature;
    if (isUnchanged) {
      return;
    }

    setValue('answerGroups', newGroups);
  }, [showAnswersSection, parsedKeys, answerGroups, setValue]);

  const handleManualMarkingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue('manualMarking', e.target.checked);
    },
    [setValue]
  );

  const handleRequireUniqueKeyAnswersChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue('requireUniqueKeyAnswers', e.target.checked);
    },
    [setValue]
  );

  const handleGroupAnswersChange = useCallback(
    (key: string, nextAnswers: AnswerEntry[]) => {
      setValue(
        'answerGroups',
        answerGroups.map((g) => (g.key === key ? { ...g, answers: nextAnswers } : g))
      );
    },
    [setValue, answerGroups]
  );

  const handleAddAnswer = useCallback(
    (key: string) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group) return;
      handleGroupAnswersChange(key, [...group.answers, createEmptyAnswer()]);
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const handleRemoveAnswer = useCallback(
    (key: string, id: string) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group || group.answers.length <= 1) return;
      handleGroupAnswersChange(
        key,
        group.answers.filter((a) => a.id !== id)
      );
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const handleAnswerFieldChange = useCallback(
    (key: string, answerId: string, field: keyof AnswerEntry, value: unknown) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group) return;
      handleGroupAnswersChange(
        key,
        group.answers.map((a) => (a.id === answerId ? { ...a, [field]: value } : a))
      );
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const answersLocked = manualMarking;

  return (
    <Box className="flex flex-col gap-6">
      {showContentSection && (
        <Box>
          <Typography
            className="text-sm mb-3 font-medium"
            sx={{ color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.9 : 0.75) }}
            variant="body2"
          >
            {t('editor.fill_in_blanks.question_content')}
            <span className="ml-1 font-bold" style={{ color: theme.palette.semantic.editor.asteriskColor }}>*</span>
          </Typography>
          <ContentEditorWrapper>
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              value={content}
              onEditorChange={(newValue) => setValue('content', newValue, { shouldValidate: true })}
              init={editorInit}
            />
          </ContentEditorWrapper>
          {contentError && (
            <Typography variant="caption" color="error" className="mt-1 block">
              {contentError}
            </Typography>
          )}
        </Box>
      )}

      {showAnswersSection && (
        <>
          <Box className="flex items-center mb-2 flex-wrap gap-2">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={manualMarking}
                  onChange={handleManualMarkingChange}
                  color="primary"
                />
              }
              label={t('editor.fill_in_blanks.manual_marking_mode', {
                defaultValue: t('editor.fill_in_blanks.manual_marking'),
              })}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={requireUniqueKeyAnswers}
                  onChange={handleRequireUniqueKeyAnswersChange}
                  color="primary"
                />
              }
              label={t('editor.fill_in_blanks.require_unique_answers', {
                defaultValue: t('editor.fill_in_blanks.require_unique_key_answers'),
              })}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          </Box>

          {manualMarking && (
            <Alert severity="info" variant="outlined" className="mb-2">
              {t('editor.fill_in_blanks.manual_marking_answers_locked')}
            </Alert>
          )}

          {showNoKeyError && (
            <Typography
              role="alert"
              className="text-sm mb-2"
              sx={(muiTheme) => ({ color: muiTheme.palette.error.main })}
            >
              {t('editor.fill_in_blanks.error_no_key')}
            </Typography>
          )}

          {hasKeys && (
            <>
              <Typography
                component="span"
                className="block text-[0.8125rem] font-normal mb-2"
                sx={(muiTheme) => ({ color: muiTheme.palette.text.secondary })}
              >
                {t('editor.fill_in_blanks.answers_by_key')}
              </Typography>

              {answerGroups.map((group) => (
                <Box key={group.key} className="mb-6">
                  <Typography
                    variant="body2"
                    className="font-semibold text-sm mb-4"
                    sx={(muiTheme) => ({ color: muiTheme.palette.text.secondary })}
                  >
                    {group.key}
                  </Typography>
                  {group.answers.map((answer) => (
                    <AnswerRow
                      key={answer.id}
                      className="flex items-center gap-3 p-3 w-full box-border min-w-0"
                    >
                      <TextField
                        placeholder={t('editor.add_answer')}
                        value={answer.text}
                        onChange={(e) => handleAnswerFieldChange(group.key, answer.id, 'text', e.target.value)}
                        size="small"
                        disabled={answersLocked}
                        className="flex-[0_0_36%] min-w-0 [&_.MuiOutlinedInput-root]:text-[0.8125rem] [&_.MuiOutlinedInput-root]:h-[34px] [&_.MuiOutlinedInput-input]:py-1.5 [&_.MuiOutlinedInput-input]:px-2.5"
                        sx={(muiTheme) => ({
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: muiTheme.palette.background.paper,
                          },
                        })}
                      />
                      <Box className="flex-1 flex items-center justify-between gap-2 min-w-0">
                        <FormControl size="small" className="min-w-[82px]">
                          <InputLabel id={`mark-${group.key}-${answer.id}`}>{t('mark')} *</InputLabel>
                          <Select
                            labelId={`mark-${group.key}-${answer.id}`}
                            value={answer.mark}
                            label={`${t('mark')} *`}
                            disabled={answersLocked || requireUniqueKeyAnswers}
                            onChange={(e) =>
                              handleAnswerFieldChange(group.key, answer.id, 'mark', Number(e.target.value))
                            }
                            className="h-[34px]"
                            sx={(muiTheme) => ({
                              fontSize: '0.8125rem',
                              '& .MuiSelect-select': {
                                paddingTop: muiTheme.spacing(0.6),
                                paddingBottom: muiTheme.spacing(0.6),
                              },
                            })}
                          >
                            {MARK_OPTIONS.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt} %
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          className="shrink-0"
                          control={
                            <Switch
                              size="small"
                              checked={answer.ignoreCasing}
                              disabled={answersLocked}
                              onChange={(e) =>
                                handleAnswerFieldChange(group.key, answer.id, 'ignoreCasing', e.target.checked)
                              }
                              color="primary"
                            />
                          }
                          label={t('editor.ignore_casing')}
                          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                        />
                        {group.answers.length > 1 ? (
                          <IconButton
                            size="small"
                            className="shrink-0 p-1"
                            onClick={() => handleRemoveAnswer(group.key, answer.id)}
                            disabled={answersLocked}
                            aria-label={t('editor.remove_answer')}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                        ) : (
                          <Box className="w-8 shrink-0" />
                        )}
                      </Box>
                    </AnswerRow>
                  ))}
                  <Button
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddAnswer(group.key)}
                    disabled={answersLocked}
                    className="self-start normal-case font-medium text-sm mt-3"
                  >
                    {t('editor.add_answer')}
                  </Button>
                </Box>
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
}

export default memo(FillInBlanksEditor);
