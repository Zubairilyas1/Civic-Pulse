import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, RefreshCw } from "lucide-react";
import { civicPulseApi } from "../api/client";
import type { ComplaintStats } from "../api/types";
import { Alert, LoadingPanel } from "../components/Feedback";
import { StatsCards } from "../components/StatsCards";

export function StatsPage() {
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    void civicPulseApi
      .getStats()
      .then((result) => {
        if (isCurrent) {
          setStats(result.data);
          setCacheStatus(result.cacheStatus);
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load statistics.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [refreshKey]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
            <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
            <span>MUNICIPAL METRICS & REDIS CACHE</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            System Analytics & Cache Status
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Real-time aggregate totals, complaint category breakdowns, and Redis 30-second TTL cache status indicators.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
          disabled={isLoading}
          onClick={() => setRefreshKey((current) => current + 1)}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
          {isLoading ? "Refreshing Payload…" : "Refresh Statistics"}
        </motion.button>
      </div>

      <div className="mt-8">
        {error && <Alert tone="error">{error}</Alert>}
        {isLoading && !stats ? (
          <LoadingPanel label="Computing real-time analytics" />
        ) : (
          stats && <StatsCards cacheStatus={cacheStatus} stats={stats} />
        )}
      </div>
    </motion.section>
  );
}
