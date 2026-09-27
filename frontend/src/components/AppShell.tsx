import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/submit", label: "Submit complaint" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stats", label: "Statistics" },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <NavLink className="flex items-center gap-3 font-semibold tracking-tight" to="/submit">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-sm font-bold">CP</span>
            <span>
              CivicPulse
              <span className="block text-xs font-normal text-slate-400">Civic complaint operations</span>
            </span>
          </NavLink>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-1">
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
