import { useEffect, useState } from "react";
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
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-300">Operational overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Statistics</h1>
          <p className="mt-3 max-w-2xl leading-6 text-slate-300">Monitor complaint volume and see whether the API served this summary from its 30-second cache.</p>
        </div>
        <button
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          disabled={isLoading}
          onClick={() => setRefreshKey((current) => current + 1)}
          type="button"
        >
          {isLoading ? "Refreshing…" : "Refresh statistics"}
        </button>
      </div>

      <div className="mt-8">
        {error && <Alert tone="error">{error}</Alert>}
        <div className={error ? "mt-4" : ""}>
          {isLoading ? <LoadingPanel label="Loading statistics" /> : stats ? <StatsCards cacheStatus={cacheStatus} stats={stats} /> : null}
        </div>
      </div>
    </section>
  );
}
