import type { CrosswordWord } from '../../domain/types';

// ─── Private types ────────────────────────────────────────────────────────────

type PlacedWord = {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
};

/** Grid maps "row,col" → uppercase letter. */
type Grid = Map<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function key(row: number, col: number): string {
  return `${row},${col}`;
}

function writeWord(grid: Grid, word: PlacedWord): void {
  for (let k = 0; k < word.word.length; k++) {
    const r = word.direction === 'down' ? word.row + k : word.row;
    const c = word.direction === 'across' ? word.col + k : word.col;
    grid.set(key(r, c), word.word[k]);
  }
}

// ─── Validity rules ───────────────────────────────────────────────────────────

/**
 * R1 — No letter conflict.
 * Every cell the new word occupies must either be empty or hold the same letter.
 */
function passesNoConflict(grid: Grid, w: string, row0: number, col0: number, dir: 'across' | 'down'): boolean {
  for (let k = 0; k < w.length; k++) {
    const r = dir === 'down' ? row0 + k : row0;
    const c = dir === 'across' ? col0 + k : col0;
    const existing = grid.get(key(r, c));
    if (existing !== undefined && existing !== w[k]) return false;
  }
  return true;
}

/**
 * R2 — No end-adjacency.
 * The cell immediately before the first letter and after the last letter must
 * be absent from the grid (prevents two words running end-to-end).
 */
function passesNoEndAdjacency(grid: Grid, w: string, row0: number, col0: number, dir: 'across' | 'down'): boolean {
  if (dir === 'across') {
    if (grid.has(key(row0, col0 - 1))) return false;
    if (grid.has(key(row0, col0 + w.length))) return false;
  } else {
    if (grid.has(key(row0 - 1, col0))) return false;
    if (grid.has(key(row0 + w.length, col0))) return false;
  }
  return true;
}

/**
 * R3 — No parallel adjacency.
 * A cell beside the new word (above/below for across; left/right for down)
 * must not be occupied unless that cell is the shared intersection cell itself.
 */
function passesNoParallelAdjacency(grid: Grid, w: string, row0: number, col0: number, dir: 'across' | 'down'): boolean {
  for (let k = 0; k < w.length; k++) {
    const r = dir === 'down' ? row0 + k : row0;
    const c = dir === 'across' ? col0 + k : col0;
    const isIntersection = grid.has(key(r, c));

    if (dir === 'across') {
      if (!isIntersection && (grid.has(key(r - 1, c)) || grid.has(key(r + 1, c)))) return false;
    } else {
      if (!isIntersection && (grid.has(key(r, c - 1)) || grid.has(key(r, c + 1)))) return false;
    }
  }
  return true;
}

function isValidPlacement(grid: Grid, w: string, row0: number, col0: number, dir: 'across' | 'down'): boolean {
  return (
    passesNoConflict(grid, w, row0, col0, dir) &&
    passesNoEndAdjacency(grid, w, row0, col0, dir) &&
    passesNoParallelAdjacency(grid, w, row0, col0, dir)
  );
}

// ─── Core placement loop ──────────────────────────────────────────────────────

/**
 * Count how many cells the new word would occupy that are already in the grid
 * with the correct letter (shared intersections give a higher score).
 */
function countIntersections(grid: Grid, w: string, row0: number, col0: number, dir: 'across' | 'down'): number {
  let count = 0;
  for (let k = 0; k < w.length; k++) {
    const r = dir === 'down' ? row0 + k : row0;
    const c = dir === 'across' ? col0 + k : col0;
    if (grid.get(key(r, c)) === w[k]) count++;
  }
  return count;
}

// ─── Clue number assignment ───────────────────────────────────────────────────

/**
 * Scans all occupied cells top-to-bottom, left-to-right. A cell earns a clue
 * number if it starts an across word, a down word, or both.
 */
function assignClueNumbers(placed: PlacedWord[], grid: Grid): CrosswordWord[] {
  // Collect all occupied cells and sort them
  const cells: Array<{ r: number; c: number }> = [];
  for (const k of grid.keys()) {
    const [r, c] = k.split(',').map(Number);
    cells.push({ r, c });
  }
  cells.sort((a, b) => a.r - b.r || a.c - b.c);

  const clueMap = new Map<string, number>();
  let counter = 1;

  for (const { r, c } of cells) {
    const startsAcross =
      grid.has(key(r, c)) &&
      !grid.has(key(r, c - 1)) &&
      grid.has(key(r, c + 1));
    const startsDown =
      grid.has(key(r, c)) &&
      !grid.has(key(r - 1, c)) &&
      grid.has(key(r + 1, c));

    if (startsAcross || startsDown) {
      clueMap.set(key(r, c), counter++);
    }
  }

  return placed.map((p) => ({
    word: p.word,
    clue: p.clue,
    direction: p.direction,
    row: p.row,
    col: p.col,
    clueNumber: clueMap.get(key(p.row, p.col)) ?? 0,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs the crossword auto-layout algorithm on the given word/clue pairs and
 * returns a fully placed array of CrosswordWord objects with directions, grid
 * coordinates, and clue numbers assigned.
 *
 * The algorithm is greedy: it places words longest-first and picks the
 * candidate placement that creates the most intersections with the current
 * grid. Words that cannot be placed (no valid intersection found) are skipped.
 */
export function generateCrosswordLayout(
  inputs: Array<{ word: string; clue: string }>
): CrosswordWord[] {
  // 1. Filter empty entries; uppercase all words
  const entries = inputs
    .filter((e) => e.word.trim() !== '')
    .map((e) => ({ word: e.word.trim().toUpperCase(), clue: e.clue }));

  if (entries.length === 0) return [];

  // 2. Sort by length descending
  entries.sort((a, b) => b.word.length - a.word.length);

  const grid: Grid = new Map();
  const placed: PlacedWord[] = [];

  // 3. Place first word across at origin
  const first: PlacedWord = { ...entries[0], direction: 'across', row: 0, col: 0 };
  writeWord(grid, first);
  placed.push(first);

  // 4. Place remaining words
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const w = entry.word;

    let bestRow = 0;
    let bestCol = 0;
    let bestDir: 'across' | 'down' = 'across';
    let bestScore = -1;

    for (const p of placed) {
      for (let pi = 0; pi < p.word.length; pi++) {
        for (let wi = 0; wi < w.length; wi++) {
          if (p.word[pi] !== w[wi]) continue;

          let newRow: number;
          let newCol: number;
          let newDir: 'across' | 'down';

          if (p.direction === 'across') {
            newRow = p.row - wi;
            newCol = p.col + pi;
            newDir = 'down';
          } else {
            newRow = p.row + pi;
            newCol = p.col - wi;
            newDir = 'across';
          }

          if (!isValidPlacement(grid, w, newRow, newCol, newDir)) continue;

          const score = countIntersections(grid, w, newRow, newCol, newDir);
          if (score > bestScore) {
            bestScore = score;
            bestRow = newRow;
            bestCol = newCol;
            bestDir = newDir;
          }
        }
      }
    }

    if (bestScore < 0) continue; // no valid placement — skip

    const candidate: PlacedWord = { ...entry, direction: bestDir, row: bestRow, col: bestCol };
    writeWord(grid, candidate);
    placed.push(candidate);
  }

  if (placed.length === 0) return [];

  // 5. Normalise: shift so minRow=0, minCol=0
  const minRow = Math.min(...placed.map((p) => p.row));
  const minCol = Math.min(...placed.map((p) => p.col));

  const shifted: PlacedWord[] = placed.map((p) => ({
    ...p,
    row: p.row - minRow,
    col: p.col - minCol,
  }));

  const shiftedGrid: Grid = new Map();
  for (const p of shifted) writeWord(shiftedGrid, p);

  // 6 & 7. Assign clue numbers and return
  return assignClueNumbers(shifted, shiftedGrid);
}
