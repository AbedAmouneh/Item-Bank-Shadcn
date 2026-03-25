import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play } from 'lucide-react';

import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import { useItemBank, useQuestions } from '@item-bank/questions';

import { formatLastModified } from '../../utils/questionUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts snake_case question types into readable Title Case (e.g. 'true_false' → 'True False'). */
function formatQuestionType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Returns Tailwind classes for inline status badges based on the API status string. */
function statusBadgeVariant(status: string): string {
  if (status === 'published') {
    return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
  }
  if (status === 'in_review') {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  }
  // Default: draft
  return 'bg-muted text-muted-foreground border-border';
}

/** Formats the API status string into a human-readable label. */
function formatStatus(status: string): string {
  if (status === 'in_review') return 'In Review';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ---------------------------------------------------------------------------
// Skeleton shown while the bank header is loading
// ---------------------------------------------------------------------------

function HeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse space-y-3">
      <div className="h-8 w-1/2 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

const ItemBankDetail = () => {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const bankId = Number(id);
  const navigate = useNavigate();

  const { data: bank, isLoading: bankLoading, isError: bankError } = useItemBank(bankId);

  // Pass item_bank_id so the backend can filter questions to this bank.
  // If the backend does not yet support this filter, it will be ignored and
  // all questions will be returned — the page still works correctly.
  const { data: questionsPage, isLoading: questionsLoading } = useQuestions({
    item_bank_id: bankId,
    limit: 100,
  });
  const questions = questionsPage?.items ?? [];

  return (
    <div className="w-full px-8 py-8">
      {/* Back navigation */}
      <Link
        to="/item-banks"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} />
        {t('item_banks.back_to_banks')}
      </Link>

      {/* Bank header */}
      {bankLoading && <HeaderSkeleton />}

      {(bankError || (!bankLoading && !bank)) && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">{t('item_banks.not_found')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/item-banks')}>
            {t('item_banks.go_back')}
          </Button>
        </div>
      )}

      {bank && (
        <>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">{bank.name}</h1>
              {bank.description && (
                <p className="text-muted-foreground">{bank.description}</p>
              )}
            </div>
            <Button
              onClick={() => navigate(`/games?item_bank_id=${bank.id}`)}
              className="shrink-0"
            >
              <Play size={15} className="me-1.5" />
              {t('item_banks.play_with_bank')}
            </Button>
          </div>

          {/* Questions table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('item_banks.name_col')}</TableHead>
                  <TableHead>{t('item_banks.type_col')}</TableHead>
                  <TableHead>{t('item_banks.status_col')}</TableHead>
                  <TableHead>{t('item_banks.last_modified_col')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading rows */}
                {questionsLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-40 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-24 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-16 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-20 rounded bg-muted" /></TableCell>
                    </TableRow>
                  ))}

                {/* Question rows */}
                {!questionsLoading &&
                  questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatQuestionType(q.type)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeVariant(q.status)}`}
                        >
                          {formatStatus(q.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {q.updated_at ? formatLastModified(q.updated_at) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {/* Empty state inside the table area */}
            {!questionsLoading && questions.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('item_banks.no_questions')}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ItemBankDetail;
