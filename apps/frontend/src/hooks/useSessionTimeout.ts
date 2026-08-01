"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SessionTimeoutConfig {
  enabled: boolean;
  onExpire: () => void;
  warningAfterMs?: number;
  graceMs?: number;
}

export interface SessionTimeoutResult {
  showWarning: boolean;
  countdown: number;
  extendSession: () => void;
}

export function useSessionTimeout({ enabled, onExpire, warningAfterMs = 4 * 60 * 1000 + 40 * 1000, graceMs = 20_000 }: SessionTimeoutConfig): SessionTimeoutResult {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(graceMs / 1000);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(graceMs / 1000);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      logoutTimerRef.current = setTimeout(() => {
        onExpire();
        setShowWarning(false);
      }, graceMs);
    }, warningAfterMs);
  }, [clearTimers, onExpire, warningAfterMs, graceMs]);

  useEffect(() => {
    if (!enabled) return;
    const events = ["mousemove", "keydown", "click"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimers();
    };
  }, [enabled, resetTimer, clearTimers]);

  return { showWarning, countdown, extendSession: resetTimer };
}
