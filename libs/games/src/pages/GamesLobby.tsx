/**
 * GamesLobby — the /games landing page.
 *
 * Supports two entry modes:
 *
 *   Full bank mode  /games
 *     Shows type + tag filter dropdowns. The Play button appends them as URL
 *     query params so each game fetches only matching questions.
 *
 *   Item bank mode  /games?item_bank_id=42
 *     Fetches the named item bank and shows its name as the heading. Filters
 *     are hidden because the questions are already scoped by item_bank_id.
 *     The Play button forwards item_bank_id to the game URL instead.
 *     A "Leaderboard" tab is shown so players can see ranked scores.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTags, getItemBank, getLeaderboard } from '@item-bank/api';
import type { GameId } from '@item-bank/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@item-bank/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameCardInfo {
  id: GameId;
  title: string;
  description: string;
  compatibleTypes: string[];
  route: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const GAMES: GameCardInfo[] = [
  {
    id: 'quiz-arcade',
    title: 'Quiz Arcade',
    description:
      'Answer multiple-choice, true/false and numerical questions against the clock.',
    compatibleTypes: ['multiple_choice', 'true_false', 'numerical'],
    route: '/games/quiz-arcade',
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    description: 'Flip cards to pair questions with their matching answers.',
    compatibleTypes: ['matching', 'multiple_choice'],
    route: '/games/memory-match',
  },
  {
    id: 'answer-runner',
    title: 'Answer Runner',
    description:
      'Dodge wrong answers and collect correct ones as they fly toward you.',
    compatibleTypes: ['multiple_choice', 'true_false'],
    route: '/games/answer-runner',
  },
  {
    id: 'pixel-craft',
    title: 'Pixel Craft',
    description:
      'Drag word and equation fragments into a 3×3 grid to forge the right answer.',
    compatibleTypes: ['multiple_choice', 'numerical'],
    route: '/games/pixel-craft',
  },
  {
    id: 'pixel-dash',
    title: 'Pixel Dash',
    description:
      'Switch lanes to dodge obstacles, collect coins, and answer quiz gates in an endless runner.',
    compatibleTypes: ['multiple_choice'],
    route: '/games/pixel-dash',
  },
  {
    id: 'stack-attack',
    title: 'Stack Attack',
    description:
      'Answer questions to stack blocks — time your click for a PERFECT! golden landing.',
    compatibleTypes: ['multiple_choice'],
    route: '/games/stack-attack',
  },
  {
    id: 'meteor-catcher',
    title: 'Meteor Catcher',
    description:
      'Steer your spaceship to catch meteors labelled with the correct answer. Dodge the wrong ones!',
    compatibleTypes: ['multiple_choice'],
    route: '/games/meteor-catcher',
  },
];

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  numerical: 'Numerical',
  matching: 'Matching',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Game card grid — shared between full bank mode and the "Games" tab. */
function GameCardGrid({
  games,
  onPlay,
}: {
  games: GameCardInfo[];
  onPlay: (g: GameCardInfo) => void;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {games.map((game) => (
        <Card key={game.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {game.title}
            </CardTitle>
            <CardDescription>{game.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t('games.compatible_types')}
            </p>
            <div className="flex flex-wrap gap-1">
              {game.compatibleTypes.map((typeKey) => (
                <span
                  key={typeKey}
                  className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                >
                  {TYPE_LABELS[typeKey] ?? typeKey}
                </span>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => onPlay(game)}>
              {t('games.play_button')}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GamesLobby() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [leaderboardGame, setLeaderboardGame] = useState<GameId>('quiz-arcade');

  // Determine which mode we're in by checking the URL.
  const rawBankId = searchParams.get('item_bank_id');
  const itemBankId = rawBankId ? Number(rawBankId) : undefined;
  const isItemBankMode = itemBankId !== undefined;

  // Fetch item bank name only when we're scoped to one bank.
  const { data: itemBank } = useQuery({
    queryKey: ['item-bank', itemBankId],
    queryFn: () => getItemBank(itemBankId!),
    enabled: isItemBankMode,
    staleTime: 60_000,
  });

  // Fetch tags only in full bank mode (filters are hidden in item bank mode).
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
    enabled: !isItemBankMode,
    staleTime: 60_000,
  });

  // Fetch leaderboard only in item bank mode. Pre-fetched on mount so switching
  // to the Leaderboard tab is instant.
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard', leaderboardGame, itemBankId],
    queryFn: () => getLeaderboard(leaderboardGame, itemBankId!),
    enabled: isItemBankMode,
    staleTime: 30_000,
  });

  function handlePlay(game: GameCardInfo) {
    const params = new URLSearchParams();
    if (isItemBankMode) {
      // Item bank mode: forward the bank ID; games will fetch only its questions.
      params.set('item_bank_id', String(itemBankId));
    } else {
      // Full bank mode: forward whichever filters the player chose.
      if (selectedType && selectedType !== 'all')
        params.set('type', selectedType);
      if (selectedTagId && selectedTagId !== 'all')
        params.set('tag_ids', selectedTagId);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    navigate(`${game.route}${qs}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header — item bank name in scoped mode, generic title otherwise */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {isItemBankMode ? (itemBank?.name ?? '…') : ('🎮 ' + t('games.tab_games'))}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('games.play_with_bank')}
        </p>
      </div>

      {isItemBankMode ? (
        /* Item bank mode: Games tab + Leaderboard tab */
        <Tabs defaultValue="games">
          <TabsList className="mb-8">
            <TabsTrigger value="games">{t('games.tab_games')}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t('games.tab_leaderboard')}</TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <GameCardGrid games={GAMES} onPlay={handlePlay} />
          </TabsContent>

          <TabsContent value="leaderboard">
            {/* Game selector for the leaderboard */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-muted-foreground">
                {t('games.game_label')}
              </span>
              <Select
                value={leaderboardGame}
                onValueChange={(v) => setLeaderboardGame(v as GameId)}
              >
                <SelectTrigger
                  className="w-48"
                  aria-label={t('games.select_game_leaderboard_aria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAMES.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {leaderboardLoading ? (
              <div className="flex justify-center py-12">
                <div
                  className="w-8 h-8 rounded-full border-[3px] border-muted border-t-foreground animate-spin"
                  role="status"
                  aria-label={t('games.loading_leaderboard')}
                />
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {t('games.no_scores')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('games.player_col')}</TableHead>
                    <TableHead className="text-end">{t('games.score_col')}</TableHead>
                    <TableHead className="text-end">{t('games.accuracy_col')}</TableHead>
                    <TableHead className="text-end">{t('games.correct_col')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.rank}>
                      <TableCell className="font-medium text-muted-foreground">
                        {entry.rank === 1
                          ? '🥇'
                          : entry.rank === 2
                            ? '🥈'
                            : entry.rank === 3
                              ? '🥉'
                              : entry.rank}
                      </TableCell>
                      <TableCell>{entry.username}</TableCell>
                      <TableCell className="text-end font-semibold">
                        {entry.score}
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground">
                        {entry.accuracy}%
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground">
                        {entry.correct_qs}/{entry.total_qs}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Full bank mode: filters + game cards */
        <>
          <div className="flex flex-wrap gap-3 mb-8">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger
                className="w-48"
                aria-label={t('games.filter_by_type_aria')}
              >
                <SelectValue placeholder={t('games.all_types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('games.all_types')}</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="w-48" aria-label={t('games.filter_by_tag_aria')}>
                <SelectValue placeholder={t('games.all_tags')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('games.all_tags')}</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={String(tag.id)}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <GameCardGrid
            games={
              selectedType === 'all'
                ? GAMES
                : GAMES.filter((g) => g.compatibleTypes.includes(selectedType))
            }
            onPlay={handlePlay}
          />
        </>
      )}
    </div>
  );
}
