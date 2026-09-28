import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type AlertTone = "error" | "info" | "success";

const styles: Record<AlertTone, { wrapper: string; icon: React.ComponentType<{ className?: string }> }> = {
  error: { wrapper: "border-rose-200 bg-rose-50 text-rose-800 ring-1 ring-rose-200", icon: AlertCircle },
  info: { wrapper: "border-slate-200 bg-slate-50 text-slate-800 ring-1 ring-slate-200", icon: Info },
  success: { wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", icon: CheckCircle2 },
};

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: AlertTone }) {
  const Icon = styles[tone].icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 shadow-xs transition-all ${styles[tone].wrapper}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" />
      <div>{children}</div>
    </div>
  );
}

export function LoadingPanel({ label = "Loading data" }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="glass-panel space-y-4 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="text-sm font-semibold text-slate-600">{label}…</span>
      </div>
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200/70" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
      <div className="h-10 w-4/5 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
