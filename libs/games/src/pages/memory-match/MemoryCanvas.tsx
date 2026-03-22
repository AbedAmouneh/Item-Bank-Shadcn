/**
 * MemoryCanvas — Cubeforge background canvas for Memory Match.
 *
 * Renders a dark starfield behind the card grid. Emits a green particle burst
 * when a matching pair is found. The parent component passes `showBurst` as a
 * boolean flag and resets it after ~1 s so each match fires a fresh burst.
 */

import { Game, World, Entity, Transform, ParticleEmitter, Camera2D } from 'cubeforge';

interface MemoryCanvasProps {
  width: number;
  height: number;
  /** When true, fires a one-shot green particle burst. Parent resets after ~1 s. */
  showBurst: boolean;
}

export default function MemoryCanvas({ width, height, showBurst }: MemoryCanvasProps) {
  return (
    <Game width={width} height={height} gravity={0}>
      <World background="#0a0a1a">
        <Camera2D />
        {showBurst && (
          <Entity id={`match-burst-${Date.now()}`}>
            <Transform x={0} y={0} />
            <ParticleEmitter
              burstCount={30}
              color="#22c55e"
              speed={140}
              particleLife={0.8}
              spread={Math.PI * 2}
              particleSize={4}
              colorOverLife={['#22c55e', '#86efac', '#ffffff']}
            />
          </Entity>
        )}
      </World>
    </Game>
  );
}
