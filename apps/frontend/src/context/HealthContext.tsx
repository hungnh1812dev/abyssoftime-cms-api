"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

import { HealthLoading } from "@/components/layouts/main/HealthLoading";

const PING_INTERVAL_HEALTHY = 14 * 60 * 1000;
const PING_INTERVAL_UNHEALTHY = 10 * 1000;
const PING_TIMEOUT = 5 * 1000;

interface HealthContextValue {
  isApiHealthy: boolean;
}

const HealthContext = createContext<HealthContextValue | null>(null);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pingRef = useRef<() => void>(() => {});

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function pingHealth() {
    clearTimer();

    const cmsHealthUrl = process.env.CMS_HEALTH_URL ?? "http://localhost:5000/health";

    fetch(cmsHealthUrl, { signal: AbortSignal.timeout(PING_TIMEOUT) })
      .then((response) => {
        if (!mountedRef.current) return;

        if (response.ok) {
          setIsApiHealthy(true);
          timerRef.current = setTimeout(() => pingRef.current(), PING_INTERVAL_HEALTHY);
        } else {
          setIsApiHealthy(false);
          timerRef.current = setTimeout(() => pingRef.current(), PING_INTERVAL_UNHEALTHY);
        }
      })
      .catch(() => {
        if (!mountedRef.current) return;

        setIsApiHealthy(false);
        timerRef.current = setTimeout(() => pingRef.current(), PING_INTERVAL_UNHEALTHY);
      });
  }

  useEffect(() => {
    pingRef.current = pingHealth;
  });

  useEffect(() => {
    mountedRef.current = true;
    pingRef.current();

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimer();
      } else {
        pingRef.current();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <HealthContext.Provider value={{ isApiHealthy }}>{isApiHealthy ? children : <HealthLoading />}</HealthContext.Provider>;
}

export function useHealthStatus(): HealthContextValue {
  const context = useContext(HealthContext);
  if (!context) throw new Error("useHealthStatus must be used inside HealthProvider");
  return context;
}
