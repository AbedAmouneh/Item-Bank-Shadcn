/**
 * StackAttackCanvas — the game frame contents.
 *
 * Renders purely visually: tower blocks, the live swinging block, the in-flight
 * dropping block (CSS transition or crack keyframe), HUD strip, and particle
 * effects. Contains no game logic — all state comes from useStackLogic via props.
 *
 * Layer stack (bottom → top):
 *   0  dark jungle earth background (#1a3a0a) — CSS on the parent div
 *   5  jungle undergrowth texture overlay
 *   10 tower + blocks + HUD (this component)
 *   30 CoinBurst / ScorePopup (rendered by StackAttack.tsx at z-30)
 */

import type { RefObject } from 'react';
import StreakFire from '../../components/StreakFire';
import LivesBar from '../../components/LivesBar';
import type { StackBlock, DroppingBlock, StackPhase } from './hooks/useStackLogic';
import { BLOCK_W, BLOCK_H, GOLDEN_COLOR } from './hooks/useStackLogic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StackAttackCanvasProps {
  phase: StackPhase;
  tower: StackBlock[];
  droppingBlock: DroppingBlock | null;
  /** Ref handed to the swinging block div — rAF writes insetInlineStart directly. */
  swingBlockRef: RefObject<HTMLDivElement | null>;
  /** CSS y (from canvas top) where the tower top should always sit. */
  towerTargetTop: number;
  /** CSS y (from canvas top) where the swinging block's top edge sits. */
  swingY: number;
  /**
   * px the tower container is shifted up (translateY) so the top block remains
   * at towerTargetTop as the tower grows.
   */
  cameraOffsetY: number;
  score: number;
  lives: number;
  streak: number;
  streakVisible: boolean;
  canvasW: number;
  canvasH: number;
}

// ─── Block style helpers ───────────────────────────────────────────────────────

function blockBackground(color: string, isGolden: boolean): string {
  if (isGolden) {
    return `linear-gradient(135deg, #FFE066 0%, ${GOLDEN_COLOR} 45%, #B8860B 100%)`;
  }
  // Earthy bevel: slightly lighter top → mid → darker shadow bottom.
  return `linear-gradient(180deg, ${color}ff 0%, ${color}cc 55%, ${color}77 100%)`;
}

function blockBoxShadow(isGolden: boolean): string {
  if (isGolden) {
    return '0 0 14px rgba(255,215,0,0.7), 0 2px 5px rgba(0,0,0,0.5)';
  }
  return '0 3px 7px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StackAttackCanvas({
  phase,
  tower,
  droppingBlock,
  swingBlockRef,
  towerTargetTop,
  swingY,
  cameraOffsetY,
  score,
  lives,
  streak,
  streakVisible,
  canvasW,
  canvasH,
}: StackAttackCanvasProps) {
  const centreX = Math.round(canvasW / 2);
  const isActive = phase === 'swinging' || phase === 'answer_reveal';

  return (
    <div className="absolute inset-0 overflow-hidden">

      {/* ── Jungle undergrowth texture (organic dots, leaf shadows) ───────── */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(45,96,21,0.35) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {/* ── Jungle vines — decorative corner detail ──────────────────────── */}
      {isActive && (
        <div
          className="absolute select-none pointer-events-none text-3xl leading-none"
          style={{ insetInlineEnd: 10, bottom: 10, opacity: 0.40 }}
          aria-hidden="true"
        >
          🌿
        </div>
      )}

      {/* ── HUD strip (score · streak badge · lives) ─────────────────────── */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 pb-2 text-white pointer-events-none bg-black/40 border-b border-amber-900/30">
          <span
            className="tabular-nums text-[#ffd700] text-sm leading-none"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {String(score).padStart(6, '0')}
          </span>
          <StreakFire streak={streak} visible={streakVisible} />
          <LivesBar lives={lives} maxLives={3} />
        </div>
      )}

      {/* ── Landing zone indicator — dashed line at towerTargetTop ──────── */}
      {isActive && (
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: towerTargetTop + BLOCK_H,
            borderTop: '1px dashed rgba(255,255,255,0.12)',
          }}
        />
      )}

      {/* ── Tower container — translateY for camera pan ────────────────── */}
      {isActive && (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            transform: `translateY(-${cameraOffsetY}px)`,
            transition: cameraOffsetY > 0 ? 'transform 400ms ease-out' : 'none',
            // Height just needs to be tall enough to contain all blocks.
            height: canvasH + tower.length * BLOCK_H,
          }}
        >
          {tower.map((block, i) => (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                bottom: i * BLOCK_H,
                insetInlineStart: centreX - BLOCK_W / 2,
                width: BLOCK_W,
                height: BLOCK_H,
                background: blockBackground(block.color, block.isGolden),
                boxShadow: blockBoxShadow(block.isGolden),
                border: block.isGolden
                  ? '1px solid rgba(251,191,36,0.6)'
                  : '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {/* Golden crown indicator */}
              {block.isGolden && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] select-none"
                  aria-hidden="true"
                >
                  👑
                </span>
              )}
            </div>
          ))}

          {/* Base platform — stone/ruins altar at the very bottom */}
          <div
            className="absolute bottom-0 rounded-sm"
            style={{
              insetInlineStart: centreX - BLOCK_W / 2 - 16,
              width: BLOCK_W + 32,
              height: 10,
              background: 'linear-gradient(180deg, #7A6040 0%, #5A3E1E 55%, #3A2208 100%)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,160,80,0.3)',
              border: '1px solid #6B4A20',
            }}
          />
        </div>
      )}

      {/* ── Swinging block — x written via DOM ref by rAF loop ─────────── */}
      {phase === 'swinging' && (
        <div
          ref={swingBlockRef}
          className="absolute rounded-sm"
          aria-hidden="true"
          style={{
            top: swingY,
            // insetInlineStart is set each rAF frame; initial value centres the block.
            insetInlineStart: Math.round(canvasW / 2 - BLOCK_W / 2),
            width: BLOCK_W,
            height: BLOCK_H,
            background: 'linear-gradient(135deg, #D4A045 0%, #A87830 55%, #7A5520 100%)',
            boxShadow: '0 0 16px rgba(212,160,69,0.55), 0 2px 6px rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        />
      )}

      {/* ── Dropping block — CSS transition (falling) or keyframe (cracking) */}
      {droppingBlock && (
        <div
          className={
            droppingBlock.mode === 'cracking'
              ? '[animation:block-crack_550ms_ease-out_forwards]'
              : undefined
          }
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: droppingBlock.mode === 'falling' ? towerTargetTop : swingY,
            insetInlineStart: droppingBlock.leftEdge,
            width: BLOCK_W,
            height: BLOCK_H,
            borderRadius: 2,
            background: blockBackground(droppingBlock.color, droppingBlock.isGolden),
            boxShadow: blockBoxShadow(droppingBlock.isGolden),
            border: droppingBlock.isGolden
              ? '1px solid rgba(251,191,36,0.6)'
              : '1px solid rgba(255,255,255,0.12)',
            // Falling: shift the block up to swingY via transform, then transition to 0.
            transform:
              droppingBlock.mode === 'falling' && !droppingBlock.dropped
                ? `translateY(${swingY - towerTargetTop}px)`
                : 'translateY(0)',
            transition:
              droppingBlock.mode === 'falling' && droppingBlock.dropped
                ? `transform ${DROP_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
                : 'none',
          }}
        />
      )}
    </div>
  );
}

// Re-export constant so StackAttack.tsx can use it without a deep import.
const DROP_DURATION_MS = 350;
export { DROP_DURATION_MS };
