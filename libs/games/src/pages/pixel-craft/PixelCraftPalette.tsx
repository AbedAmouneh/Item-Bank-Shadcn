import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type {
  PixelCraftFragment,
  PixelCraftPhase,
} from './hooks/usePixelCraftLogic';

interface PixelCraftPaletteProps {
  phase: PixelCraftPhase;
  fragments: PixelCraftFragment[];
}

interface DraggableFragmentTileProps {
  fragment: PixelCraftFragment;
  disabled: boolean;
}

function DraggableFragmentTile({
  fragment,
  disabled,
}: DraggableFragmentTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: fragment.id,
      disabled,
    });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Drag fragment ${fragment.text}`}
      className="flex items-center justify-center text-center shadow-sm transition-opacity"
      style={{
        width: 72,
        minHeight: 72,
        paddingInline: 8,
        backgroundColor: '#1d4ed8',
        color: '#ffffff',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.1,
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Translate.toString(transform),
        cursor: disabled ? 'default' : 'grab',
      }}
    >
      {fragment.text}
    </button>
  );
}

/**
 * Pixel Craft fragment tray.
 */
export default function PixelCraftPalette({
  phase,
  fragments,
}: PixelCraftPaletteProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'pixel-craft-palette',
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-md border-2 p-3"
      style={{
        borderColor: isOver ? '#60a5fa' : '#334155',
        backgroundColor: '#0b1220',
        transition: 'border-color 160ms ease, background-color 160ms ease',
      }}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Fragment Palette
      </div>

      <div className="flex flex-wrap gap-3">
        {fragments.map((fragment) => (
          <DraggableFragmentTile
            key={fragment.id}
            fragment={fragment}
            disabled={phase !== 'crafting'}
          />
        ))}
      </div>
    </div>
  );
}
