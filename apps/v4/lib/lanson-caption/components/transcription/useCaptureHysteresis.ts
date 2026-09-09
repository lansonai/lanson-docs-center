import { useEffect, useRef, useState } from 'react';
import {
  CAPTURE_AUDIO_LEVEL_THRESHOLD,
  CAPTURE_SILENCE_DEBOUNCE_MS,
} from './audioCaptureConstants';

/**
 * Hysteresis for Listening ↔ Capturing UI state.
 *
 * Avoids jitter at the threshold boundary:
 * - Voice → Capturing: immediate (audioLevel >= threshold)
 * - Silence → Listening: debounce CAPTURE_SILENCE_DEBOUNCE_MS
 *
 * @param audioLevel - Raw mic level 0–1 (throttled upstream)
 * @returns isCapturing - true when we should show "Capturing"
 */
export function useCaptureHysteresis(audioLevel: number): boolean {
  const [isCapturing, setIsCapturing] = useState(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const aboveThreshold = audioLevel >= CAPTURE_AUDIO_LEVEL_THRESHOLD;

    if (aboveThreshold) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsCapturing(true);
    } else {
      // Below threshold: debounce before switching to Listening
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          setIsCapturing(false);
        }, CAPTURE_SILENCE_DEBOUNCE_MS);
      }
    }
  }, [audioLevel]);

  // Cleanup only on unmount. Do not reset the debounce timer on every audioLevel update.
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, []);

  return isCapturing;
}
