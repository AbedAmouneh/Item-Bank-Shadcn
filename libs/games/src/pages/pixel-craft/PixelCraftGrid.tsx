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
  });

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerCellRef(cellIndex, node);
    },
    [cellIndex, registerCellRef, setNodeRef],
  );

  const cellStyle: CSSProperties = {
    width: 72,
    height: 72,
    backgroundColor:
      feedback === 'correct'
        ? '#16a34a'
        : feedback === 'wrong' || showError
          ? '#dc2626'
          : isOver
            ? '#334155'
            : '#1e293b',
    border: `2px solid ${
      feedback === 'correct'
        ? '#22c55e'
        : feedback === 'wrong' || showError
          ? '#f87171'
          : '#475569'
    }`,
    borderRadius: 4,
    transition:
      'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
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
      aria-label={
        isRequired
          ? `Craft cell ${cellIndex + 1}`
          : `Optional craft cell ${cellIndex + 1}`
      }
    >
      {placedFragment ? (
        <div style={fragmentStyle}>{placedFragment.text}</div>
      ) : (
        <span
          aria-hidden="true"
          className="select-none text-2xl font-black"
          style={{ color: 'rgba(255, 255, 255, 0.18)' }}
        >
          ?
        </span>
      )}
    </div>
  );
}

/**
 * Pixel Craft drop board.
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
  return (
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
  );
}
