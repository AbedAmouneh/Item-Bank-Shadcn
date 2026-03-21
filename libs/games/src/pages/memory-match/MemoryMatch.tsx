/**
 * MemoryMatch — card-flip matching game.
 *
 * Players flip two cards at a time. If both cards share a `pairId`
 * (question ↔ correct answer), they stay revealed. Built from `matching`
 * question types where the left item pairs with a linked right item.
 *
 * Cards are plain HTML divs with a CSS 3-D flip. A Cubeforge canvas
 * runs in the background emitting star particles on each match.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Game,
  World,
  Entity,
  Transform,
  ParticleEmitter,
  Camera2D,
} from 'cubeforge';
import { Button, cn } from '@item-bank/ui';
import { useGameQuestions } from '../../domain/hooks';
import type { MemoryCard } from '../../domain/types';
import type { Question } from '@item-bank/api';

// ─── Content shapes ───────────────────────────────────────────────────────────

interface MatchingItem {
  id: string;
  text: string;
  linkedRightIds?: string[];
}

interface MatchingContent extends Record<string, unknown> {
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
}

interface MCChoiceContent extends Record<string, unknown> {
  choices: Array<{ id: string; text: string; isCorrect: boolean }>;
}

// ─── Pair builders ────────────────────────────────────────────────────────────

function buildMatchingPairs(q: Question): MemoryCard[] {
  const { leftItems, rightItems } = q.content as MatchingContent;
  return leftItems.flatMap((left) => {
    const linkedId = left.linkedRightIds?.[0];
    const right = rightItems.find((r) => r.id === linkedId);
    if (!right) return [];
    return [
      { id: `L-${left.id}`, pairId: left.id, content: left.text, isFlipped: false, isMatched: false },
      { id: `R-${right.id}`, pairId: left.id, content: right.text, isFlipped: false, isMatched: false },
    ];
  });
}

function buildMCPairs(q: Question): MemoryCard[] {
  const choices = (q.content as MCChoiceContent).choices;
  const correct = choices.find((c) => c.isCorrect);
  if (!correct) return [];
  return [
    { id: `Q-${q.id}`, pairId: String(q.id), content: q.text ?? q.name, isFlipped: false, isMatched: false },
    { id: `A-${q.id}`, pairId: String(q.id), content: correct.text, isFlipped: false, isMatched: false },
  ];
}

function buildCards(questions: Question[]): MemoryCard[] {
  const pairs = questions.flatMap((q) =>
    q.type === 'matching' ? buildMatchingPairs(q) : buildMCPairs(q),
  );
  return pairs
    .slice(0, 16) // 4×4 grid — 8 pairs max
    .sort(() => Math.random() - 0.5);
}

// ─── Card component ───────────────────────────────────────────────────────────

function MemoryCardTile({
  card,
  onClick,
}: {
  card: MemoryCard;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={card.isFlipped || card.isMatched}
      aria-label={card.isFlipped || card.isMatched ? card.content : 'Hidden card'}
      className={cn(
        'relative h-24 rounded-xl border transition-all duration-300 cursor-pointer disabled:cursor-default',
        'text-xs font-medium p-2 text-center',
        card.isMatched
          ? 'bg-green-600/20 border-green-500 text-green-300'
          : card.isFlipped
          ? 'bg-primary border-primary text-white'
          : 'bg-card border-border text-transparent hover:border-primary/50',
      )}
    >
      {(card.isFlipped || card.isMatched) && (
        <span className="break-words">{card.content}</span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MemoryMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionType = searchParams.get('type') ?? 'matching';
  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const { data, isLoading, isError } = useGameQuestions({ type: questionType, tag_ids, item_bank_id });
  const questions = data?.items ?? [];

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Initialise cards when questions load.
  useEffect(() => {
    if (questions.length > 0 && cards.length === 0) {
      setCards(buildCards(questions));
    }
  }, [questions, cards.length]);

  const totalPairs = cards.length / 2;

  const handleCardClick = useCallback(
    (id: string) => {
      if (flipped.length === 2) return; // wait for mismatch reset
      const next = [...flipped, id];
      setFlipped(next);

      if (next.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = next.map((fid) => cards.find((c) => c.id === fid)!);
        if (a.pairId === b.pairId) {
          // Match!
          setCards((prev) =>
            prev.map((c) =>
              c.pairId === a.pairId ? { ...c, isMatched: true, isFlipped: true } : c,
            ),
          );
          setMatchCount((mc) => {
            const next = mc + 1;
            if (next >= totalPairs) setIsComplete(true);
            return next;
          });
          setShowBurst(true);
          setTimeout(() => setShowBurst(false), 1000);
          setFlipped([]);
        } else {
          // Mismatch — flip back after a short pause.
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                next.includes(c.id) ? { ...c, isFlipped: false } : c,
              ),
            );
            setFlipped([]);
          }, 900);
        }
      } else {
        setCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)),
        );
      }
    },
    [flipped, cards, totalPairs],
  );

  const restart = () => {
    setCards(buildCards(questions));
    setFlipped([]);
    setMoves(0);
    setMatchCount(0);
    setIsComplete(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-20 text-muted-foreground">Loading…</div>;
  }

  if (isError || questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-muted-foreground">No matching questions found.</p>
        <Button variant="outline" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-xl font-bold">🃏 Memory Match</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{matchCount}/{totalPairs} pairs • {moves} moves</span>
          <Button variant="outline" size="sm" onClick={restart}>Restart</Button>
          <Button variant="ghost" onClick={() => navigate('/games')}>← Back</Button>
        </div>
      </div>

      {/* Background Cubeforge canvas */}
      <div className="relative w-full max-w-2xl">
        <div className="absolute inset-0 rounded-xl overflow-hidden opacity-40 pointer-events-none">
          <Game width={672} height={400} gravity={0}>
            <World background="#0a0a1a">
              <Camera2D />
              {showBurst && (
                <Entity id={`match-burst-${Date.now()}`}>
                  <Transform x={336} y={200} />
                  <ParticleEmitter
                    burstCount={30}
                    color="#22c55e"
                    speed={140}
                    particleLife={0.8}
                    spread={Math.PI * 2}
                    particleSize={4}
                    colorOverLife={['#22c55e', '#86efac', '#ffffff']}
                  />
                </Entity>
              )}
            </World>
          </Game>
        </div>

        {/* Card grid */}
        <div className="relative z-10 grid grid-cols-4 gap-3 p-4">
          {cards.map((card) => (
            <MemoryCardTile
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Completion banner */}
      {isComplete && (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-green-500 bg-green-500/10 text-center">
          <p className="text-2xl font-bold text-green-400">🏆 You matched them all!</p>
          <p className="text-muted-foreground">Completed in {moves} moves</p>
          <div className="flex gap-3 mt-1">
            <Button variant="outline" onClick={() => navigate('/games')}>← Back to Games</Button>
            <Button onClick={restart}>Play Again</Button>
          </div>
        </div>
      )}
    </div>
  );
}
