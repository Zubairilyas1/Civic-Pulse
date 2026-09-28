import type { Category, ComplaintStatus, Priority } from "../api/types";
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert, Sparkles, Droplets, Car, Zap, Trash2, Shield, CircleHelp } from "lucide-react";

type BadgeValue = Category | ComplaintStatus | Priority | "HIT" | "MISS" | null;

const styleByValue: Record<Exclude<BadgeValue, null>, { style: string; dot: string; icon?: React.ComponentType<{ className?: string }> }> = {
  SUBMITTED: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500", icon: Clock },
  TRIAGED: { style: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200", dot: "bg-indigo-500", icon: Sparkles },
  IN_PROGRESS: { style: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500 animate-pulse", icon: Clock },
  RESOLVED: { style: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  REJECTED: { style: "bg-rose-50 text-rose-800 ring-1 ring-rose-200", dot: "bg-rose-500", icon: ShieldAlert },
  LOW: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500" },
  MEDIUM: { style: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500", icon: AlertTriangle },
  HIGH: { style: "bg-orange-50 text-orange-800 ring-1 ring-orange-200", dot: "bg-orange-500", icon: AlertTriangle },
  CRITICAL: { style: "bg-rose-100 text-rose-900 ring-1 ring-rose-300 font-bold", dot: "bg-rose-600 animate-ping", icon: ShieldAlert },
  WATER: { style: "bg-sky-50 text-sky-800 ring-1 ring-sky-200", dot: "bg-sky-500", icon: Droplets },
  ROADS: { style: "bg-purple-50 text-purple-800 ring-1 ring-purple-200", dot: "bg-purple-500", icon: Car },
  ELECTRICITY: { style: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200", dot: "bg-yellow-500", icon: Zap },
  WASTE: { style: "bg-lime-50 text-lime-800 ring-1 ring-lime-200", dot: "bg-lime-500", icon: Trash2 },
  SANITATION: { style: "bg-teal-50 text-teal-800 ring-1 ring-teal-200", dot: "bg-teal-500", icon: Shield },
  OTHER: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500", icon: CircleHelp },
  HIT: { style: "bg-emerald-950 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  MISS: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-400", icon: Clock },
};

export function StatusBadge({ value }: { value: BadgeValue }) {
  if (!value) {
    return <span className="text-xs text-slate-400 font-medium">Unassigned</span>;
  }

  const config = styleByValue[value];
  const Icon = config?.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all ${config?.style || "bg-slate-100 text-slate-800"}`}>
      {config?.dot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {Icon && <Icon className="h-3 w-3 opacity-80" />}
      {value.replace(/_/g, " ")}
    </span>
  );
}
