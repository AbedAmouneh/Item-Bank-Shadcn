import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { createQuestion, uploadImageBase64 } from '@item-bank/api';

import { deleteQuestion, getQuestions } from './db';

const MIGRATED_KEY = 'db_migrated';

/**
 * Envelope fields that live at the top level of CreateQuestionData.
 * Everything else from the StoredQuestion goes into the content blob.
 */
const BASE_KEYS = new Set([
  'id',
  'name',
  'type',
  'text',
  'mark',
  'status',
  'lastModified',
  'correctAnswerFeedback',
  'partiallyCorrectAnswerFeedback',
  'incorrectAnswerFeedback',
]);

/**
 * Recursively walk an arbitrary value and replace every base64 data URL
 * (strings starting with "data:image/") with the CDN URL returned by the API.
 */
async function uploadBase64Images(value: unknown): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    const match = value.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      const [, mimeType, data] = match;
      const { url } = await uploadImageBase64(data, mimeType);
      return url;
    }
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(uploadBase64Images));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = await uploadBase64Images(val);
    }
    return result;
  }
  return value;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

/**
 * One-time migration component.
 *
 * On first authenticated session after the upgrade it reads every question
 * from IndexedDB, uploads any embedded base64 images to the CDN, creates the
 * question via the REST API, then removes the record from IndexedDB.  Once all
 * questions are migrated it writes "db_migrated=true" to localStorage and
 * renders null on every subsequent mount.
 *
 * Rendered inside the authenticated layout so it only runs after login.
 */
export default function MigrateToApi() {
  const { t } = useTranslation('common');

  const [phase, setPhase] = useState<Phase>(() =>
    localStorage.getItem(MIGRATED_KEY) === 'true' ? 'done' : 'idle'
  );
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  const runMigration = useCallback(async () => {
    setPhase('running');
    setErrorMessage('');
    try {
      const questions = await getQuestions();
      if (questions.length === 0) {
        localStorage.setItem(MIGRATED_KEY, 'true');
        setPhase('done');
        return;
      }

      setProgress({ current: 0, total: questions.length });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Split the stored record into the envelope fields and the content blob.
        const rawContent: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(q)) {
          if (!BASE_KEYS.has(key)) {
            rawContent[key] = val;
          }
        }

        // Recursively upload any inline base64 images inside the content.
        const content = (await uploadBase64Images(rawContent)) as Record<string, unknown>;

        await createQuestion({ name: q.name, type: q.type, text: q.text, mark: q.mark, content });

        // Delete from IndexedDB immediately so a mid-migration retry is safe.
        await deleteQuestion(q.id);

        setProgress({ current: i + 1, total: questions.length });
      }

      localStorage.setItem(MIGRATED_KEY, 'true');
      setPhase('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      setErrorMessage(message);
      setPhase('error');
    }
  }, []);

  // Trigger migration on mount (phase === 'idle') and on retry
  // (user resets phase back to 'idle').
  useEffect(() => {
    if (phase === 'idle') {
      runMigration();
    }
  }, [phase, runMigration]);

  if (phase === 'done' || phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg flex flex-col gap-4">

        {phase === 'running' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-foreground text-center">
              {t('migration.description')}
            </p>
            {progress.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('migration.progress', { current: progress.current, total: progress.total })}
              </p>
            )}
          </div>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm font-semibold text-foreground">
              {t('migration.error_title')}
            </p>
            <p className="text-xs text-destructive break-words">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('migration.retry')}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
