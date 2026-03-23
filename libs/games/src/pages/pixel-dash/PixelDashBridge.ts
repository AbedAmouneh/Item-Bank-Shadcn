/**
 * PixelDashBridge — shared mutable state between the Cubeforge ECS layer and
 * the React game-logic layer.
 *
 * Why a plain mutable object instead of React state?
 * Cubeforge Scripts run inside requestAnimationFrame at 60 fps. If Scripts
 * called React state setters they would flood the render queue and obliterate
 * performance. Instead, Scripts write to properties of this plain object each
 * frame, and the React tick (setInterval at 50ms) reads from it — like a
 * one-way data bus running at two different rates.
 *
 * Both PixelDashCanvas (ECS Scripts) and usePixelDashLogic (React hook) import
 * the same exported reference, so they share one instance automatically.
 *
 * Gate trigger design:
 * Rather than having the ECS gateScript write gateCssY every frame and relying
 * on the React tick to read it (which can break under Vite's ES-module caching
 * between HMR updates), the trigger uses a wall-clock timestamp approach:
 *   - React writes `gateSpawnedAt = Date.now()` when a new gate is launched.
 *   - The React tick computes `computedGateCssY = -4 + scrollSpeedM * elapsed`
 *     and triggers quiz_gate when it reaches PLAYER_ROW_CSS.
 * This is purely React → React and requires no ECS → React communication.
 */

/** Scalar bridge — React writes here; ECS Scripts read; React tick reads. */
export const bridge = {
  /** CSS x that the player sprite is lerping toward. Written by React. */
  playerTargetX: 350,
  /** CSS x of the player sprite right now. Written by the player Script. */
  playerCssX: 350,
  /** How fast all entities fall, in CSS px/s. Written by React. */
  scrollSpeedM: 140,
  /** When true, all entity Scripts skip their update. Written by React. */
  pausedM: false,
  /**
   * Wall-clock timestamp (Date.now()) when the current gate entity was spawned.
   * 0 means no gate is active. Written by React; read by the React tick.
   * The tick computes: computedGateCssY = -4 + scrollSpeedM * elapsedSeconds.
   */
  gateSpawnedAt: 0,
};

/** Per-entity registry — Scripts write cssY each frame; React tick reads for collision. */
export const entityRegistry = new Map<
  string,
  { type: 'obstacle' | 'coin'; lane: 0 | 1 | 2; cssY: number }
>();
