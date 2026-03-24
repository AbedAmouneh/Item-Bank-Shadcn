import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileEdit,
  Gamepad2,
  Plus,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@item-bank/ui';
import { useAuth } from '@item-bank/auth';
import { getQuestions, getMyStats } from '@item-bank/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a readable display name from an email address.
 * "abed.amouneh@example.com" → "Abed Amouneh"
 */
function toDisplayName(email: string): string {
  const [local] = email.split('@');
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  isError: boolean;
  icon: LucideIcon;
  /** Full Tailwind class for the left (inline-start) accent border. */
  accentBorder: string;
  /** Full Tailwind class for the icon container background. */
  iconBg: string;
  /** Full Tailwind class for the icon colour. */
  iconColor: string;
}

function StatCard({
  label,
  value,
  isLoading,
  isError,
  icon: Icon,
  accentBorder,
  iconBg,
  iconColor,
}: StatCardProps) {
  return (
    <article
      className={cn(
        'relative rounded-xl border border-border bg-card',
        'ps-5 pe-5 pt-5 pb-5',
        'shadow-[var(--shadow-card)]',
        'border-s-4 transition-all hover:-translate-y-px hover:shadow-md',
        accentBorder,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Bone className="mt-1 h-9 w-24" />
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load</p>
          ) : (
            <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground leading-none">
              {value?.toLocaleString() ?? '—'}
            </p>
          )}
        </div>
        <div className={cn('shrink-0 rounded-lg p-2.5', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

// ─── Game stat item ───────────────────────────────────────────────────────────

interface GameStatItemProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  icon: LucideIcon;
}

function GameStatItem({ label, value, isLoading, icon: Icon }: GameStatItemProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 ps-6 pe-6 py-8 text-center">
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      {isLoading ? (
        <Bone className="h-9 w-20" />
      ) : (
        <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground leading-none">
          {value?.toLocaleString() ?? '—'}
        </p>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

function QuickAction({ label, description, icon: Icon, href }: QuickActionProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex items-center justify-between gap-4 rounded-xl border border-border',
        'bg-card ps-5 pe-4 py-5 shadow-[var(--shadow-card)]',
        'transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** Main dashboard page — assembled at /dashboard. */
export default function Dashboard() {
  const { user } = useAuth();

  const totalQuery = useQuery({
    queryKey: ['questions', 'count', 'total'],
    queryFn: () => getQuestions({ limit: 1 }),
  });

  const draftQuery = useQuery({
    queryKey: ['questions', 'count', 'draft'],
    queryFn: () => getQuestions({ limit: 1, status: 'draft' }),
  });

  const pendingQuery = useQuery({
    queryKey: ['questions', 'count', 'in_review'],
    queryFn: () => getQuestions({ limit: 1, status: 'in_review' }),
  });

  const publishedQuery = useQuery({
    queryKey: ['questions', 'count', 'published'],
    queryFn: () => getQuestions({ limit: 1, status: 'published' }),
  });

  const statsQuery = useQuery({
    queryKey: ['game-sessions', 'my-stats'],
    queryFn: getMyStats,
  });

  const displayName = useMemo(() => (user ? toDisplayName(user.email) : ''), [user]);
  const isAdmin = user?.role === 'admin';

  const averageScore =
    statsQuery.data?.average_score !== undefined
      ? Math.round(statsQuery.data.average_score)
      : undefined;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-8 ps-4 pe-4 pt-10 pb-16 sm:ps-6 sm:pe-6 lg:ps-8 lg:pe-8">

        {/* ── Welcome banner ─────────────────────────────────────────────── */}
        <header
          className={cn(
            'rounded-2xl border border-border bg-gradient-to-br',
            'from-indigo-50/70 via-card to-card',
            'dark:from-indigo-950/20 dark:via-card dark:to-card',
            'ps-8 pe-8 pt-8 pb-8 shadow-[var(--shadow-card)]',
            'animate-in fade-in slide-in-from-bottom-4 duration-500',
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Dashboard
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Here's what's happening with your question bank.
              </p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/80 p-4 dark:border-indigo-800/40 dark:bg-indigo-950/40">
                <BookOpen className="h-8 w-8 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
              </div>
            </div>
          </div>
        </header>

        {/* ── Question bank stats ─────────────────────────────────────────── */}
        <section
          aria-labelledby="question-stats-heading"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75"
        >
          <h2
            id="question-stats-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Question Bank
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Questions"
              value={totalQuery.data?.total}
              isLoading={totalQuery.isLoading}
              isError={totalQuery.isError}
              icon={BookOpen}
              accentBorder="border-indigo-500 dark:border-indigo-400"
              iconBg="bg-indigo-50 dark:bg-indigo-950/50"
              iconColor="text-indigo-600 dark:text-indigo-400"
            />
            <StatCard
              label="Draft"
              value={draftQuery.data?.total}
              isLoading={draftQuery.isLoading}
              isError={draftQuery.isError}
              icon={FileEdit}
              accentBorder="border-amber-500 dark:border-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-950/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Pending Review"
              value={pendingQuery.data?.total}
              isLoading={pendingQuery.isLoading}
              isError={pendingQuery.isError}
              icon={Clock}
              accentBorder="border-orange-500 dark:border-orange-400"
              iconBg="bg-orange-50 dark:bg-orange-950/50"
              iconColor="text-orange-600 dark:text-orange-400"
            />
            <StatCard
              label="Published"
              value={publishedQuery.data?.total}
              isLoading={publishedQuery.isLoading}
              isError={publishedQuery.isError}
              icon={CheckCircle2}
              accentBorder="border-emerald-500 dark:border-emerald-400"
              iconBg="bg-emerald-50 dark:bg-emerald-950/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </section>

        {/* ── Game performance ────────────────────────────────────────────── */}
        <section
          aria-labelledby="game-stats-heading"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150"
        >
          <h2
            id="game-stats-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            My Game Performance
          </h2>
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
              <GameStatItem
                label="Games Played"
                value={statsQuery.data?.games_played}
                isLoading={statsQuery.isLoading}
                icon={Gamepad2}
              />
              <GameStatItem
                label="Best Score"
                value={statsQuery.data?.best_score}
                isLoading={statsQuery.isLoading}
                icon={Trophy}
              />
              <GameStatItem
                label="Average Score"
                value={averageScore}
                isLoading={statsQuery.isLoading}
                icon={Activity}
              />
            </div>
          </div>
        </section>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <section
          aria-labelledby="actions-heading"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
        >
          <h2
            id="actions-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickAction
              label="Add Question"
              description="Create a new question in your bank"
              icon={Plus}
              href="/home"
            />
            <QuickAction
              label="Manage Item Banks"
              description="Organise questions into collections"
              icon={Database}
              href="/item-banks"
            />
            <QuickAction
              label="Play a Game"
              description="Test yourself with quiz games"
              icon={Gamepad2}
              href="/games"
            />
          </div>
        </section>

        {/* ── Admin panel (admin role only) ───────────────────────────────── */}
        {isAdmin && (
          <section
            aria-labelledby="admin-heading"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
          >
            <h2
              id="admin-heading"
              className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Admin
            </h2>
            <div
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl',
                'border border-amber-200 bg-amber-50 ps-6 pe-5 py-5',
                'dark:border-amber-900/60 dark:bg-amber-950/30',
              )}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/50">
                  <ShieldAlert
                    className="h-5 w-5 text-amber-700 dark:text-amber-400"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Questions Pending Review
                  </p>
                  {pendingQuery.isLoading ? (
                    <Bone className="mt-1 h-4 w-28 bg-amber-200/70 dark:bg-amber-800/40" />
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {pendingQuery.data?.total ?? 0}{' '}
                      {(pendingQuery.data?.total ?? 0) === 1 ? 'question' : 'questions'} awaiting
                      review
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/admin/users"
                className={cn(
                  'shrink-0 rounded-lg border border-amber-300 bg-white ps-4 pe-4 py-2',
                  'text-sm font-semibold text-amber-800 shadow-sm',
                  'transition-colors hover:bg-amber-50',
                  'dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                )}
              >
                Review Now
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
