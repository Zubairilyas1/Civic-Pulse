import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ShieldCheck, FileText, LayoutDashboard, BarChart3 } from "lucide-react";

const navigation = [
  { to: "/submit", label: "Submit complaint", icon: FileText },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
];

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();

  return (
    <div className="min-h-screen text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-xs transition-all">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <NavLink 
            className="group flex items-center gap-3 font-semibold tracking-tight transition-opacity hover:opacity-90" 
            to="/submit"
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25 ring-1 ring-black/5 transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">
                CivicPulse
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 ring-1 ring-emerald-500/20">
                  PRO OPERATIONS
                </span>
              </span>
              <span className="block text-xs font-medium text-slate-500">Municipal Complaint Triage & Infrastructure</span>
            </div>
          </NavLink>

          <nav aria-label="Primary navigation" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 backdrop-blur-md">
            {navigation.map((item) => {
              const isActive = location.pathname === item.to || (item.to === "/submit" && location.pathname === "/");
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive ? "text-emerald-900" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
                      transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className={`h-4 w-4 transition-transform ${isActive ? "text-emerald-600 scale-110" : "text-slate-400"}`} />
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
