/**
 * useGameScores — local score history for a single game.
 *
 * Reads from and writes to localStorage under a per-game key.
 * Only the 5 most recent entries are kept, newest first.
 *
 * Usage:
 *   const { scores, save } = useGameScores('answer-runner');
 *   // inside a useEffect:
 *   save({ score, correct, total, accuracy });
 */

import { useState, useCallback } from 'react';
import type { GameScoreEntry } from '../types';

/** Maximum number of score entries stored per game. */
const MAX_ENTRIES = 5;

function storageKey(game: string): string {
  return `game-scores-${game}`;
}

function readFromStorage(game: string): GameScoreEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(game));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface UseGameScoresResult {
  /** The most recent score entries, newest first. Up to MAX_ENTRIES long. */
  scores: GameScoreEntry[];
  /**
   * Prepend a new entry and persist to localStorage.
   * Call this once per completed game session.
   */
  save: (entry: Omit<GameScoreEntry, 'date'>) => void;
}

export function useGameScores(game: string): UseGameScoresResult {
  const [scores, setScores] = useState<GameScoreEntry[]>(() =>
    readFromStorage(game),
  );

  const save = useCallback(
    (entry: Omit<GameScoreEntry, 'date'>) => {
      const newEntry: GameScoreEntry = {
        ...entry,
        date: new Date().toISOString(),
      };
      const next = [newEntry, ...readFromStorage(game)].slice(0, MAX_ENTRIES);
      try {
        localStorage.setItem(storageKey(game), JSON.stringify(next));
      } catch {
        // localStorage may be unavailable in some browser contexts — fail silently.
      }
      setScores(next);
    },
    [game],
  );

  return { scores, save };
}
