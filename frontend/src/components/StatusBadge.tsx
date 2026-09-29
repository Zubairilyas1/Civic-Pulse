import type { Category, ComplaintStatus, Priority } from "../api/types";
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert, Droplets, Car, Zap, Lightbulb, Shield, CircleHelp } from "lucide-react";

type BadgeValue = Category | ComplaintStatus | Priority | "HIT" | "MISS" | null;

const styleByValue: Record<Exclude<BadgeValue, null>, { style: string; dot: string; icon?: React.ComponentType<{ className?: string }> }> = {
  open: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500", icon: Clock },
  in_progress: { style: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500 animate-pulse", icon: Clock },
  resolved: { style: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  rejected: { style: "bg-rose-50 text-rose-800 ring-1 ring-rose-200", dot: "bg-rose-500", icon: ShieldAlert },
  low: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500" },
  normal: { style: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500", icon: AlertTriangle },
  high: { style: "bg-orange-50 text-orange-800 ring-1 ring-orange-200", dot: "bg-orange-500", icon: AlertTriangle },
  water: { style: "bg-sky-50 text-sky-800 ring-1 ring-sky-200", dot: "bg-sky-500", icon: Droplets },
  roads: { style: "bg-purple-50 text-purple-800 ring-1 ring-purple-200", dot: "bg-purple-500", icon: Car },
  electricity: { style: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200", dot: "bg-yellow-500", icon: Zap },
  streetlights: { style: "bg-lime-50 text-lime-800 ring-1 ring-lime-200", dot: "bg-lime-500", icon: Lightbulb },
  sanitation: { style: "bg-teal-50 text-teal-800 ring-1 ring-teal-200", dot: "bg-teal-500", icon: Shield },
  other: { style: "bg-slate-100 text-slate-700 ring-1 ring-slate-200", dot: "bg-slate-500", icon: CircleHelp },
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
      {value.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}
