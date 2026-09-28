import { motion } from "motion/react";
import { Layers, Clock, CheckCircle2, Activity } from "lucide-react";
import type { ComplaintStats } from "../api/types";
import { StatusBadge } from "./StatusBadge";

function MetricCard({ label, value, description, icon: Icon }: { label: string; value: number; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring" as const, stiffness: 350, damping: 25 }}
      className="glass-panel relative overflow-hidden rounded-2xl p-6 shadow-xs hover:shadow-md transition-all border border-slate-200/90"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-1 ring-emerald-200/80 shadow-2xs">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">{description}</p>
    </motion.article>
  );
}

function Breakdown({ title, values, total, colorGradient }: { title: string; values: Record<string, number>; total: number; colorGradient: string }) {
  const entries = Object.entries(values);
  return (
    <section className="glass-panel rounded-2xl p-6 shadow-xs border border-slate-200/90">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <h2 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          {title}
        </h2>
        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
          {entries.length} Categories
        </span>
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/80">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${colorGradient} shadow-2xs`}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      ) : (
        <div className="mt-6 text-center py-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">No category records registered in system yet.</p>
        </div>
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
      {/* Utility Status Header Banner */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:px-6 shadow-xs border border-slate-200/90">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
          <Activity className="h-4 w-4 text-emerald-600" />
          <span>Live Operations Analytics & Cache Performance</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
          <span className="text-slate-500">Redis 30s Cache Status:</span>
          {normalizedCacheStatus ? (
            <div className="flex items-center gap-2">
              <StatusBadge value={normalizedCacheStatus} />
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${normalizedCacheStatus === "HIT" ? "bg-emerald-400" : "bg-slate-400"}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${normalizedCacheStatus === "HIT" ? "bg-emerald-500" : "bg-slate-500"}`} />
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Unavailable</span>
          )}
        </div>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <MetricCard icon={Layers} description="All municipal complaints registered in database" label="Total complaints" value={stats.total_complaints} />
        <MetricCard icon={Clock} description="Submitted, triaged, or currently in progress" label="Open complaints" value={openComplaints} />
        <MetricCard icon={CheckCircle2} description="Complaints successfully resolved by field teams" label="Resolved" value={resolvedComplaints} />
      </div>

      {/* Bottom 3 Breakdown Distribution Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Breakdown title="Distribution by Status" total={stats.total_complaints} values={stats.by_status} colorGradient="from-emerald-500 to-teal-500" />
        <Breakdown title="Distribution by Category" total={stats.total_complaints} values={stats.by_category} colorGradient="from-indigo-500 to-purple-500" />
        <Breakdown title="Distribution by Priority" total={stats.total_complaints} values={stats.by_priority} colorGradient="from-amber-500 to-orange-500" />
      </div>
    </div>
  );
}
