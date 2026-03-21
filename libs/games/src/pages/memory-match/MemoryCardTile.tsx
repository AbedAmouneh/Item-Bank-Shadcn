/**
 * MemoryCardTile — a single card in the Memory Match grid.
 *
 * Uses CSS 3-D perspective and a rotateY(180deg) transition to produce a
 * realistic card-flip animation. The card has two DOM faces stacked inside
 * a preserve-3d container:
 *   - Face-down face: shows "?" and is visible at 0°
 *   - Face-up face:   shows the card content, starts at 180° (facing backward),
 *                     and comes into view once the container flips to 180°.
 *
 * `backface-visibility: hidden` hides each face when it points away from the
 * viewer, so only one face is visible at any time.
 */

import { cn } from '@item-bank/ui';
import type { MemoryCard } from '../../domain/types';

interface MemoryCardTileProps {
  card: MemoryCard;
  onClick: () => void;
}

export default function MemoryCardTile({ card, onClick }: MemoryCardTileProps) {
  const faceUp = card.isFlipped || card.isMatched;

  return (
    <button
      onClick={onClick}
      disabled={card.isFlipped || card.isMatched}
      aria-label={faceUp ? card.content : 'Hidden card'}
      className="relative h-20 rounded-xl cursor-pointer disabled:cursor-default disabled:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ perspective: '600px' }}
    >
      {/* Inner wrapper rotates on flip — preserve-3d keeps child faces in 3-D space */}
      <div
        className="relative w-full h-full rounded-xl"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 400ms ease',
          transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Face-down — "?" shown while card is unrevealed */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl',
            'bg-card border border-border text-2xl font-bold text-muted-foreground',
            'hover:border-primary/50',
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          ?
        </div>

        {/* Face-up — content revealed after flip */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl p-2 overflow-hidden',
            'text-xs font-medium text-center',
            card.isMatched
              ? 'bg-green-600/20 border-2 border-green-500 text-green-300'
              : 'bg-primary/90 border border-primary text-primary-foreground',
          )}
          style={{
            backfaceVisibility: 'hidden',
            // This face starts facing backward; flipping the parent brings it forward.
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="break-words leading-tight line-clamp-4">{card.content}</span>
        </div>
      </div>
    </button>
  );
}
