import React, { memo, useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import type { QuestionFormData } from '../../components/QuestionEditorShell';
import type { CrosswordWord } from '../../domain/types';
import { generateCrosswordLayout } from './crosswordLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type CrosswordWizardProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
};

type WordRow = { word: string; clue: string };

// ─── Grid preview helpers ─────────────────────────────────────────────────────

/** Returns the total number of rows and columns occupied by the placed words. */
function computeGridDimensions(words: CrosswordWord[]): { rows: number; cols: number } {
  let maxRow = 0;
  let maxCol = 0;
  for (const w of words) {
    for (let k = 0; k < w.word.length; k++) {
      const r = w.direction === 'down' ? w.row + k : w.row;
      const c = w.direction === 'across' ? w.col + k : w.col;
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
  }
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

/** Builds a lookup of letter and optional clue-number for each (row, col). */
function buildCellMap(words: CrosswordWord[]): Map<string, { letter: string; clueNumber?: number }> {
  const map = new Map<string, { letter: string; clueNumber?: number }>();
  for (const w of words) {
    for (let k = 0; k < w.word.length; k++) {
      const r = w.direction === 'down' ? w.row + k : w.row;
      const c = w.direction === 'across' ? w.col + k : w.col;
      const cellKey = `${r},${c}`;
      const existing = map.get(cellKey);
      // Preserve clue number if already set
      map.set(cellKey, {
        letter: w.word[k],
        clueNumber: k === 0 ? w.clueNumber : existing?.clueNumber,
      });
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

function CrosswordWizard({ onSave, onCancel, initialData }: CrosswordWizardProps) {
  const { t } = useTranslation('questions');

  const [name, setName] = useState<string>(initialData?.name ?? '');
  const [mark, setMark] = useState<number>(initialData?.mark ?? 10);
  const [wordRows, setWordRows] = useState<WordRow[]>(() => {
    if (initialData?.crosswordWords && initialData.crosswordWords.length > 0) {
      // Deduplicate: one row per unique word+clue pair from crosswordWords
      const seen = new Set<string>();
      const rows: WordRow[] = [];
      for (const cw of initialData.crosswordWords) {
        const k = `${cw.word}|${cw.clue}`;
        if (!seen.has(k)) {
          seen.add(k);
          rows.push({ word: cw.word, clue: cw.clue });
        }
      }
      return rows;
    }
    return [
      { word: '', clue: '' },
      { word: '', clue: '' },
    ];
  });
  const [gridLayout, setGridLayout] = useState<'ltr' | 'rtl'>(
    initialData?.crosswordGridLayout ?? 'ltr'
  );
  const [hintMode, setHintMode] = useState<'none' | 'count' | 'percentage'>(
    initialData?.crosswordHintMode ?? 'none'
  );
  const [hintValue, setHintValue] = useState<number>(initialData?.crosswordHintValue ?? 0);
  const [placedWords, setPlacedWords] = useState<CrosswordWord[]>(
    initialData?.crosswordWords ?? []
  );
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [droppedWords, setDroppedWords] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // ─── Word row handlers ──────────────────────────────────────────────────────

  const handleAddWord = useCallback(() => {
    setWordRows((prev) => [...prev, { word: '', clue: '' }]);
  }, []);

  const handleRemoveWord = useCallback((index: number) => {
    setWordRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleWordChange = useCallback((index: number, field: 'word' | 'clue', value: string) => {
    setWordRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  // ─── Layout generation ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    const validInputs = wordRows.filter(
      (r) => r.word.trim() !== '' && r.clue.trim() !== ''
    );
    const result = generateCrosswordLayout(validInputs);

    if (result.length === 0) {
      setLayoutError(t('editor.crossword.error_no_layout'));
      setPlacedWords([]);
      setDroppedWords([]);
      return;
    }

    // Words the algorithm could not fit (compare by uppercased word string)
    const placedSet = new Set(result.map((w) => w.word.toUpperCase()));
    const dropped = validInputs
      .map((r) => r.word.toUpperCase())
      .filter((w) => !placedSet.has(w));

    setLayoutError(null);
    setPlacedWords(result);
    setDroppedWords(dropped);
  }, [wordRows, t]);

  // ─── Grid preview ───────────────────────────────────────────────────────────

  const { rows: gridRows, cols: gridCols } = useMemo(
    () => (placedWords.length > 0 ? computeGridDimensions(placedWords) : { rows: 0, cols: 0 }),
    [placedWords]
  );

  const cellMap = useMemo(() => buildCellMap(placedWords), [placedWords]);

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const errs: string[] = [];

    if (!name.trim()) errs.push(t('editor.crossword.error_no_name'));

    const validRows = wordRows.filter((r) => r.word.trim() !== '' && r.clue.trim() !== '');
    if (validRows.length < 2) errs.push(t('editor.crossword.error_min_words'));

    if (placedWords.length === 0) errs.push(t('editor.crossword.error_generate_first'));

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setErrors([]);
    onSave({
      type: 'crossword',
      name,
      mark,
      text: '',
      crosswordWords: placedWords,
      crosswordGridLayout: gridLayout,
      crosswordHintMode: hintMode,
      crosswordHintValue: hintValue,
    } as QuestionFormData);
  }, [name, mark, wordRows, placedWords, gridLayout, hintMode, hintValue, onSave, t]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Name + mark row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-foreground">
            {t('question_name')}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('question_name')}
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium mb-1 text-foreground">
            {t('mark')}
          </label>
          <Input
            type="number"
            min={0}
            value={mark}
            onChange={(e) => setMark(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Word / clue table */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-start py-2 font-medium text-muted-foreground w-2/5">
                {t('editor.crossword.word_label')}
              </th>
              <th className="text-start py-2 font-medium text-muted-foreground">
                {t('editor.crossword.clue_label')}
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {wordRows.map((row, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pe-2">
                  <Input
                    value={row.word}
                    onChange={(e) => handleWordChange(i, 'word', e.target.value)}
                    placeholder={t('editor.crossword.word_label')}
                  />
                </td>
                <td className="py-2 pe-2">
                  <Input
                    value={row.clue}
                    onChange={(e) => handleWordChange(i, 'clue', e.target.value)}
                    placeholder={t('editor.crossword.clue_label')}
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    aria-label={t('delete')}
                    onClick={() => handleRemoveWord(i)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={handleAddWord}
          className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus size={14} />
          {t('editor.crossword.add_word')}
        </button>
      </div>

      {/* Generate layout button */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('editor.crossword.generate_layout')}
        </button>
        {layoutError && (
          <p className="text-sm text-destructive">{layoutError}</p>
        )}
      </div>

      {/* Grid preview */}
      {placedWords.length > 0 && (
        <div
          className="overflow-auto"
          style={{ direction: gridLayout }}
        >
          <div
            className="inline-grid gap-px bg-border border border-border"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 2rem)`,
              gridTemplateRows: `repeat(${gridRows}, 2rem)`,
            }}
          >
            {Array.from({ length: gridRows }, (_, r) =>
              Array.from({ length: gridCols }, (_, c) => {
                const cellKey = `${r},${c}`;
                const cell = cellMap.get(cellKey);
                if (cell) {
                  return (
                    <div
                      key={cellKey}
                      className="relative bg-background flex items-center justify-center text-sm font-medium text-foreground"
                      style={{ width: '2rem', height: '2rem' }}
                    >
                      {cell.clueNumber !== undefined && cell.clueNumber > 0 && (
                        <span className="absolute top-0 start-0 text-[0.5rem] leading-none text-muted-foreground ps-0.5 pt-0.5">
                          {cell.clueNumber}
                        </span>
                      )}
                      <input
                        readOnly
                        value={cell.letter}
                        maxLength={1}
                        aria-label={`${t('editor.crossword.word_label')} ${cell.letter}`}
                        className="w-full h-full text-center bg-transparent border-none outline-none text-xs font-semibold cursor-default"
                        tabIndex={-1}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={cellKey}
                    className="bg-foreground/80"
                    style={{ width: '2rem', height: '2rem' }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Dropped words warning */}
      {droppedWords.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          {t('editor.crossword.warning_dropped_words', { words: droppedWords.join(', ') })}
        </div>
      )}

      {/* Settings row */}
      <div className="flex flex-wrap gap-6 items-end">
        {/* Grid direction */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            {t('editor.crossword.grid_direction')}
          </label>
          <div className="flex rounded-md border border-border overflow-hidden">
            {(['ltr', 'rtl'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setGridLayout(dir)}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors',
                  gridLayout === dir
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-accent'
                )}
              >
                {t(`editor.crossword.${dir}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Hint mode */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            {t('editor.crossword.hint_mode')}
          </label>
          <Select value={hintMode} onValueChange={(v) => setHintMode(v as 'none' | 'count' | 'percentage')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('editor.crossword.hint_mode_none')}</SelectItem>
              <SelectItem value="count">{t('editor.crossword.hint_mode_count')}</SelectItem>
              <SelectItem value="percentage">{t('editor.crossword.hint_mode_percentage')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hint value */}
        {hintMode !== 'none' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              {t('editor.crossword.hint_value')}
            </label>
            <Input
              type="number"
              min={0}
              max={hintMode === 'percentage' ? 100 : undefined}
              value={hintValue}
              onChange={(e) => setHintValue(Number(e.target.value))}
              className="w-24"
            />
          </div>
        )}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="text-sm text-destructive list-disc ps-5">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium border border-border',
            'text-foreground hover:bg-accent transition-colors'
          )}
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('done')}
        </button>
      </div>
    </div>
  );
}

export default memo(CrosswordWizard);
