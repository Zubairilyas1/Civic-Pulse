import { motion, type Variants } from "motion/react";
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
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
          <Inbox className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">No Matching Complaints Found</h2>
        <p className="mt-1.5 text-xs text-slate-500">Try clearing or adjusting your category, priority, or status filters.</p>
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

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
  };

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <caption className="sr-only">Civic complaints matching the selected filters</caption>
          <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur-md">
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
            className="divide-y divide-slate-200/80 bg-white"
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
  variants: Variants;
}) {
  const nextStatus = getNextStatus(complaint.status);

  return (
    <motion.tr
      variants={variants}
      className="group transition-colors hover:bg-slate-50/80"
    >
      <td className="px-6 py-4 font-medium text-slate-900 max-w-xs">
        <p className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">{complaint.title}</p>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">{complaint.summary || complaint.description}</p>
      </td>
      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[140px] font-medium">{complaint.location}</span>
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
      <td className="px-4 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
        {formatDate(complaint.created_at)}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        {nextStatus ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Advance to ${nextStatus.replace(/_/g, " ")}`}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-600 hover:text-white disabled:opacity-40 transition-all"
            disabled={isUpdating}
            onClick={() => onAdvanceStatus(complaint)}
            type="button"
          >
            <span>Advance Status</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Terminal</span>
        )}
      </td>
    </motion.tr>
  );
}
