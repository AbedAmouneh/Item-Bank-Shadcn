/**
 * MemoryMatch — card-flip matching game.
 *
 * Screen flow: idle → playing → results.
 *
 * Pair building rules:
 *   - 'matching' question:        each leftItem/rightItem pair → one card pair
 *   - 'multiple_choice' question: question text + correct answer → one card pair
 *
 * No type filter is passed to useGameQuestions because Memory Match supports
 * two question types (matching + multiple_choice). The pair builders handle
 * filtering internally — other types are simply ignored.
 *
 * A Cubeforge canvas sits behind the card grid (opacity 40%) and fires a green
 * particle burst on each successful match.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@item-bank/ui';
import { useGameQuestions } from '../../domain/hooks';
import { stripHtml } from '../../domain/extractAnswers';
import type { MemoryCard } from '../../domain/types';
import type { Question } from '@item-bank/api';
import MemoryCanvas from './MemoryCanvas';
import MemoryCardTile from './MemoryCardTile';
import MemoryResults from './MemoryResults';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 672;
const CANVAS_H = 460;
/** Maximum card pairs (16 cards) per session. */
const MAX_PAIRS = 8;
/** Minimum pairs needed to start a game. */
const MIN_PAIRS = 4;
/** Milliseconds to show mismatched cards before flipping them back. */
const MISMATCH_DELAY_MS = 900;

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
      { id: `L-${q.id}-${left.id}`, pairId: `${q.id}-${left.id}`, content: left.text, isFlipped: false, isMatched: false },
      { id: `R-${q.id}-${right.id}`, pairId: `${q.id}-${left.id}`, content: right.text, isFlipped: false, isMatched: false },
    ];
  });
}

function buildMCPair(q: Question): MemoryCard[] {
  const choices = (q.content as MCChoiceContent).choices;
  const correct = choices?.find((c) => c.isCorrect);
  if (!correct) return [];
  return [
    { id: `Q-${q.id}`, pairId: String(q.id), content: stripHtml(q.text ?? q.name), isFlipped: false, isMatched: false },
    { id: `A-${q.id}`, pairId: String(q.id), content: stripHtml(correct.text), isFlipped: false, isMatched: false },
  ];
}

/**
 * Build up to MAX_PAIRS card pairs from the loaded questions.
 * Pairs are always added whole (never split mid-pair), so the grid is always even.
 */
function buildCardPairs(questions: Question[]): MemoryCard[] {
  const result: MemoryCard[] = [];
  for (const q of questions) {
    if (result.length >= MAX_PAIRS * 2) break;
    if (q.type !== 'matching' && q.type !== 'multiple_choice') continue;
    const qCards = q.type === 'matching' ? buildMatchingPairs(q) : buildMCPair(q);
    for (let i = 0; i + 1 < qCards.length; i += 2) {
      if (result.length >= MAX_PAIRS * 2) break;
      result.push(qCards[i], qCards[i + 1]);
    }
  }
  return result;
}

function shuffleCards(cards: MemoryCard[]): MemoryCard[] {
  return [...cards].sort(() => Math.random() - 0.5);
}

// ─── Component ───────────────────────────────────────────────────────────────

type GameScreen = 'idle' | 'playing' | 'results';

export default function MemoryMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Bug §3.1 and §3.2 — read tag_ids and item_bank_id from URL.
  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  // No type filter passed — pair builders accept matching + multiple_choice only.
  const { data, isLoading, isError } = useGameQuestions({ tag_ids, item_bank_id });
  const questions = useMemo(() => data?.items ?? [], [data]);

  // Stable (unshuffled) pool of pairs derived from the loaded questions.
  const candidateCards = useMemo(() => buildCardPairs(questions), [questions]);
  const hasSufficientPairs = candidateCards.length / 2 >= MIN_PAIRS;

  // ── State ────────────────────────────────────────────────────────────────

  const [screen, setScreen] = useState<GameScreen>('idle');
  /** Shuffled card array for the active session. */
  const [cards, setCards] = useState<MemoryCard[]>([]);
  /** IDs of the 1–2 cards currently face-up and being evaluated. */
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const totalPairs = cards.length / 2;

  // ── Completion detection ─────────────────────────────────────────────────

  // Transition to results screen once all pairs are matched, giving the flip
  // animation (400 ms) time to finish before switching screens.
  useEffect(() => {
    if (screen !== 'playing' || matchCount === 0 || matchCount < totalPairs) return;
    const t = setTimeout(() => setScreen('results'), 600);
    return () => clearTimeout(t);
  }, [screen, matchCount, totalPairs]);

  // ── Game actions ──────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    setCards(shuffleCards(candidateCards));
    setFlipped([]);
    setMoves(0);
    setMatchCount(0);
    setShowBurst(false);
    setScreen('playing');
  }, [candidateCards]);

  const handleCardClick = useCallback(
    (id: string) => {
      // Block all clicks while two cards are pending evaluation.
      if (flipped.length === 2) return;

      // Flip this card face-up immediately so both cards are visible during evaluation.
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)));

      const next = [...flipped, id];
      setFlipped(next);

      // First card — wait for the second.
      if (next.length < 2) return;

      setMoves((m) => m + 1);

      // Look up both cards. pairId never changes, so reading from the
      // pre-update snapshot is fine here.
      const cardA = cards.find((c) => c.id === next[0]);
      const cardB = cards.find((c) => c.id === id);
      if (!cardA || !cardB) { setFlipped([]); return; }

      if (cardA.pairId === cardB.pairId) {
        // Match — permanently reveal with green styling.
        setCards((prev) =>
          prev.map((c) =>
            c.pairId === cardA.pairId ? { ...c, isMatched: true, isFlipped: true } : c,
          ),
        );
        setMatchCount((mc) => mc + 1);
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 1000);
        setFlipped([]);
      } else {
        // Mismatch — both cards are face-up (player can see them), then flip back.
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (next.includes(c.id) ? { ...c, isFlipped: false } : c)),
          );
          setFlipped([]);
        }, MISMATCH_DELAY_MS);
      }
    },
    [flipped, cards],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isLoading && isError) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-muted-foreground">Could not load questions.</p>
        <Button variant="outline" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>
    );
  }

  if (!isLoading && !hasSufficientPairs) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-muted-foreground">
          Not enough compatible questions — need at least {MIN_PAIRS} pairs to play.
        </p>
        <Button variant="outline" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between w-full max-w-[672px]">
        <h2 className="text-xl font-bold">🃏 Memory Match</h2>
        <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
      </div>

      {/* Responsive wrapper — allows horizontal scroll on narrow viewports */}
      <div className="w-full overflow-x-auto">
        {/* Game frame — fixed canvas behind, HTML overlay in front */}
        <div
          className="relative rounded-xl overflow-hidden border border-border mx-auto"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          {isLoading && (
            /* Loading spinner centred inside the game frame */
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
              <div
                className="w-10 h-10 rounded-full border-[3px] border-muted border-t-foreground animate-spin"
                role="status"
                aria-label="Loading questions"
              />
            </div>
          )}

          {/* Cubeforge canvas — background effects at 40% opacity */}
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <MemoryCanvas width={CANVAS_W} height={CANVAS_H} showBurst={showBurst} />
          </div>

          {/* HTML overlay — interactive game layer */}
          <div className="absolute inset-0 z-10 flex flex-col">

          {screen === 'idle' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-white p-6">
              <p className="text-4xl">🃏</p>
              <p className="text-xl font-bold">Memory Match</p>
              <p className="text-sm text-white/60">
                {candidateCards.length / 2} pairs · flip cards to find matches
              </p>
              <Button onClick={startGame} className="mt-2">Start Game</Button>
            </div>
          )}

          {screen === 'playing' && (
            <div className="flex flex-col gap-3 p-4">
              {/* HUD */}
              <div className="flex items-center justify-between text-white text-sm font-semibold px-1">
                <span>Pairs: {matchCount} / {totalPairs}</span>
                <span>Moves: {moves}</span>
              </div>

              {/* 4 × 4 card grid */}
              <div className="grid grid-cols-4 gap-2">
                {cards.map((card) => (
                  <MemoryCardTile
                    key={card.id}
                    card={card}
                    onClick={() => handleCardClick(card.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {screen === 'results' && (
            <div className="flex flex-col items-center justify-center flex-1">
              <MemoryResults
                matchCount={matchCount}
                totalPairs={totalPairs}
                moves={moves}
                item_bank_id={item_bank_id}
                onPlayAgain={startGame}
                onBack={() => navigate('/games')}
              />
            </div>
          )}

          </div>
        </div>
      </div>

      {/* ── How to Play ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-[672px] rounded-xl border border-white/10 bg-[#0a0a1f] px-5 py-4">
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
          How to Play
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">🃏</span>
            <span className="text-white/65 text-xs leading-snug">All cards start face-down in a grid</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">👆</span>
            <span className="text-white/65 text-xs leading-snug">Click any card to flip it over</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">🔍</span>
            <span className="text-white/65 text-xs leading-snug">Click a second card to find its pair</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">✅</span>
            <span className="text-white/65 text-xs leading-snug">Matching pair stays revealed in green</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">❌</span>
            <span className="text-white/65 text-xs leading-snug">No match — both cards flip back after 0.9 s</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none w-6 text-center shrink-0">🏆</span>
            <span className="text-white/65 text-xs leading-snug">Match all pairs in as few moves as possible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
