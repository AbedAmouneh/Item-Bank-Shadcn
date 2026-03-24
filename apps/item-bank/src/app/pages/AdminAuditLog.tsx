import { Fragment, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import { getAuditLogs } from '@item-bank/api';
import type { AuditLog } from '@item-bank/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 50;

/**
 * Known audit actions and entity types.
 * These are the values the backend writes — add new ones here if the API expands.
 */
const ACTION_OPTIONS = ['create', 'update', 'delete', 'login', 'logout', 'publish', 'reject'];
const ENTITY_TYPE_OPTIONS = ['question', 'user', 'item_bank', 'course', 'activity'];

/** Sentinel used by the Select to represent "no filter applied". */
const ALL_VALUE = '__all__';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

/**
 * Animated placeholder rows shown while the query is in flight.
 * Each column has a width that approximates the real content so the layout
 * does not jump when real data arrives.
 */
function SkeletonRows() {
  const COLUMN_WIDTHS = ['10rem', '6rem', '5rem', '6rem', '3rem', '6rem'];
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <TableRow key={i} className="animate-pulse">
          {COLUMN_WIDTHS.map((w, j) => (
            // eslint-disable-next-line react/no-array-index-key
            <TableCell key={j}>
              <div className="h-4 rounded bg-muted" style={{ width: w }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminAuditLog page
// ---------------------------------------------------------------------------

interface Filters {
  from: string;
  to: string;
  action: string;
  entity_type: string;
}

const EMPTY_FILTERS: Filters = { from: '', to: '', action: '', entity_type: '' };

/**
 * Admin Audit Log page.
 *
 * Shows a paginated, filterable table of every action recorded in the audit
 * log. Clicking a row that has a `details` payload expands it inline to show
 * the raw JSON — useful for debugging exactly what changed in each event.
 */
export default function AdminAuditLog() {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Build the params object; omit empty strings so the server sees clean params.
  const queryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(filters.action && { action: filters.action }),
    ...(filters.entity_type && { entity_type: filters.entity_type }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'audit-logs', queryParams],
    queryFn: () => getAuditLogs(queryParams),
  });

  const entries: AuditLog[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeTo = Math.min(page * PAGE_LIMIT, total);
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // Update one filter key and reset to page 1 so stale pages are never shown.
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * Format an ISO timestamp using the browser's locale — no extra libraries needed.
   * For example: "Mar 24, 2026, 14:35" in English or "٢٤ مارس ٢٠٢٦، ٢:٣٥ م" in Arabic.
   */
  const formatTimestamp = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <ClipboardList className="text-primary" size={28} />
        <h1 className="font-semibold text-xl text-foreground">
          {t('admin.audit_log.title')}
        </h1>
      </div>

      <Separator />

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="al-from">{t('admin.audit_log.from_date')}</Label>
          <Input
            id="al-from"
            type="date"
            className="w-40 bg-input"
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="al-to">{t('admin.audit_log.to_date')}</Label>
          <Input
            id="al-to"
            type="date"
            className="w-40 bg-input"
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="al-action">{t('admin.audit_log.action')}</Label>
          {/*
           * When no action is selected, `filters.action` is `""`.
           * We map that to the sentinel `__all__` so the Select always has
           * a controlled value and shows the placeholder text correctly.
           */}
          <Select
            value={filters.action || ALL_VALUE}
            onValueChange={(v) => setFilter('action', v === ALL_VALUE ? '' : v)}
          >
            <SelectTrigger id="al-action" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t('admin.audit_log.all_actions')}</SelectItem>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="al-entity-type">{t('admin.audit_log.entity_type')}</Label>
          <Select
            value={filters.entity_type || ALL_VALUE}
            onValueChange={(v) => setFilter('entity_type', v === ALL_VALUE ? '' : v)}
          >
            <SelectTrigger id="al-entity-type" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t('admin.audit_log.all_entity_types')}</SelectItem>
              {ENTITY_TYPE_OPTIONS.map((et) => (
                <SelectItem key={et} value={et}>{et}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={clearFilters}>
          {t('admin.audit_log.clear_filters')}
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">{t('admin.audit_log.load_error')}</p>
      )}

      {/* Events table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.audit_log.timestamp')}</TableHead>
              <TableHead>{t('admin.audit_log.user')}</TableHead>
              <TableHead>{t('admin.audit_log.action')}</TableHead>
              <TableHead>{t('admin.audit_log.entity_type')}</TableHead>
              <TableHead>{t('admin.audit_log.entity_id')}</TableHead>
              <TableHead>{t('admin.audit_log.ip')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows />}

            {!isLoading && !isError && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {t('admin.audit_log.no_events')}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              entries.map((entry) => {
                const isExpanded = expandedIds.has(entry.id);
                // Only rows with a details payload are clickable/expandable.
                const hasDetails = entry.old_values != null || entry.new_values != null;

                return (
                  // Fragment with a key is required when one logical row maps to
                  // two <TableRow> elements (main row + expanded details row).
                  <Fragment key={entry.id}>
                    <TableRow
                      className={hasDetails ? 'cursor-pointer' : undefined}
                      onClick={hasDetails ? () => toggleExpanded(entry.id) : undefined}
                    >
                      {/* Timestamp — chevron icon signals that the row is expandable */}
                      <TableCell className="whitespace-nowrap text-sm">
                        <span className="flex items-center gap-1.5">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                              : <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                          )}
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </TableCell>

                      {/* User — fall back to "#<id>" when user_name is absent, or "—" when user_id is also null */}
                      <TableCell className="text-sm">
                        {entry.user_name ?? (entry.user_id != null ? `#${entry.user_id}` : '—')}
                      </TableCell>

                      {/* Action — monospace badge so verbs stand out */}
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.action}
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm capitalize">
                        {entry.entity_type}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm">
                        {entry.entity_id ?? '—'}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.ip_address ?? '—'}
                      </TableCell>
                    </TableRow>

                    {/* Expanded details row — only rendered when the user clicked the row */}
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="bg-muted/30 ps-10 py-3">
                          <pre className="text-xs whitespace-pre-wrap break-all text-foreground/80">
                            {JSON.stringify(
                              { old: entry.old_values, new: entry.new_values },
                              null,
                              2
                            )}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — hidden while loading and when the result set is empty */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            {t('admin.audit_log.showing', { from: rangeFrom, to: rangeTo, total })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('admin.audit_log.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('admin.audit_log.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
