import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@item-bank/ui';
import ScorePopup from '../../components/ScorePopup';
import StreakFire from '../../components/StreakFire';
import PixelCraftGrid from './PixelCraftGrid';
import PixelCraftPalette from './PixelCraftPalette';
import PixelCraftResults from './PixelCraftResults';
import {
  usePixelCraftLogic,
  type PixelCraftRevealOffset,
} from './hooks/usePixelCraftLogic';

interface PopupPosition {
  x: number;
  y: number;
}

/**
 * Pixel Craft game page.
 */
export default function PixelCraft() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTag = searchParams.get('tag_ids');
  const tag_ids = rawTag ? [Number(rawTag)] : undefined;
  const rawBank = searchParams.get('item_bank_id');
  const item_bank_id = rawBank ? Number(rawBank) : undefined;

  const {
    phase,
    isLoading,
    score,
    streak,
    currentCraftNumber,
    totalCrafts,
    currentPuzzle,
    placedFragments,
    paletteFragments,
    cellFeedback,
    errorCells,
    gridShakeKey,
    revealOffsets,
    craftedEmoji,
    craftedLabel,
    showScorePopup,
    summary,
    canStart,
    canSubmit,
    startGame,
    handleDrop,
    submitCraft,
    dismissScorePopup,
  } = usePixelCraftLogic({ tag_ids, item_bank_id });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const resultSlotRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const registerCellRef = useCallback(
    (cellIndex: number, node: HTMLDivElement | null) => {
      cellRefs.current[cellIndex] = node;
    },
    [],
  );

  const calculateRevealOffsets = useCallback((): Record<
    number,
    PixelCraftRevealOffset
  > => {
    if (!currentPuzzle || !resultSlotRef.current) {
      return {};
    }

    const resultRect = resultSlotRef.current.getBoundingClientRect();
    const resultCenterX = resultRect.left + resultRect.width / 2;
    const resultCenterY = resultRect.top + resultRect.height / 2;

    return currentPuzzle.solution.reduce<
      Record<number, PixelCraftRevealOffset>
    >((offsets, expectedFragmentId, cellIndex) => {
      const cellNode = cellRefs.current[cellIndex];
      if (!expectedFragmentId || !cellNode) {
        return offsets;
      }

      const cellRect = cellNode.getBoundingClientRect();
      offsets[cellIndex] = {
        x: Math.round(resultCenterX - (cellRect.left + cellRect.width / 2)),
        y: Math.round(resultCenterY - (cellRect.top + cellRect.height / 2)),
      };
      return offsets;
    }, {});
  }, [currentPuzzle]);

  const calculatePopupPosition = useCallback((): PopupPosition | null => {
    if (!panelRef.current || !resultSlotRef.current) {
      return null;
    }

    const panelRect = panelRef.current.getBoundingClientRect();
    const slotRect = resultSlotRef.current.getBoundingClientRect();

    return {
      x: Math.round(slotRect.left - panelRect.left + slotRect.width / 2 - 18),
      y: Math.round(slotRect.top - panelRect.top - 12),
    };
  }, []);

  const handleSubmitClick = useCallback(() => {
    setPopupPosition(calculatePopupPosition());
    submitCraft(calculateRevealOffsets());
  }, [calculatePopupPosition, calculateRevealOffsets, submitCraft]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleDrop(
        String(event.active.id),
        event.over ? String(event.over.id) : null,
      );
    },
    [handleDrop],
  );

  const handlePopupDone = useCallback(() => {
    dismissScorePopup();
    setPopupPosition(null);
  }, [dismissScorePopup]);

  const renderResultSlot = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Result Slot
      </div>
      <div
        ref={resultSlotRef}
        className="flex items-center justify-center"
        aria-label="Craft result slot"
        style={{
          width: 72,
          height: 72,
          borderRadius: 4,
          border: '2px solid #475569',
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          fontSize: craftedEmoji ? 28 : 24,
          fontWeight: 800,
        }}
      >
        {craftedEmoji ?? '☆'}
      </div>
      <div className="min-h-4 text-center text-xs text-slate-400">
        {craftedLabel ?? 'Awaiting craft'}
      </div>
    </div>
  );

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div
        ref={panelRef}
        className="relative w-full max-w-[700px] rounded-lg border-2 p-5"
        style={{
          backgroundColor: '#0f172a',
          borderColor: '#334155',
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">Pixel Craft</h2>
            <p className="text-sm text-slate-400">
              Drag the right fragments into the grid to forge the answer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200">
              Score: <span className="text-yellow-300">{score}</span>
            </div>
            <StreakFire streak={streak} visible={streak >= 3} />
            <Button
              variant="ghost"
              onClick={() => navigate('/games')}
              className="text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              Back to Games
            </Button>
          </div>
        </div>

        {phase === 'results' ? (
          <PixelCraftResults
            summary={summary}
            item_bank_id={item_bank_id}
            onPlayAgain={startGame}
            onBack={() => navigate('/games')}
          />
        ) : (
          <>
            <div
              className="mb-5 rounded-lg border-2 px-4 py-4 text-center"
              style={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
              }}
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {phase === 'idle'
                  ? 'Workshop Brief'
                  : `Craft ${currentCraftNumber} of ${totalCrafts}`}
              </div>
              <p className="text-lg font-bold leading-snug text-white">
                {currentPuzzle?.prompt ??
                  'Prepare the forge and begin crafting.'}
              </p>
            </div>

            {phase === 'idle' ? (
              <div className="flex flex-col items-center gap-5 py-8 text-center">
                {isLoading ? (
                  <div
                    className="h-10 w-10 rounded-full border-[3px] border-slate-700 border-t-slate-200 animate-spin"
                    role="status"
                    aria-label="Loading craft puzzles"
                  />
                ) : (
                  <>
                    <div className="text-6xl" aria-hidden="true">
                      🧱
                    </div>
                    <div className="max-w-md text-sm leading-6 text-slate-300">
                      Fit the right fragments into the right squares, then
                      submit the finished pattern to craft a reward item.
                    </div>
                    <Button
                      onClick={startGame}
                      disabled={!canStart}
                      className="bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Start Crafting
                    </Button>
                  </>
                )}
              </div>
            ) : currentPuzzle ? (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col justify-center gap-5 md:flex-row md:items-end">
                    <PixelCraftGrid
                      phase={phase}
                      solution={currentPuzzle.solution}
                      placedFragments={placedFragments}
                      cellFeedback={cellFeedback}
                      errorCells={errorCells}
                      gridShakeKey={gridShakeKey}
                      revealOffsets={revealOffsets}
                      registerCellRef={registerCellRef}
                    />

                    <div className="flex flex-col items-center gap-3 md:min-h-[252px] md:justify-end">
                      {canSubmit && phase === 'crafting' && (
                        <Button
                          onClick={handleSubmitClick}
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          Submit Craft
                        </Button>
                      )}
                      {phase === 'reveal' && (
                        <div className="rounded-md bg-slate-900/80 px-3 py-2 text-sm font-semibold text-emerald-300">
                          Crafting...
                        </div>
                      )}
                      {renderResultSlot()}
                    </div>
                  </div>

                  <PixelCraftPalette
                    phase={phase}
                    fragments={paletteFragments}
                  />
                </div>
              </DndContext>
            ) : (
              <div className="py-8 text-center text-sm text-slate-300">
                No craft puzzle is ready right now.
              </div>
            )}
          </>
        )}

        {showScorePopup && popupPosition && (
          <ScorePopup
            value={80}
            x={popupPosition.x}
            y={popupPosition.y}
            onDone={handlePopupDone}
          />
        )}
      </div>
    </div>
  );
}
