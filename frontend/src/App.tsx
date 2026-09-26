import { AppShell } from "./components/AppShell";

export default function App() {
  return (
    <AppShell>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <p className="text-sm font-medium text-indigo-300">Operations workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Report and resolve civic issues.</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Submit a complaint, monitor its triage and lifecycle, and inspect live operational statistics.
        </p>
      </section>
    </AppShell>
  );
}
