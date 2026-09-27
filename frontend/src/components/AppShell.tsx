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
    <div className="min-h-screen text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <NavLink 
            className="group flex items-center gap-3 font-semibold tracking-tight transition-opacity hover:opacity-90" 
            to="/submit"
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
                CivicPulse
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-400 ring-1 ring-indigo-500/20">
                  PRO
                </span>
              </span>
              <span className="block text-xs font-medium text-slate-400">Civic Operations & AI Triage</span>
            </div>
          </NavLink>

          <nav aria-label="Primary navigation" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-md">
            {navigation.map((item) => {
              const isActive = location.pathname === item.to || (item.to === "/submit" && location.pathname === "/");
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-md shadow-indigo-600/30"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className={`h-4 w-4 transition-transform ${isActive ? "scale-110 text-white" : "text-slate-400"}`} />
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
