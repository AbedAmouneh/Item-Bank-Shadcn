import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';
import type { CrosswordWord } from '../../domain/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CrosswordViewProps = {
  question: QuestionRow;
};

type CheckStatus = 'correct' | 'incorrect' | 'empty';

type ActiveInfo = { row: number; col: number } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Returns all (row,col) pairs occupied by a placed word. */
function wordCells(w: CrosswordWord): Array<{ row: number; col: number }> {
  return Array.from({ length: w.word.length }, (_, k) => ({
    row: w.direction === 'down' ? w.row + k : w.row,
    col: w.direction === 'across' ? w.col + k : w.col,
  }));
}

/** Computes grid dimensions from placed words. */
function computeDimensions(words: CrosswordWord[]): { rows: number; cols: number } {
  let maxRow = 0;
  let maxCol = 0;
  for (const w of words) {
    for (const c of wordCells(w)) {
      if (c.row > maxRow) maxRow = c.row;
      if (c.col > maxCol) maxCol = c.col;
    }
  }
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

/** Builds the canonical cell map: key → { letter, clueNumber? }. */
function buildCellMap(words: CrosswordWord[]): Map<string, { letter: string; clueNumber?: number }> {
  const map = new Map<string, { letter: string; clueNumber?: number }>();
  for (const w of words) {
    const cells = wordCells(w);
    cells.forEach(({ row, col }, k) => {
      const key = cellKey(row, col);
      const prev = map.get(key);
      map.set(key, {
        letter: w.word[k],
        clueNumber: k === 0 ? w.clueNumber : prev?.clueNumber,
      });
    });
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

function CrosswordView({ question }: CrosswordViewProps) {
  const { t } = useTranslation('questions');

  const crosswordWords: CrosswordWord[] = question.crosswordWords ?? [];
  const gridLayout = question.crosswordGridLayout ?? 'ltr';
  const hintMode = question.crosswordHintMode ?? 'none';
  const hintValue = question.crosswordHintValue ?? 0;
  const mark = question.mark;

  const { rows: gridRows, cols: gridCols } = useMemo(
    () => computeDimensions(crosswordWords),
    [crosswordWords]
  );
  const cellMap = useMemo(() => buildCellMap(crosswordWords), [crosswordWords]);

  // All white cells (cells that belong to at least one word)
  const totalCells = useMemo(() => cellMap.size, [cellMap]);

  // ─── State ──────────────────────────────────────────────────────────────────

  const [userInput, setUserInput] = useState<Map<string, string>>(new Map());
  const [activeCell, setActiveCell] = useState<ActiveInfo>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const [checkState, setCheckState] = useState<Map<string, CheckStatus> | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // ─── Active word cells ───────────────────────────────────────────────────────

  /** Returns the CrosswordWord that contains (row, col) in the given direction, if any. */
  const findWord = useCallback(
    (row: number, col: number, dir: 'across' | 'down'): CrosswordWord | null => {
      return (
        crosswordWords.find((w) => {
          if (w.direction !== dir) return false;
          return wordCells(w).some((c) => c.row === row && c.col === col);
        }) ?? null
      );
    },
    [crosswordWords]
  );

  /** Set of keys for the cells of the currently active word. */
  const activeWordKeys = useMemo((): Set<string> => {
    if (!activeCell) return new Set();
    const w = findWord(activeCell.row, activeCell.col, activeDirection);
    if (!w) return new Set();
    return new Set(wordCells(w).map((c) => cellKey(c.row, c.col)));
  }, [activeCell, activeDirection, findWord]);

  // ─── Cell click ─────────────────────────────────────────────────────────────

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!cellMap.has(cellKey(row, col))) return;

      const isSameCell = activeCell?.row === row && activeCell?.col === col;
      const hasAcross = findWord(row, col, 'across') !== null;
      const hasDown = findWord(row, col, 'down') !== null;

      let nextDir = activeDirection;
      if (isSameCell && hasAcross && hasDown) {
        // Toggle direction on second click of same intersection cell
        nextDir = activeDirection === 'across' ? 'down' : 'across';
      } else if (!findWord(row, col, activeDirection)) {
        // Current direction has no word through this cell — switch
        nextDir = activeDirection === 'across' ? 'down' : 'across';
      }

      setActiveCell({ row, col });
      setActiveDirection(nextDir);

      // Focus the DOM input
      const input = gridRef.current?.querySelector<HTMLInputElement>(
        `[data-row="${row}"][data-col="${col}"]`
      );
      input?.focus();
    },
    [activeCell, activeDirection, cellMap, findWord]
  );

  // ─── Keyboard input ──────────────────────────────────────────────────────────

  const moveFocus = useCallback(
    (row: number, col: number, dir: 'across' | 'down', delta: 1 | -1) => {
      const dr = dir === 'down' ? delta : 0;
      const dc = dir === 'across' ? delta : 0;
      let r = row + dr;
      let c = col + dc;
      // Skip cells that are in the word (already typed) — just move, don't skip filled
      if (cellMap.has(cellKey(r, c))) {
        setActiveCell({ row: r, col: c });
        gridRef.current
          ?.querySelector<HTMLInputElement>(`[data-row="${r}"][data-col="${c}"]`)
          ?.focus();
      }
    },
    [cellMap]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
      const letter = e.key.length === 1 && /[a-zA-Z]/.test(e.key) ? e.key.toUpperCase() : null;

      if (letter) {
        e.preventDefault();
        setUserInput((prev) => {
          const next = new Map(prev);
          next.set(cellKey(row, col), letter);
          return next;
        });
        setCheckState(null);
        moveFocus(row, col, activeDirection, 1);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setUserInput((prev) => {
          const next = new Map(prev);
          next.delete(cellKey(row, col));
          return next;
        });
        setCheckState(null);
        moveFocus(row, col, activeDirection, -1);
        return;
      }

      const arrowMap: Record<string, { dr: number; dc: number }> = {
        ArrowUp: { dr: -1, dc: 0 },
        ArrowDown: { dr: 1, dc: 0 },
        ArrowLeft: { dr: 0, dc: -1 },
        ArrowRight: { dr: 0, dc: 1 },
      };
      const arrow = arrowMap[e.key];
      if (arrow) {
        e.preventDefault();
        const nr = row + arrow.dr;
        const nc = col + arrow.dc;
        if (cellMap.has(cellKey(nr, nc))) {
          setActiveCell({ row: nr, col: nc });
          gridRef.current
            ?.querySelector<HTMLInputElement>(`[data-row="${nr}"][data-col="${nc}"]`)
            ?.focus();
        }
      }
    },
    [activeDirection, cellMap, moveFocus]
  );

  // ─── Check answer ────────────────────────────────────────────────────────────

  const handleCheck = useCallback(() => {
    const next = new Map<string, CheckStatus>();
    let correct = 0;

    for (const [k, cell] of cellMap.entries()) {
      const typed = userInput.get(k)?.toUpperCase();
      if (!typed) {
        next.set(k, 'empty');
      } else if (typed === cell.letter) {
        next.set(k, 'correct');
        correct++;
      } else {
        next.set(k, 'incorrect');
      }
    }

    setCheckState(next);
    const isSolved = correct === totalCells;
    setSolved(isSolved);
    const proportional = Math.round((correct / totalCells) * mark * 10) / 10;
    setScore(proportional);
  }, [cellMap, userInput, totalCells, mark]);

  // ─── Show solution ────────────────────────────────────────────────────────────

  const handleShowSolution = useCallback(() => {
    // Count how many cells the student had correct before revealing
    let correctBeforeReveal = 0;
    for (const [k, cell] of cellMap.entries()) {
      const typed = userInput.get(k)?.toUpperCase();
      if (typed === cell.letter) correctBeforeReveal++;
    }

    const filled = new Map<string, string>();
    for (const [k, cell] of cellMap.entries()) {
      filled.set(k, cell.letter);
    }
    setUserInput(filled);

    const allCorrect = new Map<string, CheckStatus>();
    for (const k of cellMap.keys()) allCorrect.set(k, 'correct');
    setCheckState(allCorrect);
    setSolved(true);
    // Score based on what the student had right, not the revealed answer
    const proportional = Math.round((correctBeforeReveal / totalCells) * mark * 10) / 10;
    setScore(proportional);
  }, [cellMap, userInput, totalCells, mark]);

  // ─── Hint ─────────────────────────────────────────────────────────────────────

  const handleHint = useCallback(() => {
    const emptyCells = [...cellMap.keys()].filter((k) => !userInput.get(k) && !revealed.has(k));
    let count = 0;
    if (hintMode === 'count') count = Math.min(hintValue, emptyCells.length);
    else if (hintMode === 'percentage') count = Math.floor(totalCells * hintValue / 100);

    // Shuffle and pick
    const shuffled = emptyCells.sort(() => Math.random() - 0.5).slice(0, count);
    setRevealed((prev) => {
      const next = new Set(prev);
      shuffled.forEach((k) => next.add(k));
      return next;
    });
    setUserInput((prev) => {
      const next = new Map(prev);
      shuffled.forEach((k) => {
        const cell = cellMap.get(k);
        if (cell) next.set(k, cell.letter);
      });
      return next;
    });
  }, [cellMap, userInput, revealed, hintMode, hintValue, totalCells]);

  // ─── Clue click ───────────────────────────────────────────────────────────────

  const handleClueClick = useCallback(
    (w: CrosswordWord) => {
      setActiveCell({ row: w.row, col: w.col });
      setActiveDirection(w.direction);
      gridRef.current
        ?.querySelector<HTMLInputElement>(`[data-row="${w.row}"][data-col="${w.col}"]`)
        ?.focus();
    },
    []
  );

  // ─── Cell colour ──────────────────────────────────────────────────────────────

  const getCellClass = useCallback(
    (key: string): string => {
      const isActive = activeWordKeys.has(key);
      const status = checkState?.get(key);
      const isRevealed = revealed.has(key);

      if (status === 'correct') return 'bg-green-100 dark:bg-green-900/40';
      if (status === 'incorrect') return 'bg-red-100 dark:bg-red-900/40';
      if (status === 'empty') return 'bg-slate-200 dark:bg-slate-700';
      if (isRevealed) return 'bg-blue-100 dark:bg-blue-900/30';
      if (isActive) return 'bg-primary/10';
      return 'bg-background';
    },
    [activeWordKeys, checkState, revealed]
  );

  // ─── Clue lists ───────────────────────────────────────────────────────────────

  const acrossWords = useMemo(
    () => [...crosswordWords].filter((w) => w.direction === 'across').sort((a, b) => a.clueNumber - b.clueNumber),
    [crosswordWords]
  );
  const downWords = useMemo(
    () => [...crosswordWords].filter((w) => w.direction === 'down').sort((a, b) => a.clueNumber - b.clueNumber),
    [crosswordWords]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (crosswordWords.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('no')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Grid */}
      <div className="overflow-auto" style={{ direction: gridLayout }}>
        <div
          ref={gridRef}
          className="inline-grid gap-px bg-border border border-border"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 2.5rem)`,
            gridTemplateRows: `repeat(${gridRows}, 2.5rem)`,
          }}
        >
          {Array.from({ length: gridRows }, (_, r) =>
            Array.from({ length: gridCols }, (_, c) => {
              const key = cellKey(r, c);
              const cell = cellMap.get(key);

              if (!cell) {
                return (
                  <div
                    key={key}
                    className="bg-foreground/80"
                    style={{ width: '2.5rem', height: '2.5rem' }}
                  />
                );
              }

              return (
                <div
                  key={key}
                  className={cn(
                    'relative border border-border/30',
                    getCellClass(key)
                  )}
                  style={{ width: '2.5rem', height: '2.5rem' }}
                  onClick={() => handleCellClick(r, c)}
                >
                  {cell.clueNumber !== undefined && cell.clueNumber > 0 && (
                    <span className="absolute top-0 start-0 text-[0.5rem] leading-none text-muted-foreground ps-0.5 pt-0.5 pointer-events-none z-10">
                      {cell.clueNumber}
                    </span>
                  )}
                  <input
                    data-row={r}
                    data-col={c}
                    maxLength={1}
                    value={userInput.get(key) ?? ''}
                    readOnly={solved}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                    onChange={() => { /* handled via onKeyDown */ }}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    onFocus={() => handleCellClick(r, c)}
                    className={cn(
                      'w-full h-full text-center bg-transparent border-none outline-none',
                      'text-sm font-semibold uppercase caret-transparent',
                      solved ? 'cursor-default' : 'cursor-text'
                    )}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      {!solved && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheck}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('crossword_check')}
          </button>
          <button
            type="button"
            onClick={handleShowSolution}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            {t('show_solution')}
          </button>
          {hintMode !== 'none' && (
            <button
              type="button"
              onClick={handleHint}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {t('crossword_hint')}
            </button>
          )}
        </div>
      )}

      {/* Score */}
      {score !== null && (
        <p className="text-sm font-medium text-foreground">
          {t('crossword_score', { score, max: mark })}
        </p>
      )}

      {/* Clue lists */}
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h3 className="font-semibold text-foreground mb-2">{t('crossword_across')}</h3>
          <ol className="space-y-1">
            {acrossWords.map((w) => (
              <li
                key={w.clueNumber}
                className={cn(
                  'cursor-pointer hover:text-primary transition-colors',
                  activeCell?.row === w.row && activeCell?.col === w.col && activeDirection === 'across'
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
                onClick={() => handleClueClick(w)}
              >
                {w.clueNumber}. {w.clue}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">{t('crossword_down')}</h3>
          <ol className="space-y-1">
            {downWords.map((w) => (
              <li
                key={w.clueNumber}
                className={cn(
                  'cursor-pointer hover:text-primary transition-colors',
                  activeCell?.row === w.row && activeCell?.col === w.col && activeDirection === 'down'
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
                onClick={() => handleClueClick(w)}
              >
                {w.clueNumber}. {w.clue}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default memo(CrosswordView);
