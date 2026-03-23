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
import FoxMascot, { FOX_LINES, pickLine } from '../../components/FoxMascot';
import HowToPlaySidebar from '../../components/HowToPlaySidebar';

const MEMORY_RULES = [
  'All cards start face-down in a grid',
  'Click any card to flip it over',
  'Click a second card to look for its matching pair',
  'A matched pair stays revealed',
  'No match — both cards flip back after a short delay',
  'Match all pairs in as few moves as possible to win',
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 672;
// 540px gives the fox speech bubble enough room below the 4×4 card grid
// without clipping. (4 rows × 80px cards + HUD + padding ≈ 510px needed.)
const CANVAS_H = 540;
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

  // ── Fox mascot dialogue ──────────────────────────────────────────────────
  const [foxLine, setFoxLine] = useState<string>(FOX_LINES.memory_idle);

  useEffect(() => {
    if (screen === 'idle') setFoxLine(FOX_LINES.memory_idle);
    if (screen === 'playing') setFoxLine(FOX_LINES.memory_playing);
    if (screen === 'results') {
      const totalP = cards.length / 2;
      // Celebrate especially efficient runs (moves close to optimal = totalPairs).
      setFoxLine(
        moves <= totalP + 2
          ? FOX_LINES.memory_few_moves
          : FOX_LINES.memory_win,
      );
    }
  }, [screen, cards.length, moves]);

  const totalPairs = cards.length / 2;

  // ── Cycling question display ──────────────────────────────────────────────
  // Shows every question in the game session, cycling every 3 s.
  // Derived from the raw `questions` array so we always get proper question
  // sentences — not card content (card content for matching questions is just
  // individual items like "Jupiter" or "Brazil", which are not questions).
  //   multiple_choice → q.text (the actual question sentence)
  //   matching        → q.name (the matching question's title)
  const questionTexts = useMemo(() => {
    const usedIds = new Set(candidateCards.map((c) => {
      // Extract the question id from the card id: Q-<qId>, A-<qId>, L-<qId>-<itemId>
      const parts = c.id.split('-');
      return parts[1];
    }));
    return questions
      .filter((q) => usedIds.has(String(q.id)) && (q.type === 'multiple_choice' || q.type === 'matching'))
      .map((q) => stripHtml(q.type === 'multiple_choice' ? (q.text ?? q.name) : q.name))
      .filter(Boolean) as string[];
  }, [questions, candidateCards]);

  // displayedIndex drives what text is shown; questionVisible controls the
  // fade transition so the swap happens while the text is invisible.
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [questionVisible, setQuestionVisible] = useState(true);

  // Rotate the displayed question every 6 s while the game is active.
  // Sequence: fade out (400 ms) → swap text → fade in.
  useEffect(() => {
    if (screen !== 'playing' || questionTexts.length === 0) return;
    const id = setInterval(() => {
      setQuestionVisible(false);
      setTimeout(() => {
        setDisplayedIndex((i) => (i + 1) % questionTexts.length);
        setQuestionVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(id);
  }, [screen, questionTexts.length]);

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
        setFoxLine(pickLine(FOX_LINES.memory_match));
      } else {
        // Mismatch — both cards are face-up (player can see them), then flip back.
        setFoxLine(pickLine(FOX_LINES.memory_mismatch));
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
    <div className="flex items-start gap-6 justify-center p-6">
      {/* How to Play sidebar — desktop only */}
      <HowToPlaySidebar rules={MEMORY_RULES} />

      {/* Game column — header sits directly above the canvas */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Memory Match</h2>
          <Button variant="ghost" onClick={() => navigate('/games')}>← Back to Games</Button>
        </div>

        {/* Game frame — fixed canvas behind, HTML overlay in front */}
        <div
          className="relative rounded-xl overflow-hidden border border-border"
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
            <div className="flex flex-col items-center justify-center flex-1 gap-5 text-white p-6">
              <FoxMascot line={foxLine} />
              <p className="text-xl font-bold">Memory Match</p>
              <p className="text-sm text-white/60">
                {candidateCards.length / 2} pairs · flip cards to find matches
              </p>
              <Button onClick={startGame} className="mt-1">Start Game</Button>
            </div>
          )}

          {screen === 'playing' && (
            <div className="flex flex-col gap-3 p-4">
              {/* HUD */}
              <div className="flex items-center justify-between text-white text-sm font-semibold px-1">
                <span className="shrink-0">Pairs: {matchCount} / {totalPairs}</span>
                {/* Cycling question — shows each question in the game, rotating every 6 s */}
                <span
                  className="min-w-0 flex-1 text-center text-[11px] px-3 truncate"
                  style={{ opacity: questionVisible ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}
                >
                  {questionTexts.length > 0 && (
                    <>
                      <span className="me-1.5 align-middle">⭐</span>
                      <span className="text-yellow-200 font-semibold">{questionTexts[displayedIndex]}</span>
                    </>
                  )}
                </span>
                <span className="shrink-0">Moves: {moves}</span>
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

              {/* Fox mascot — reacts to matches and mismatches */}
              <div className="px-1 pt-1">
                <FoxMascot line={foxLine} />
              </div>
            </div>
          )}

          {screen === 'results' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
              <FoxMascot line={foxLine} />
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
    </div>
  );
}
