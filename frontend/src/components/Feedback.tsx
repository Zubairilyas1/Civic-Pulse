import type { ReactNode } from "react";

type AlertTone = "error" | "info" | "success";

const styles: Record<AlertTone, string> = {
  error: "border-rose-900 bg-rose-950/40 text-rose-100",
  info: "border-indigo-900 bg-indigo-950/40 text-indigo-100",
  success: "border-emerald-900 bg-emerald-950/40 text-emerald-100",
};

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: AlertTone }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function LoadingPanel({ label = "Loading data" }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-700/60" />
      <div className="h-8 w-full animate-pulse rounded bg-slate-800" />
      <div className="h-8 w-4/5 animate-pulse rounded bg-slate-800" />
    </div>
  );
}
