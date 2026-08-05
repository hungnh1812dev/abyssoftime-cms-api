"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { HealthLoading } from "@/components/layouts/main/HealthLoading";

const POLL_INTERVAL = 10 * 1000;
const POLL_TIMEOUT = 5 * 1000;

export default function UnhealthyPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    function poll() {
      fetch("/api/health", { signal: AbortSignal.timeout(POLL_TIMEOUT), cache: "no-store" })
        .then((res) => res.json())
        .then((data: { healthy: boolean }) => {
          if (!mountedRef.current) return;

          if (data.healthy) {
            router.refresh();
          } else {
            timerRef.current = setTimeout(poll, POLL_INTERVAL);
          }
        })
        .catch(() => {
          if (!mountedRef.current) return;
          timerRef.current = setTimeout(poll, POLL_INTERVAL);
        });
    }

    poll();

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [router]);

  return <HealthLoading />;
}
