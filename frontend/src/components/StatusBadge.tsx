import type { Category, ComplaintStatus, Priority } from "../api/types";
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert, Sparkles, Droplets, Car, Zap, Trash2, Shield, CircleHelp } from "lucide-react";

type BadgeValue = Category | ComplaintStatus | Priority | "HIT" | "MISS" | null;

const styleByValue: Record<Exclude<BadgeValue, null>, { style: string; dot: string; icon?: React.ComponentType<{ className?: string }> }> = {
  SUBMITTED: { style: "bg-slate-800/80 text-slate-300 ring-1 ring-white/10", dot: "bg-slate-400", icon: Clock },
  TRIAGED: { style: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30", dot: "bg-indigo-400", icon: Sparkles },
  IN_PROGRESS: { style: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", dot: "bg-amber-400 animate-pulse", icon: Clock },
  RESOLVED: { style: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30", dot: "bg-emerald-400", icon: CheckCircle2 },
  REJECTED: { style: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30", dot: "bg-rose-400", icon: ShieldAlert },
  LOW: { style: "bg-slate-800/80 text-slate-300 ring-1 ring-white/10", dot: "bg-slate-400" },
  MEDIUM: { style: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", dot: "bg-amber-400", icon: AlertTriangle },
  HIGH: { style: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30", dot: "bg-orange-400", icon: AlertTriangle },
  CRITICAL: { style: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30", dot: "bg-rose-400 animate-ping", icon: ShieldAlert },
  WATER: { style: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30", dot: "bg-sky-400", icon: Droplets },
  ROADS: { style: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30", dot: "bg-violet-400", icon: Car },
  ELECTRICITY: { style: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30", dot: "bg-yellow-400", icon: Zap },
  WASTE: { style: "bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30", dot: "bg-lime-400", icon: Trash2 },
  SANITATION: { style: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30", dot: "bg-cyan-400", icon: Shield },
  OTHER: { style: "bg-slate-800/80 text-slate-300 ring-1 ring-white/10", dot: "bg-slate-400", icon: CircleHelp },
  HIT: { style: "bg-emerald-950 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30", dot: "bg-emerald-400", icon: CheckCircle2 },
  MISS: { style: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30", dot: "bg-rose-400", icon: ShieldAlert },
};

export function StatusBadge({ value }: { value: BadgeValue }) {
  if (!value) {
    return <span className="text-xs text-slate-500 font-medium">Unassigned</span>;
  }

  const config = styleByValue[value];
  const Icon = config?.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all ${config?.style || "bg-slate-800 text-slate-200"}`}>
      {config?.dot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {Icon && <Icon className="h-3 w-3 opacity-90" />}
      {value.replace(/_/g, " ")}
    </span>
  );
}
