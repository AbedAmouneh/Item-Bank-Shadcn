import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Globe } from 'lucide-react';
import { useLanguage } from '@item-bank/ui';

// ─── types ───────────────────────────────────────────────────────────────────

type Namespace = 'auth' | 'common' | 'questions';

interface KeyRow {
  key: string;
  en: string | null;
  ar: string | null;
  /** 'ok' | 'missing-ar' | 'missing-en' | 'empty-ar' | 'empty-en' */
  status: 'ok' | 'missing-ar' | 'missing-en' | 'empty-ar' | 'empty-en';
}

interface NamespaceStats {
  total: number;
  ok: number;
  missingAr: number;
  missingEn: number;
  emptyAr: number;
  emptyEn: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively walks a nested object and returns every leaf as a dotted path.
 * Empty objects are reported as leaf paths too so nothing is silently skipped.
 */
function flattenKeys(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const children = flattenKeys(v as Record<string, unknown>, full);
      if (Object.keys(children).length === 0) {
        result[full] = '';
      } else {
        Object.assign(result, children);
      }
    } else {
      result[full] = String(v ?? '');
    }
  }
  return result;
}

async function fetchNamespace(
  lang: string,
  ns: Namespace
): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/locales/${lang}/${ns}.json?bust=${Date.now()}`);
    if (!res.ok) return {};
    const json = await res.json();
    return flattenKeys(json as Record<string, unknown>);
  } catch {
    return {};
  }
}

function buildRows(
  enFlat: Record<string, string>,
  arFlat: Record<string, string>
): KeyRow[] {
  const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(arFlat)]);
  const rows: KeyRow[] = [];

  for (const key of [...allKeys].sort()) {
    const en = key in enFlat ? enFlat[key] : null;
    const ar = key in arFlat ? arFlat[key] : null;

    let status: KeyRow['status'] = 'ok';
    if (en === null) status = 'missing-en';
    else if (ar === null) status = 'missing-ar';
    else if (ar.trim() === '' && en.trim() !== '') status = 'empty-ar';
    else if (en.trim() === '' && ar.trim() !== '') status = 'empty-en';

    rows.push({ key, en, ar, status });
  }

  return rows;
}

function calcStats(rows: KeyRow[]): NamespaceStats {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === 'ok').length,
    missingAr: rows.filter((r) => r.status === 'missing-ar').length,
    missingEn: rows.filter((r) => r.status === 'missing-en').length,
    emptyAr: rows.filter((r) => r.status === 'empty-ar').length,
    emptyEn: rows.filter((r) => r.status === 'empty-en').length,
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KeyRow['status'] }) {
  if (status === 'ok')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
        <CheckCircle2 size={12} />
        OK
      </span>
    );
  if (status === 'missing-ar')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <XCircle size={12} />
        Missing AR
      </span>
    );
  if (status === 'missing-en')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle size={12} />
        Missing EN
      </span>
    );
  if (status === 'empty-ar')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
        <AlertTriangle size={12} />
        Empty AR
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
      <AlertTriangle size={12} />
      Empty EN
    </span>
  );
}

function StatPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'green' | 'red' | 'amber' | 'orange' | 'neutral';
}) {
  const colours: Record<string, string> = {
    green:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    amber:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    orange:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    neutral:
      'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colours[variant]}`}
    >
      {value} {label}
    </span>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const NAMESPACES: Namespace[] = ['auth', 'common', 'questions'];

type FilterMode = 'all' | 'issues';

export default function I18nTestPage() {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLanguage();

  const [activeNs, setActiveNs] = useState<Namespace>('auth');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Keyed by namespace
  const [rowsMap, setRowsMap] = useState<Record<Namespace, KeyRow[]>>({
    auth: [],
    common: [],
    questions: [],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      NAMESPACES.map(async (ns) => {
        const [en, ar] = await Promise.all([
          fetchNamespace('en', ns),
          fetchNamespace('ar', ns),
        ]);
        return { ns, rows: buildRows(en, ar) };
      })
    );
    const map = {} as Record<Namespace, KeyRow[]>;
    results.forEach(({ ns, rows }) => {
      map[ns] = rows;
    });
    setRowsMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeRows = rowsMap[activeNs] ?? [];
  const stats = calcStats(activeRows);

  const visibleRows = activeRows.filter((r) => {
    if (filterMode === 'issues' && r.status === 'ok') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.key.toLowerCase().includes(q) ||
        (r.en ?? '').toLowerCase().includes(q) ||
        (r.ar ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Overall totals across all namespaces
  const allRows = Object.values(rowsMap).flat();
  const totalIssues = allRows.filter((r) => r.status !== 'ok').length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe size={24} className="text-primary" />
            i18n Translation Checker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Side-by-side view of every key across EN and AR — missing
            translations highlighted in red.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live language toggle */}
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted p-1">
            <button
              onClick={() => setLanguage('en')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                language === 'ar'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              AR
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Overall summary banner ── */}
      {!loading && (
        <div
          className={`rounded-xl border px-5 py-3 flex items-center gap-3 flex-wrap ${
            totalIssues === 0
              ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
              : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
          }`}
        >
          {totalIssues === 0 ? (
            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">
            {totalIssues === 0
              ? '🎉 All translations are complete!'
              : `${totalIssues} translation issue${totalIssues !== 1 ? 's' : ''} found across all namespaces`}
          </span>
          <span className="text-xs text-muted-foreground">
            {allRows.length} total keys
          </span>
        </div>
      )}

      {/* ── Namespace tabs ── */}
      <div className="flex gap-1 rounded-full bg-muted p-1 w-fit">
        {NAMESPACES.map((ns) => {
          const nsRows = rowsMap[ns] ?? [];
          const issues = nsRows.filter((r) => r.status !== 'ok').length;
          return (
            <button
              key={ns}
              onClick={() => setActiveNs(ns)}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                activeNs === ns
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {ns}
              {issues > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-4 w-4">
                  {issues}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Namespace stats ── */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <StatPill label="total" value={stats.total} variant="neutral" />
          <StatPill label="complete" value={stats.ok} variant="green" />
          {stats.missingAr > 0 && (
            <StatPill label="missing in AR" value={stats.missingAr} variant="red" />
          )}
          {stats.missingEn > 0 && (
            <StatPill label="extra in AR" value={stats.missingEn} variant="amber" />
          )}
          {stats.emptyAr > 0 && (
            <StatPill label="empty AR value" value={stats.emptyAr} variant="orange" />
          )}
          {stats.emptyEn > 0 && (
            <StatPill label="empty EN value" value={stats.emptyEn} variant="orange" />
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search keys or values…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card ps-8 pe-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
          <button
            onClick={() => setFilterMode('all')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('issues')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filterMode === 'issues'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Issues only
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <RefreshCw size={20} className="animate-spin me-2" />
          Loading translation files…
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {filterMode === 'issues'
            ? '✅ No issues in this namespace!'
            : 'No keys match your search.'}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-start ps-4 pe-3 py-3 w-[30%]">Key</th>
                <th className="text-start px-3 py-3 w-[28%]">English</th>
                <th className="text-start px-3 py-3 w-[28%]">Arabic</th>
                <th className="text-start px-3 py-3 w-[14%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-border last:border-0 transition-colors ${
                    row.status !== 'ok'
                      ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                      : i % 2 === 0
                      ? 'bg-transparent hover:bg-muted/40'
                      : 'bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  {/* Key */}
                  <td className="ps-4 pe-3 py-2.5 align-top">
                    <code className="text-[0.78rem] font-mono text-primary/80 break-all">
                      {row.key}
                    </code>
                  </td>

                  {/* EN value */}
                  <td className="px-3 py-2.5 align-top text-foreground break-words max-w-0">
                    {row.en === null ? (
                      <span className="italic text-muted-foreground">—</span>
                    ) : row.en.trim() === '' ? (
                      <span className="italic text-orange-500 dark:text-orange-400">
                        (empty)
                      </span>
                    ) : (
                      <span className="line-clamp-3">{row.en}</span>
                    )}
                  </td>

                  {/* AR value */}
                  <td className="px-3 py-2.5 align-top text-foreground break-words max-w-0" dir="rtl">
                    {row.ar === null ? (
                      <span className="italic text-muted-foreground" dir="ltr">
                        —
                      </span>
                    ) : row.ar.trim() === '' ? (
                      <span className="italic text-orange-500 dark:text-orange-400" dir="ltr">
                        (empty)
                      </span>
                    ) : (
                      <span className="line-clamp-3">{row.ar}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 align-top">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-muted/40 border-t border-border text-xs text-muted-foreground">
            Showing {visibleRows.length} of {activeRows.length} keys
          </div>
        </div>
      )}

      {/* ── Live preview strip ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Live app language preview
        </h2>
        <p className="text-sm">
          The app is currently rendering in{' '}
          <strong>{language === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}</strong>.
          Use the EN / AR toggle above to switch the whole app and navigate around
          to verify each page looks correct.
        </p>
        <div className="flex gap-3 flex-wrap text-sm">
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('nav.dashboard')}
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('nav.projects')}
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('nav.itemBanks')}
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('nav.settings')}
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('save')}
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 font-mono">
            {t('back')}
          </span>
        </div>
      </div>
    </div>
  );
}
