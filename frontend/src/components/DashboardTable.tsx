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
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
        <h2 className="text-lg font-semibold">No matching complaints</h2>
        <p className="mt-2 text-sm text-slate-400">Adjust the filters or submit the first complaint for this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      <table className="w-full min-w-[920px] text-left text-sm">
        <caption className="sr-only">Civic complaints matching the selected filters</caption>
        <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-5 py-4 font-medium" scope="col">Complaint</th>
            <th className="px-4 py-4 font-medium" scope="col">Location</th>
            <th className="px-4 py-4 font-medium" scope="col">Category</th>
            <th className="px-4 py-4 font-medium" scope="col">Priority</th>
            <th className="px-4 py-4 font-medium" scope="col">Status</th>
            <th className="px-5 py-4 font-medium" scope="col">Created</th>
            <th className="px-5 py-4 font-medium" scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {complaints.map((complaint) => (
            <ComplaintRow
              complaint={complaint}
              isUpdating={updatingComplaintId === complaint.id}
              key={complaint.id}
              onAdvanceStatus={onAdvanceStatus}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComplaintRow({
  complaint,
  isUpdating,
  onAdvanceStatus,
}: {
  complaint: Complaint;
  isUpdating: boolean;
  onAdvanceStatus: (complaint: Complaint) => void;
}) {
  const nextStatus = getNextStatus(complaint.status);

  return (
    <tr className="align-top">
      <td className="max-w-xs px-5 py-4">
        <p className="font-medium text-slate-100">{complaint.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{complaint.summary || complaint.description}</p>
      </td>
      <td className="max-w-44 px-4 py-4 text-slate-300">{complaint.location}</td>
      <td className="px-4 py-4"><StatusBadge value={complaint.category} /></td>
      <td className="px-4 py-4"><StatusBadge value={complaint.priority} /></td>
      <td className="px-4 py-4"><StatusBadge value={complaint.status} /></td>
      <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDate(complaint.created_at)}</td>
      <td className="whitespace-nowrap px-5 py-4 text-right">
        {nextStatus ? (
          <button
            className="rounded-md border border-indigo-700 px-3 py-2 text-xs font-semibold text-indigo-200 hover:border-indigo-500 hover:bg-indigo-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={isUpdating}
            onClick={() => onAdvanceStatus(complaint)}
            type="button"
          >
            {isUpdating ? "Updating…" : `Advance to ${nextStatus.replace(/_/g, " ")}`}
          </button>
        ) : (
          <span className="text-xs text-slate-500">Terminal state</span>
        )}
      </td>
    </tr>
  );
}
