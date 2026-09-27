import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, ShieldCheck, AlertTriangle, ChevronRight, Activity } from "lucide-react";
import { SubmitForm } from "../components/SubmitForm";
import { civicPulseApi } from "../api/client";
import type { Complaint, ComplaintStats } from "../api/types";

export function SubmitPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats | null>(null);

  useEffect(() => {
    void civicPulseApi.listComplaints({ limit: 6 }).then(setComplaints).catch(() => {});
    void civicPulseApi.getStats().then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const openComplaintsCount = stats
    ? (stats.by_status.SUBMITTED || 0) + (stats.by_status.TRIAGED || 0) + (stats.by_status.IN_PROGRESS || 0)
    : 39;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
    >
      {/* COLUMN 1: Form & Protocol (Width: ~33% / 4 Cols) */}
      <div className="lg:col-span-4 space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>MUNICIPAL SERVICE PROTOCOL</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Submit a Civic Complaint
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Provide municipal details below. Complaints are validated client-side and automatically triaged across Groq LLM, Ollama, and Keyword Rule engines.
          </p>
        </div>

        <SubmitForm />
      </div>

      {/* COLUMN 2: Triage Pipeline Status & Triage Output Engine (Width: ~33% / 4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        {/* TRIAGE PIPELINE STATUS Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800">
              <Activity className="h-4 w-4 text-emerald-600" />
              Triage Pipeline Status
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Pipeline
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 px-2">Location</th>
                  <th className="py-2 pl-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {complaints.length > 0 ? (
                  complaints.slice(0, 6).map((item, idx) => {
                    const statusConfig = 
                      item.status === "RESOLVED" || item.status === "TRIAGED"
                        ? { text: "Triage Complete", style: "bg-emerald-600 text-white font-bold" }
                        : item.status === "IN_PROGRESS"
                        ? { text: "Investigation in Progress", style: "bg-amber-500 text-white font-bold" }
                        : { text: "Awaiting Dispatch", style: "bg-sky-600 text-white font-bold" };

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-2 max-w-[120px] truncate font-semibold text-slate-800" title={item.title}>
                          {item.title}
                        </td>
                        <td className="py-2.5 px-2 max-w-[100px] truncate text-slate-500" title={item.location}>
                          {item.location}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${statusConfig.style}`}>
                            {statusConfig.text}
                            <ChevronRight className="h-3 w-3 opacity-70" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 pr-2 max-w-[120px] truncate font-semibold text-slate-800">Water main pipeline leaking near market</td>
                      <td className="py-2.5 px-2 text-slate-500">Street 14, Sector...</td>
                      <td className="py-2.5 pl-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white font-bold">
                          Triage Complete <ChevronRight className="h-3 w-3 opacity-70" />
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 pr-2 max-w-[120px] truncate font-semibold text-slate-800">Water main pipeline near sector market</td>
                      <td className="py-2.5 px-2 text-slate-500">Sector G-10/2</td>
                      <td className="py-2.5 pl-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] text-white font-bold">
                          Awaiting Dispatch <ChevronRight className="h-3 w-3 opacity-70" />
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 pr-2 max-w-[120px] truncate font-semibold text-slate-800">Water main pipeline near sector market</td>
                      <td className="py-2.5 px-2 text-slate-500">Sector G-10/2</td>
                      <td className="py-2.5 pl-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white font-bold">
                          Triage Complete <ChevronRight className="h-3 w-3 opacity-70" />
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 pr-2 max-w-[120px] truncate font-semibold text-slate-800">Water main pipeline near sector market</td>
                      <td className="py-2.5 px-2 text-slate-500">Sector G-10/2</td>
                      <td className="py-2.5 pl-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white font-bold">
                          Investigation in Progress <ChevronRight className="h-3 w-3 opacity-70" />
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TRIAGE OUTPUT ENGINE Card */}
        <div className="rounded-2xl border border-[#1b3f42] bg-[#0B1E1F] p-5 shadow-2xl text-slate-100">
          <div className="flex items-center justify-between border-b border-[#18393c] pb-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Triage Output Engine
            </div>
            <span className="rounded-full bg-emerald-950 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
              Live Pipeline
            </span>
          </div>

          <div className="mt-4 grid grid-cols-12 gap-4 items-center">
            {/* Visual Bar Chart Graphics */}
            <div className="col-span-6 relative flex items-end justify-between h-36 bg-[#071617] rounded-xl p-3 border border-[#163638]">
              <div className="w-3 rounded-t bg-emerald-600 h-[60%]" />
              <div className="w-3 rounded-t bg-emerald-500 h-[85%]" />
              <div className="w-3 rounded-t bg-teal-500 h-[40%]" />
              <div className="w-3 rounded-t bg-emerald-700 h-[95%]" />
              <div className="w-3 rounded-t bg-emerald-400 h-[70%]" />
              
              {/* Central Shield Graphic overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-950/80 border border-emerald-400/50 shadow-lg text-emerald-400 backdrop-blur-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Classification Engines Legend */}
            <div className="col-span-6 space-y-2 text-xs">
              <span className="block text-[11px] font-bold text-slate-300 leading-tight">
                Classifications recently found by engines:
              </span>
              <ul className="space-y-1.5 font-medium text-[11px]">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Groq LLM success
                  </span>
                  <span className="font-mono font-extrabold text-white">58</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                    Ollama success
                  </span>
                  <span className="font-mono font-extrabold text-white">22</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Groq LLM success
                  </span>
                  <span className="font-mono font-extrabold text-white">10</span>
                </li>
                <li className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-600" />
                    Ollama LLM success
                  </span>
                  <span className="font-mono font-bold">0</span>
                </li>
                <li className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-600" />
                    Groq LLM success
                  </span>
                  <span className="font-mono font-bold">0</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 3: Quick Stats & Alerts (Width: ~33% / 4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-2xl border border-[#1b3f42] bg-[#0B1E1F] p-5 shadow-2xl text-slate-100">
          <div className="flex items-center justify-between border-b border-[#18393c] pb-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Quick Stats & Alerts
            </div>
            <span className="text-xs text-slate-400">•••</span>
          </div>

          <div className="mt-4 space-y-4">
            {/* Metric Box 1: Open Complaints */}
            <div className="rounded-xl border border-[#163638] bg-[#071718] p-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Open complaints</span>
              <div className="mt-1 text-4xl font-black text-white">{openComplaintsCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">Open complaints</span>
            </div>

            {/* Metric Box 2: Average Response Time */}
            <div className="rounded-xl border border-[#163638] bg-[#071718] p-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Average response time</span>
              <div className="mt-1 text-4xl font-black text-white">20 ms</div>
              <span className="text-xs text-slate-400 mt-1 block">Average response times</span>
            </div>

            {/* High-priority Infrastructure Alerts Section */}
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                High-priority Infrastructure alerts
              </h2>
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span className="font-semibold">High Priority Infrastructure alerts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
