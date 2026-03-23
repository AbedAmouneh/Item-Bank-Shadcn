/**
 * QuizCanvas — Cubeforge canvas layer for Quiz Arcade visual effects.
 *
 * Renders behind the HTML question/answer overlay. Responsible for:
 *  - A shrinking timer bar (green → yellow → red)
 *  - Gold particle burst on a correct answer
 *  - Camera shake on a wrong answer
 *
 * All game logic lives in the parent (QuizArcade). This component only
 * reacts to boolean flags passed as props and resets them via callbacks.
 */

import { useEffect } from 'react';
import {
  Game,
  World,
  Entity,
  Transform,
  Sprite,
  ParticleEmitter,
  Camera2D,
  useCamera,
} from 'cubeforge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizCanvasProps {
  width: number;
  height: number;
  /** When true, renders a one-shot gold particle burst. Parent resets this after ~1 s. */
  showBurst: boolean;
  /** When true, camera shake fires. Parent resets this immediately after. */
  shouldShake: boolean;
  onShakeDone: () => void;
}

// ─── Camera-shake effect component ───────────────────────────────────────────
// Must live inside <Game> so that useCamera can access EngineContext.

function CameraEffects({
  shouldShake,
  onShakeDone,
}: {
  shouldShake: boolean;
  onShakeDone: () => void;
}) {
  const camera = useCamera();

  useEffect(() => {
    if (!shouldShake) return;
    camera.shake(8, 0.25);
    onShakeDone();
  }, [shouldShake, camera, onShakeDone]);

  return null;
}

// ─── Public component ────────────────────────────────────────────────────────

export default function QuizCanvas({
  width,
  height,
  showBurst,
  shouldShake,
  onShakeDone,
}: QuizCanvasProps) {
  return (
    <Game width={width} height={height} gravity={0}>
      <World background="#0f0f1a">
        <Camera2D />

        {/* Camera shake — useCamera() hook lives inside <Game> here */}
        <CameraEffects shouldShake={shouldShake} onShakeDone={onShakeDone} />

        {/* Gold particle burst on correct answer.
            Camera2D x=0, y=0 is the canvas centre. */}
        {showBurst && (
          <Entity id={`burst-${Date.now()}`}>
            <Transform x={0} y={0} />
            <ParticleEmitter
              burstCount={40}
              color="#fbbf24"
              speed={180}
              particleLife={0.9}
              spread={Math.PI * 2}
              gravity={120}
              particleSize={5}
              colorOverLife={['#fbbf24', '#f97316', '#ffffff']}
            />
          </Entity>
        )}
      </World>
    </Game>
  );
}
