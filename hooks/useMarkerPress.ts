"use client";

import { useCallback, useRef } from "react";

import { useTimelineStore } from "@/store/useTimelineStore";
import { seekToMarkerCue } from "@/lib/wavesurfer";

const HOLD_MS = 500;

/**
 * Tap / click → seek to cue with lead-in. Hold ~500ms → open edit modal.
 */
export function useMarkerPress(markerId: string, markerTime: number) {
  const openMarkerModal = useTimelineStore((s) => s.openMarkerModal);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold = useRef(false);
  const cancelled = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current != null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      didHold.current = false;
      cancelled.current = false;
      clearHoldTimer();
      event.currentTarget.setPointerCapture(event.pointerId);
      holdTimer.current = setTimeout(() => {
        didHold.current = true;
        openMarkerModal(markerId);
      }, HOLD_MS);
    },
    [markerId, openMarkerModal, clearHoldTimer],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      clearHoldTimer();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!didHold.current && !cancelled.current) {
        seekToMarkerCue(markerTime);
      }
    },
    [markerTime, clearHoldTimer],
  );

  const onPointerLeave = useCallback(() => {
    clearHoldTimer();
    if (!didHold.current) cancelled.current = true;
  }, [clearHoldTimer]);

  const onPointerCancel = onPointerLeave;

  /** Keyboard: Enter/Space → seek only (no modal). */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      seekToMarkerCue(markerTime);
    },
    [markerTime],
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
  };
}
