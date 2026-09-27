import { motion } from "motion/react";
import { Inbox, MapPin, ArrowUpRight } from "lucide-react";
import { getNextStatus } from "../api/status";
import type { Complaint } from "../api/types";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

interface DashboardTableProps {
  complaints: Complaint[];
  onAdvanceStatus: (complaint: Complaint) => void;
  updatingComplaintId: string | null;
}

export function DashboardTable({ complaints, onAdvanceStatus, updatingComplaintId }: DashboardTableProps) {
  if (complaints.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border-dashed p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-800/80 text-slate-500 ring-1 ring-white/10">
          <Inbox className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-white">No Matching Complaints Found</h2>
        <p className="mt-1.5 text-xs text-slate-400">Try clearing or adjusting your category, priority, or status filters.</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
  };

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <caption className="sr-only">Civic complaints matching the selected filters</caption>
          <thead className="border-b border-white/10 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 font-bold" scope="col">Complaint & Summary</th>
              <th className="px-4 py-4 font-bold" scope="col">Location</th>
              <th className="px-4 py-4 font-bold" scope="col">Category</th>
              <th className="px-4 py-4 font-bold" scope="col">Priority</th>
              <th className="px-4 py-4 font-bold" scope="col">Status</th>
              <th className="px-4 py-4 font-bold" scope="col">Created Date</th>
              <th className="px-6 py-4 font-bold text-right" scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <motion.tbody
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-white/5"
          >
            {complaints.map((complaint) => (
              <ComplaintRow
                variants={itemVariants}
                complaint={complaint}
                isUpdating={updatingComplaintId === complaint.id}
                key={complaint.id}
                onAdvanceStatus={onAdvanceStatus}
              />
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}

function ComplaintRow({
  complaint,
  isUpdating,
  onAdvanceStatus,
  variants,
}: {
  complaint: Complaint;
  isUpdating: boolean;
  onAdvanceStatus: (complaint: Complaint) => void;
  variants: Record<string, unknown>;
}) {
  const nextStatus = getNextStatus(complaint.status);

  return (
    <motion.tr
      variants={variants}
      className="group transition-colors hover:bg-slate-800/40"
    >
      <td className="px-6 py-4 font-medium text-slate-100 max-w-xs">
        <p className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{complaint.title}</p>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">{complaint.summary || complaint.description}</p>
      </td>
      <td className="px-4 py-4 text-slate-300 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate max-w-[140px]">{complaint.location}</span>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <StatusBadge value={complaint.category} />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <StatusBadge value={complaint.priority} />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <StatusBadge value={complaint.status} />
      </td>
      <td className="px-4 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
        {formatDate(complaint.created_at)}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        {nextStatus ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Advance to ${nextStatus.replace(/_/g, " ")}`}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-600 hover:text-white disabled:opacity-40 transition-all"
            disabled={isUpdating}
            onClick={() => onAdvanceStatus(complaint)}
            type="button"
          >
            <span>Advance Status</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Terminal</span>
        )}
      </td>
    </motion.tr>
  );
}
