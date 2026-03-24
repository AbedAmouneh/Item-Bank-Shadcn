import { useCallback, type CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type {
  PixelCraftFragment,
  PixelCraftPhase,
  PixelCraftRevealOffset,
} from './hooks/usePixelCraftLogic';

interface PixelCraftGridProps {
  phase: PixelCraftPhase;
  solution: Array<string | null>;
  placedFragments: Array<PixelCraftFragment | null>;
  cellFeedback: Record<number, 'correct' | 'wrong'>;
  errorCells: number[];
  gridShakeKey: number;
  revealOffsets: Record<number, PixelCraftRevealOffset>;
  registerCellRef: (cellIndex: number, node: HTMLDivElement | null) => void;
}

interface PixelCraftCellProps {
  cellIndex: number;
  isRequired: boolean;
  placedFragment: PixelCraftFragment | null;
  feedback: 'correct' | 'wrong' | undefined;
  showError: boolean;
  phase: PixelCraftPhase;
  revealOffset: PixelCraftRevealOffset | undefined;
  registerCellRef: (cellIndex: number, node: HTMLDivElement | null) => void;
}

function PixelCraftCell({
  cellIndex,
  isRequired,
  placedFragment,
  feedback,
  showError,
  phase,
  revealOffset,
  registerCellRef,
}: PixelCraftCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `pixel-craft-cell-${cellIndex}`,
    disabled: !isRequired,
  });

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerCellRef(cellIndex, node);
    },
    [cellIndex, registerCellRef, setNodeRef],
  );

  // Non-required cells are visually inactive and not droppable.
  if (!isRequired) {
    return (
      <div
        ref={handleRef}
        style={{
          width: 72,
          height: 72,
          backgroundColor: '#0f172a',
          border: '2px solid #1e293b',
          borderRadius: 4,
          opacity: 0.35,
        }}
        className="relative flex items-center justify-center"
        aria-label={`Optional craft cell ${cellIndex + 1}`}
        aria-hidden="true"
      />
    );
  }

  const cellStyle: CSSProperties = {
    width: 72,
    height: 72,
    backgroundColor:
      feedback === 'correct'
        ? '#16a34a'
        : feedback === 'wrong' || showError
          ? '#dc2626'
          : isOver
            ? '#292524'
            : '#1e293b',
    border: `2px solid ${
      feedback === 'correct'
        ? '#22c55e'
        : feedback === 'wrong' || showError
          ? '#f87171'
          : isOver
            ? '#f59e0b'
            : '#d97706'
    }`,
    boxShadow:
      feedback === 'correct' || feedback === 'wrong' || showError
        ? 'none'
        : isOver
          ? '0 0 0 3px rgba(245, 158, 11, 0.5)'
          : '0 0 0 2px rgba(217, 119, 6, 0.25)',
    borderRadius: 4,
    transition:
      'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
  };

  const fragmentStyle: CSSProperties = {
    width: 60,
    minHeight: 60,
    backgroundColor: '#b45309',
    color: '#ffffff',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingInline: 6,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.1,
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.35)',
    transform:
      phase === 'reveal' && revealOffset
        ? `translate(${revealOffset.x}px, ${revealOffset.y}px) scale(0.82)`
        : undefined,
    opacity: phase === 'reveal' ? 0.2 : 1,
    transition:
      phase === 'reveal'
        ? 'transform 700ms ease, opacity 700ms ease'
        : 'transform 150ms ease, opacity 150ms ease',
  };

  return (
    <div
      ref={handleRef}
      style={cellStyle}
      className="relative flex items-center justify-center overflow-visible"
      aria-label={`Craft cell ${cellIndex + 1}`}
    >
      {placedFragment ? (
        <div style={fragmentStyle}>{placedFragment.text}</div>
      ) : (
        <span
          aria-hidden="true"
          className="select-none text-2xl font-black"
          style={{ color: 'rgba(217, 119, 6, 0.45)' }}
        >
          ?
        </span>
      )}
    </div>
  );
}

/**
 * Pixel Craft drop board — renders the 3×3 grid and a live placement counter.
 * Required cells glow amber so players know exactly where to drop fragments.
 * Non-required cells are visually dimmed and disabled as drop targets.
 */
export default function PixelCraftGrid({
  phase,
  solution,
  placedFragments,
  cellFeedback,
  errorCells,
  gridShakeKey,
  revealOffsets,
  registerCellRef,
}: PixelCraftGridProps) {
  const requiredCount = solution.filter((s) => s !== null).length;
  const placedCount = solution.filter(
    (s, i) => s !== null && placedFragments[i] !== null,
  ).length;

  const allPlaced = placedCount === requiredCount;

  const countLabel = allPlaced
    ? `✓ All ${requiredCount} placed`
    : `${placedCount} / ${requiredCount} fragments placed`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        key={gridShakeKey}
        className="grid grid-cols-3 gap-3"
        style={
          errorCells.length > 0
            ? ({ animation: 'heart-shake 400ms ease-in-out' } as CSSProperties)
            : undefined
        }
      >
        {solution.map((expectedFragmentId, cellIndex) => (
          <PixelCraftCell
            key={cellIndex}
            cellIndex={cellIndex}
            isRequired={expectedFragmentId !== null}
            placedFragment={placedFragments[cellIndex]}
            feedback={cellFeedback[cellIndex]}
            showError={errorCells.includes(cellIndex)}
            phase={phase}
            revealOffset={revealOffsets[cellIndex]}
            registerCellRef={registerCellRef}
          />
        ))}
      </div>

      <p
        className="text-xs font-semibold tracking-wide"
        style={{ color: allPlaced ? '#22c55e' : '#78716c' }}
        aria-live="polite"
      >
        {countLabel}
      </p>
    </div>
  );
}
