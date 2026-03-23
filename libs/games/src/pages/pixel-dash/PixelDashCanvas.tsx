/**
 * PixelDashCanvas — Cubeforge ECS visual layer for Pixel Dash.
 *
 * Renders all visual entities:
 *  - 6 lane stripe entities (3 lanes × 2 copies for seamless vertical scroll)
 *  - 1 player sprite (pink/orange rabbit, lerps between lanes)
 *  - 1 gate sprite (indigo bar, falls from top — remounted per gateKey)
 *  - N obstacle sprites (rocks / barrels — spawned by React, fall via Script)
 *  - N coin sprites (gold squares — same fall Script)
 *
 * All coordinate math uses the Camera2D system:
 *   y = 0 at canvas centre, y+ = down.
 *   Conversion: camY = cssY − mCamHalfH,  camX = cssX − mCamHalfW.
 *
 * Module-level ScriptUpdateFn definitions are defined OUTSIDE the component so
 * Cubeforge never re-creates or re-attaches them across React renders. This is
 * the same pattern used in AnswerRunner.
 *
 * Bridge pattern: the module-level `bridge` object (from PixelDashBridge.ts) is
 * the live shared state between this canvas (ECS Scripts running at 60 fps) and
 * usePixelDashLogic (React ticking at 50ms).
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
import { bridge, entityRegistry } from './PixelDashBridge';
import { PLAYER_ROW_CSS } from './hooks/usePixelDashLogic';
import type { ActiveEntity } from './hooks/usePixelDashLogic';

// ─── Module-level geometry ─────────────────────────────────────────────────────
// Updated by syncGeometry() when props change; read by every Script function.

let mCanvasH: number = 480;
let mCamHalfW: number = 350;
let mCamHalfH: number = 240;

function syncGeometry(w: number, h: number): void {
  mCanvasH = h;
  mCamHalfW = w / 2;
  mCamHalfH = h / 2;
}

/** Convert a CSS x (from left) to Camera2D x. */
function toCamX(cssX: number): number { return cssX - mCamHalfW; }
/** Convert a CSS y (from top) to Camera2D y. */
function toCamY(cssY: number): number { return cssY - mCamHalfH; }

// ─── Physics constants ────────────────────────────────────────────────────────

/** Lerp speed of the player sprite in px/s. At 60fps this is ~14px per frame. */
const LERP_RATE = 840;

// ─── Script update functions (module-level — never recreated across renders) ───

/**
 * Lane stripe scroll + seamless wrap.
 * Two copies per lane ensure there is no visual gap: when copy A's top edge
 * exits the canvas bottom, it teleports back above copy B.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripeScript: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  if (bridge.pausedM) return;
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  t.y += bridge.scrollSpeedM * dt;
  // Wrap: once the TOP edge (t.y − height/2) exits the canvas BOTTOM (mCamHalfH),
  // teleport up by 2 × canvas height to sit above copy B.
  // Simplified: top_edge = t.y − mCamHalfH;  wrap when top_edge > mCamHalfH → t.y > 2*mCamHalfH
  if (t.y > mCamHalfH * 2) t.y -= mCanvasH * 2;
};

/**
 * Player lerp — smoothly tracks bridge.playerTargetX at LERP_RATE px/s.
 * Writes bridge.playerCssX so the React collision tick can read the current x.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerScript: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  if (bridge.pausedM) return;
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  const targetCamX = bridge.playerTargetX - mCamHalfW;
  const delta = targetCamX - t.x;
  t.x =
    Math.abs(delta) < 1
      ? targetCamX
      : t.x + Math.sign(delta) * Math.min(LERP_RATE * dt, Math.abs(delta));
  bridge.playerCssX = t.x + mCamHalfW;
};

/**
 * Gate fall — visual-only; drops at scrollSpeedM px/s.
 * Trigger detection is handled by the React tick using a wall-clock timestamp
 * (bridge.gateSpawnedAt), so this script only needs to animate the bar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gateScript: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  if (bridge.pausedM) return;
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  t.y += bridge.scrollSpeedM * dt;
};

/**
 * Generic fall script for obstacles and coins.
 * The entity's Cubeforge id is the same string as its entityRegistry key,
 * so the Script can update the registry's cssY for React collision detection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fallScript: ScriptUpdateFn = (id: EntityId, world: ECSWorld, _input: any, dt: number) => {
  if (bridge.pausedM) return;
  const t = world.getComponent<TransformComponent>(id, 'Transform');
  if (!t) return;
  t.y += bridge.scrollSpeedM * dt;
  // Update the shared registry so React's 50ms collision tick reads the latest y.
  const entry = entityRegistry.get(id as string);
  if (entry) entry.cssY = t.y + mCamHalfH;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PixelDashCanvasProps {
  width: number;
  height: number;
  /** Bumped on each startGame call — remounts the entire canvas, resetting all transforms. */
  gameKey: number;
  /** Bumped each time a new gate is needed — remounts the gate entity. */
  gateKey: number;
  activeObstacles: ActiveEntity[];
  activeCoins: ActiveEntity[];
  /** When true the player sprite renders orange (#FB923C) instead of pink (#F9A8D4). */
  streakFire: boolean;
}

export default function PixelDashCanvas({
  width,
  height,
  gameKey,
  gateKey,
  activeObstacles,
  activeCoins,
  streakFire,
}: PixelDashCanvasProps) {
  // Sync module-level geometry constants whenever canvas dimensions change.
  useEffect(() => {
    syncGeometry(width, height);
  }, [width, height]);

  // Lane x positions: evenly spaced at 1/4, 1/2, 3/4 of canvas width.
  const laneXArr = useMemo<[number, number, number]>(() => {
    const s = Math.round(width / 4);
    return [s, s * 2, s * 3];
  }, [width]);

  if (gameKey === 0) return null;

  // Camera y for the player sprite row.
  const playerRowCamY = toCamY(PLAYER_ROW_CSS);

  // Jungle palette: amber explorer normally, fiery orange during streak.
  const playerColor = streakFire ? '#ff8c00' : '#f8b84a';

  return (
    <Game key={gameKey} width={width} height={height} gravity={0}>
      {/*
       * JUNGLE palette — looks down at a jungle floor from above.
       *   background    : dark jungle earth  (#1a3a0a)
       *   lane dividers : dense foliage edge (#0d2204, 5 px wide)
       *   player        : amber explorer     (#f8b84a) / fire orange on streak (#ff8c00)
       *   gate          : wooden bamboo beam (#6b3a08, 10 px tall)
       *   obstacles     : bark-brown log     (#5a3210) / mossy boulder (#6a5a4a)
       *   coins         : gold artifact      (#ffd700, 14 px)
       */}
      <World background="#1a3a0a">
        <Camera2D />

        {/* ── Lane stripes — 3 lanes × 2 copies for seamless vertical scroll ── */}

        {/* Copy A: centre starts at camera y=0 (CSS y = height/2, i.e., canvas centre) */}
        {laneXArr.map((cssX, i) => (
          <Entity key={`stripeA-${i}`} id={`stripeA-${i}`}>
            <Transform x={toCamX(cssX)} y={0} />
            <Sprite width={5} height={height} color="#0d2204" />
            <Script update={stripeScript} />
          </Entity>
        ))}

        {/* Copy B: one canvas height above copy A so wrapping is seamless */}
        {laneXArr.map((cssX, i) => (
          <Entity key={`stripeB-${i}`} id={`stripeB-${i}`}>
            <Transform x={toCamX(cssX)} y={-height} />
            <Sprite width={5} height={height} color="#0d2204" />
            <Script update={stripeScript} />
          </Entity>
        ))}

        {/* ── Player — 28×28 rounded-rect explorer sprite ───────────────────── */}
        <Entity key="player" id="pixel-dash-player">
          <Transform x={toCamX(laneXArr[1])} y={playerRowCamY} />
          <Sprite
            width={28}
            height={28}
            color={playerColor}
            shape="roundedRect"
            borderRadius={6}
          />
          <Script update={playerScript} />
        </Entity>

        {/* ── Gate — full-width wooden bamboo beam, remounted via gateKey ───── */}
        <Entity key={`gate-${gateKey}`} id="pixel-dash-gate">
          {/* Initial position: top edge just above canvas (CSS y = -4) */}
          <Transform x={0} y={toCamY(-4)} />
          <Sprite width={width} height={10} color="#6b3a08" />
          <Script update={gateScript} />
        </Entity>

        {/* ── Obstacles — log or boulder sprites ───────────────────────────── */}
        {activeObstacles.map((ent) => (
          <Entity key={ent.id} id={ent.id}>
            {/* Start above the canvas so they fall in from the top */}
            <Transform x={toCamX(laneXArr[ent.lane])} y={toCamY(-30)} />
            <Sprite
              width={26}
              height={26}
              color={ent.variant === 'barrel' ? '#5a3210' : '#6a5a4a'}
              shape="roundedRect"
              borderRadius={5}
            />
            <Script update={fallScript} />
          </Entity>
        ))}

        {/* ── Coins — gold jungle artifact squares ──────────────────────────── */}
        {activeCoins.map((ent) => (
          <Entity key={ent.id} id={ent.id}>
            <Transform x={toCamX(laneXArr[ent.lane])} y={toCamY(-30)} />
            <Sprite width={14} height={14} color="#ffd700" />
            <Script update={fallScript} />
          </Entity>
        ))}
      </World>
    </Game>
  );
}
