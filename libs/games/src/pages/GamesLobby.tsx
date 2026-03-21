/**
 * GamesLobby — the /games landing page.
 *
 * Shows three game cards (Quiz Arcade, Memory Match, Answer Runner).
 * The player picks an optional tag and question type, then clicks Play
 * to navigate to the game with those filters as URL query parameters.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTags } from '@item-bank/api';
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
} from '@item-bank/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameCardInfo {
  id: string;
  emoji: string;
  title: string;
  description: string;
  compatibleTypes: string[];
  route: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const GAMES: GameCardInfo[] = [
  {
    id: 'quiz-arcade',
    emoji: '🎯',
    title: 'Quiz Arcade',
    description: 'Answer multiple-choice, true/false and numerical questions against the clock.',
    compatibleTypes: ['multiple_choice', 'true_false', 'numerical'],
    route: '/games/quiz-arcade',
  },
  {
    id: 'memory-match',
    emoji: '🃏',
    title: 'Memory Match',
    description: 'Flip cards to pair questions with their matching answers.',
    compatibleTypes: ['matching', 'multiple_choice'],
    route: '/games/memory-match',
  },
  {
    id: 'answer-runner',
    emoji: '🏃',
    title: 'Answer Runner',
    description: 'Dodge wrong answers and collect correct ones as they fly toward you.',
    compatibleTypes: ['multiple_choice', 'true_false'],
    route: '/games/answer-runner',
  },
];

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  numerical: 'Numerical',
  matching: 'Matching',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function GamesLobby() {
  const navigate = useNavigate();
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
    staleTime: 60_000,
  });

  function handlePlay(game: GameCardInfo) {
    const params = new URLSearchParams();
    if (selectedType && selectedType !== 'all') params.set('type', selectedType);
    if (selectedTagId && selectedTagId !== 'all') params.set('tag_ids', selectedTagId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    navigate(`${game.route}${qs}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">🎮 Games</h1>
        <p className="text-muted-foreground mt-1">Play with your question bank</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48" aria-label="Filter by question type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTagId} onValueChange={setSelectedTagId}>
          <SelectTrigger className="w-48" aria-label="Filter by tag">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={String(tag.id)}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Card key={game.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span role="img" aria-label={game.title}>{game.emoji}</span>
                {game.title}
              </CardTitle>
              <CardDescription>{game.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Compatible types
              </p>
              <div className="flex flex-wrap gap-1">
                {game.compatibleTypes.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                  >
                    {TYPE_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handlePlay(game)}>
                Play →
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
