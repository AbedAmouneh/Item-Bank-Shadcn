import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useQuestion, QuestionViewShell } from '@item-bank/questions';
import { apiQuestionToRow } from '../../utils/apiQuestionToRow';

/**
 * Full-screen preview page for a single question.
 *
 * Reached via /questions/:id/preview.
 * Fetches the question by ID, converts it to the QuestionRow shape that
 * QuestionViewShell expects, and renders it in a centred full-page layout.
 */
export default function QuestionPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('questions');

  const numericId = Number(id);
  const { data: question, isLoading, isError } = useQuestion(numericId);

  const row = question ? apiQuestionToRow(question) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-8 py-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label={t('preview_page.back')}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">{t('preview_page.back')}</span>
          </button>

          {question && (
            <>
              <span className="text-border">|</span>
              <h1 className="truncate text-sm font-semibold text-foreground">
                {question.name}
              </h1>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-3xl px-8 py-12">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-24">
            {t('preview_page.loading')}
          </p>
        )}

        {isError && (
          <p className="text-center text-sm text-destructive py-24">
            {t('preview_page.not_found')}
          </p>
        )}

        {!isLoading && !isError && row === null && question && (
          <p className="text-center text-sm text-muted-foreground py-24">
            {t('preview_page.unsupported_type')}
          </p>
        )}

        {row && <QuestionViewShell question={row} />}
      </div>
    </div>
  );
}
