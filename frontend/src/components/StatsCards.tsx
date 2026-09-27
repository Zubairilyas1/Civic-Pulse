import type { ComplaintStats } from "../api/types";
import { StatusBadge } from "./StatusBadge";

function MetricCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {entries.length ? (
        <dl className="mt-4 space-y-3">
          {entries.map(([label, count]) => (
            <div className="flex items-center justify-between gap-4" key={label}>
              <dt className="text-sm text-slate-400">{label.replace(/_/g, " ")}</dt>
              <dd className="text-sm font-semibold text-slate-100">{count}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No data available yet.</p>
      )}
    </section>
  );
}

export function StatsCards({ stats, cacheStatus }: { stats: ComplaintStats; cacheStatus: string | null }) {
  const openComplaints = ["SUBMITTED", "TRIAGED", "IN_PROGRESS"].reduce(
    (total, status) => total + (stats.by_status[status] || 0),
    0,
  );
  const resolvedComplaints = stats.by_status.RESOLVED || 0;
  const normalizedCacheStatus = cacheStatus === "HIT" || cacheStatus === "MISS" ? cacheStatus : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Values are aggregated by the CivicPulse API.</p>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Stats cache</span>
          {normalizedCacheStatus ? <StatusBadge value={normalizedCacheStatus} /> : <span>Unavailable</span>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard description="All complaints recorded by CivicPulse" label="Total complaints" value={stats.total_complaints} />
        <MetricCard description="Submitted, triaged, or currently in progress" label="Open complaints" value={openComplaints} />
        <MetricCard description="Complaints marked as resolved" label="Resolved" value={resolvedComplaints} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Breakdown title="By status" values={stats.by_status} />
        <Breakdown title="By category" values={stats.by_category} />
        <Breakdown title="By priority" values={stats.by_priority} />
      </div>
    </div>
  );
}
