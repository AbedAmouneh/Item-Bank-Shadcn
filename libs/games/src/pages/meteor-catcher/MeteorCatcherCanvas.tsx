/**
 * MeteorCatcherCanvas — Cubeforge ECS visual layer for Meteor Catcher.
 *
 * Renders the parallax star field only. Ship, meteors, boss, and all interactive
 * elements live in the HTML overlay layer above this component.
 *
 * Star field: 60 Sprite entities (1×1 px, white) in two depth layers.
 *   Layer A (stars 0–29): slow scroll at 20 px/s → appear far away.
 *   Layer B (stars 30–59): fast scroll at 45 px/s → appear close.
 *
 * Module-level Script functions are defined OUTSIDE the component so Cubeforge
 * never re-creates or re-attaches them across React renders (same pattern as
 * PixelDashCanvas).
 *
 * Camera2D convention: y=0 at canvas centre, y+ = down.
 *   toCamY(cssY) = cssY − height/2
 */

import { useEffect, useMemo } from 'react';
import {
  Game,
  World,
  Entity,
  Transform,
  Sprite,
  Script,
  Camera2D,
} from 'cubeforge';
import type { EntityId, ECSWorld, TransformComponent, ScriptUpdateFn } from 'cubeforge';

// ─── Module-level geometry ─────────────────────────────────────────────────────
// Updated by the component when props change; read by every Script.

let mCamHalfH = 240;

function syncGeometry(h: number): void {
  mCamHalfH = h / 2;
}

// ─── Scroll speed constants ────────────────────────────────────────────────────

const SPEED_A = 20; // px/s — slow / far layer
const SPEED_B = 45; // px/s — fast / near layer

// ─── Script update functions (module-level — never recreated) ──────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const starScriptA: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  t.y += SPEED_A * dt;
  // Wrap: when star exits canvas bottom, teleport it to the top.
  if (t.y > mCamHalfH + 1) t.y = -mCamHalfH;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const starScriptB: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  t.y += SPEED_B * dt;
  if (t.y > mCamHalfH + 1) t.y = -mCamHalfH;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MeteorCatcherCanvasProps {
  width: number;
  height: number;
  /** Bumped on each startGame call — remounts the Cubeforge tree, randomising star positions. */
  gameKey: number;
}

export default function MeteorCatcherCanvas({ width, height, gameKey }: MeteorCatcherCanvasProps) {
  useEffect(() => { syncGeometry(height); }, [height]);

  // Generate 60 random initial positions; recalculated on each new game.
  const starPositions = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    return Array.from({ length: 60 }, (_, i) => ({
      x: (Math.random() * 2 - 1) * hw,
      y: (Math.random() * 2 - 1) * hh,
      layer: i < 30 ? 'A' : 'B', // first 30 → slow layer, rest → fast layer
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, width, height]);

  if (gameKey === 0) return null;

  return (
    <Game key={gameKey} width={width} height={height} gravity={0}>
      <World background="#060618">
        <Camera2D />

        {/* ── Star field: 30 slow (far) + 30 fast (near) ──────────────── */}
        {starPositions.map((star, i) => (
          <Entity key={`star-${i}`} id={`star-${i}`}>
            <Transform x={star.x} y={star.y} />
            <Sprite width={1} height={1} color="#ffffff" />
            <Script update={star.layer === 'A' ? starScriptA : starScriptB} />
          </Entity>
        ))}
      </World>
    </Game>
  );
}
