import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, TrendingUp, FileText, Gamepad2, Users } from 'lucide-react';
import { useAuth } from '@item-bank/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import { getAnalyticsOverview } from '../../../../../libs/api/src/analytics';

// ─── Chart constants ──────────────────────────────────────────────────────────

/** Indigo-500 — matches --primary in styles.css, safe to hardcode for recharts. */
const CHART_COLOR = '#6366F1';

/** Grid line colour visible in both light and dark themes. */
const GRID_COLOR = 'rgba(148, 163, 184, 0.25)';

/** Violet accent for the "most popular game" stat card. */
const VIOLET_ACCENT = '#8B5CF6';

/** Sky accent for the "unique players" stat card. */
const SKY_ACCENT = '#0EA5E9';

// ─── Game label map ───────────────────────────────────────────────────────────

const GAME_LABELS: Record<string, string> = {
  'quiz-arcade': 'Quiz Arcade',
  'memory-match': 'Memory Match',
  'answer-runner': 'Answer Runner',
  'pixel-dash': 'Pixel Dash',
  'stack-attack': 'Stack Attack',
  'meteor-catcher': 'Meteor Catcher',
};

function formatGameName(game: string): string {
  return GAME_LABELS[game] ?? game;
}

/** Convert snake_case question type to Title Case for chart labels. */
function formatTypeName(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  /** Tailwind bg-* class or CSS hex string for the top accent bar. */
  accentColor?: string;
  accentClass?: string;
}

/** Single metric card with a coloured top accent bar and a large number. */
function StatCard({ label, value, accentClass, accentColor }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      {accentClass ? (
        <div className={`h-1 w-full ${accentClass}`} />
      ) : (
        <div className="h-1 w-full" style={{ background: accentColor }} />
      )}
      <CardContent className="pb-5 pt-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-8 px-8 py-8">
      <SkeletonBlock className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-72" />
      <SkeletonBlock className="h-80" />
    </div>
  );
}

/** Medal-style rank badge: gold for 1st, silver for 2nd, bronze for 3rd. */
function RankBadge({ rank }: { rank: number }) {
  let colorClass: string;
  if (rank === 1) colorClass = 'bg-amber-400 text-amber-900';
  else if (rank === 2) colorClass = 'bg-slate-300 text-slate-800';
  else if (rank === 3) colorClass = 'bg-orange-400 text-orange-900';
  else colorClass = 'bg-muted text-muted-foreground';

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {rank}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Analytics dashboard — admin-only page.
 *
 * Shows platform-wide question statistics, question-type distribution,
 * game session metrics, and the top-10 global player leaderboard.
 */
export default function Analytics() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getAnalyticsOverview,
    // Only fire the request when the current user is confirmed admin.
    enabled: user?.role === 'admin',
  });

  // ── Access gate ──────────────────────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-sm text-muted-foreground">
          This page is only available to administrators.
        </p>
      </div>
    );
  }

  if (isLoading) return <PageSkeleton />;

  if (isError || !data) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-destructive">
          Failed to load analytics data. Please try again later.
        </p>
      </div>
    );
  }

  const { questions, game_sessions, top_players } = data;

  // Only chart types that actually have questions.
  const activeTypes = questions.by_type
    .filter((t) => t.count > 0)
    .map((t) => ({ ...t, label: formatTypeName(t.type) }));

  const sessionsByGame = game_sessions.by_game.map((s) => ({
    ...s,
    label: formatGameName(s.game),
  }));

  // Derive chart height from the number of rows so no bar gets squashed.
  const typeChartHeight = Math.max(180, activeTypes.length * 44);

  return (
    <main className="space-y-10 px-8 py-8">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-7 w-7 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform overview — admin view</p>
        </div>
      </div>

      {/* ── Section 1: Question status cards ── */}
      <section aria-labelledby="qs-section-heading">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="qs-section-heading" className="text-base font-semibold">
            Questions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Questions" value={questions.total} accentClass="bg-primary" />
          <StatCard label="Draft" value={questions.draft} accentClass="bg-muted-foreground" />
          <StatCard
            label="Pending Review"
            value={questions.pending_review}
            accentColor="#F59E0B"
          />
          <StatCard label="Published" value={questions.published} accentColor="#10B981" />
        </div>
      </section>

      {/* ── Section 2: Questions by Type horizontal bar chart ── */}
      {activeTypes.length > 0 && (
        <section aria-label="Questions by type">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Questions by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={typeChartHeight}>
                <BarChart
                  data={activeTypes}
                  layout="vertical"
                  margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={GRID_COLOR}
                  />
                  {/* XAxis is the value axis in a horizontal (vertical-layout) bar chart */}
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  {/* YAxis is the category axis */}
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={170}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, 'Questions']}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLOR}
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Section 3: Game sessions ── */}
      <section aria-labelledby="sessions-section-heading">
        <div className="mb-4 flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="sessions-section-heading" className="text-base font-semibold">
            Game Sessions
          </h2>
        </div>

        {/* 3 summary stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Sessions"
            value={game_sessions.total}
            accentClass="bg-primary"
          />
          <StatCard
            label="Most Popular Game"
            value={formatGameName(game_sessions.most_popular_game)}
            accentColor={VIOLET_ACCENT}
          />
          <StatCard
            label="Unique Players"
            value={game_sessions.unique_players}
            accentColor={SKY_ACCENT}
          />
        </div>

        {/* Sessions per game bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sessions per Game</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={sessionsByGame}
                margin={{ top: 8, right: 16, bottom: 48, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, 'Sessions']}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Section 4: Top 10 Players table ── */}
      <section aria-labelledby="players-section-heading">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="players-section-heading" className="text-base font-semibold">
            Top 10 Players
          </h2>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-end">Games Played</TableHead>
                  <TableHead className="text-end">Total Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top_players.map((player) => (
                  <TableRow key={player.rank}>
                    <TableCell className="text-center">
                      <RankBadge rank={player.rank} />
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {player.games_played}
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums text-primary">
                      {player.total_score.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
