import { motion } from "motion/react";
import { Layers, Clock, CheckCircle2, Database, Activity } from "lucide-react";
import type { ComplaintStats } from "../api/types";
import { StatusBadge } from "./StatusBadge";

function MetricCard({ label, value, description, icon: Icon }: { label: string; value: number; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring" as const, stiffness: 350, damping: 25 }}
      className="glass-panel relative overflow-hidden rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">{description}</p>
    </motion.article>
  );
}

function Breakdown({ title, values, total }: { title: string; values: Record<string, number>; total: number }) {
  const entries = Object.entries(values);
  return (
    <section className="glass-panel rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          {title}
        </h2>
        <span className="text-xs font-mono font-bold text-slate-400">{entries.length} groups</span>
      </div>
      {entries.length ? (
        <dl className="mt-5 space-y-4">
          {entries.map(([label, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <dt className="font-bold text-slate-700">{label.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-slate-900 font-extrabold">{count} <span className="text-slate-400 text-[10px]">({percentage}%)</span></dd>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-2xs"
                  />
                </div>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-4 text-xs text-slate-500">No telemetry data recorded yet.</p>
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
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Database className="h-4 w-4 text-emerald-600" />
          <span>Municipal Database Telemetry Aggregated by CivicPulse API</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
          <span className="text-slate-500">Redis 30s Cache Status:</span>
          {normalizedCacheStatus ? (
            <div className="flex items-center gap-2">
              <StatusBadge value={normalizedCacheStatus} />
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${normalizedCacheStatus === "HIT" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${normalizedCacheStatus === "HIT" ? "bg-emerald-500" : "bg-rose-500"}`} />
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Unavailable</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <MetricCard icon={Layers} description="All municipal complaints registered in database" label="Total complaints" value={stats.total_complaints} />
        <MetricCard icon={Clock} description="Submitted, triaged, or currently in progress" label="Open complaints" value={openComplaints} />
        <MetricCard icon={CheckCircle2} description="Complaints successfully resolved by field teams" label="Resolved" value={resolvedComplaints} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Breakdown title="Distribution by Status" total={stats.total_complaints} values={stats.by_status} />
        <Breakdown title="Distribution by Category" total={stats.total_complaints} values={stats.by_category} />
        <Breakdown title="Distribution by Priority" total={stats.total_complaints} values={stats.by_priority} />
      </div>
    </div>
  );
}
