import { useEffect, useRef } from 'react';

import { logViolation } from '@item-bank/api';

interface UseAntiCheatOptions {
  /** Only attaches listeners when true. */
  enabled: boolean;
  attemptId: number;
  /**
   * Called with the violation type after each violation is logged.
   * Use this to show toasts or warnings in the parent component.
   */
  onViolation: (type: string) => void;
  /** Called when the fullscreen state is exited so the parent can show a modal. */
  onFullscreenExit: () => void;
}

/**
 * Attaches anti-cheat browser event listeners when enabled.
 *
 * Listeners attached:
 *   - document visibilitychange → logs 'tab_switch'
 *   - document copy             → logs 'copy_paste'
 *   - document fullscreenchange → logs 'fullscreen_exit' when exiting fullscreen
 *
 * All listeners are removed on unmount. Fullscreen is requested on mount
 * and exited on unmount if the document is still in fullscreen mode.
 */
export function useAntiCheat({
  enabled,
  attemptId,
  onViolation,
  onFullscreenExit,
}: UseAntiCheatOptions): void {
  // Store callbacks in refs to avoid re-running the effect on every render.
  const onViolationRef = useRef(onViolation);
  const onFullscreenExitRef = useRef(onFullscreenExit);
  onViolationRef.current = onViolation;
  onFullscreenExitRef.current = onFullscreenExit;

  useEffect(() => {
    if (!enabled) return;

    // Enter fullscreen on mount — errors are silenced (user may have denied permission).
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen denied — exam still runs, violation just won't be logged yet.
    });

    const handleVisibility = () => {
      if (document.hidden) {
        logViolation(attemptId, 'tab_switch').catch(() => undefined);
        onViolationRef.current('tab_switch');
      }
    };

    const handleCopy = () => {
      logViolation(attemptId, 'copy_paste').catch(() => undefined);
      onViolationRef.current('copy_paste');
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        logViolation(attemptId, 'fullscreen_exit').catch(() => undefined);
        onViolationRef.current('fullscreen_exit');
        onFullscreenExitRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('fullscreenchange', handleFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('fullscreenchange', handleFullscreen);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [enabled, attemptId]);
}
