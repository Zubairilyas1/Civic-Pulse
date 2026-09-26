import type { Category, ComplaintStatus, Priority } from "../api/types";

type BadgeValue = Category | ComplaintStatus | Priority | "HIT" | "MISS" | null;

const toneByValue: Record<Exclude<BadgeValue, null>, string> = {
  SUBMITTED: "bg-slate-700 text-slate-100",
  TRIAGED: "bg-indigo-950 text-indigo-200 ring-1 ring-inset ring-indigo-800",
  IN_PROGRESS: "bg-amber-950 text-amber-200 ring-1 ring-inset ring-amber-800",
  RESOLVED: "bg-emerald-950 text-emerald-200 ring-1 ring-inset ring-emerald-800",
  REJECTED: "bg-rose-950 text-rose-200 ring-1 ring-inset ring-rose-800",
  LOW: "bg-slate-700 text-slate-100",
  MEDIUM: "bg-amber-950 text-amber-200 ring-1 ring-inset ring-amber-800",
  HIGH: "bg-orange-950 text-orange-200 ring-1 ring-inset ring-orange-800",
  CRITICAL: "bg-rose-950 text-rose-200 ring-1 ring-inset ring-rose-800",
  WATER: "bg-sky-950 text-sky-200 ring-1 ring-inset ring-sky-800",
  ROADS: "bg-violet-950 text-violet-200 ring-1 ring-inset ring-violet-800",
  ELECTRICITY: "bg-yellow-950 text-yellow-200 ring-1 ring-inset ring-yellow-800",
  WASTE: "bg-lime-950 text-lime-200 ring-1 ring-inset ring-lime-800",
  SANITATION: "bg-cyan-950 text-cyan-200 ring-1 ring-inset ring-cyan-800",
  OTHER: "bg-slate-700 text-slate-100",
  HIT: "bg-emerald-950 text-emerald-200 ring-1 ring-inset ring-emerald-800",
  MISS: "bg-rose-950 text-rose-200 ring-1 ring-inset ring-rose-800",
};

export function StatusBadge({ value }: { value: BadgeValue }) {
  if (!value) {
    return <span className="text-sm text-slate-500">Unassigned</span>;
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneByValue[value]}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
