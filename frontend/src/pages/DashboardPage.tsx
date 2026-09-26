import { useEffect, useState } from "react";
import { civicPulseApi } from "../api/client";
import { CATEGORIES, PRIORITIES, STATUSES, type Category, type Complaint, type ComplaintStatus, type Priority } from "../api/types";
import { DashboardTable, getNextStatus } from "../components/DashboardTable";
import { Alert, LoadingPanel } from "../components/Feedback";

const PAGE_SIZE = 10;

interface FilterState {
  category: "" | Category;
  priority: "" | Priority;
  status: "" | ComplaintStatus;
}

const initialFilters: FilterState = { category: "", priority: "", status: "" };

export function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(0);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<Complaint | null>(null);
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    void civicPulseApi
      .listComplaints({
        category: filters.category || undefined,
        priority: filters.priority || undefined,
        status: filters.status || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (isCurrent) {
          setComplaints(data);
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setComplaints([]);
          setError(requestError instanceof Error ? requestError.message : "Unable to load complaints.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [filters.category, filters.priority, filters.status, page]);

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  async function confirmTransition(): Promise<void> {
    if (!pendingTransition) {
      return;
    }

    const nextStatus = getNextStatus(pendingTransition.status);
    if (!nextStatus) {
      setPendingTransition(null);
      return;
    }

    setUpdatingComplaintId(pendingTransition.id);
    setError(null);
    setTransitionMessage(null);

    try {
      const updatedComplaint = await civicPulseApi.updateComplaintStatus(pendingTransition.id, { status: nextStatus });
      setComplaints((current) => current.map((complaint) => complaint.id === updatedComplaint.id ? updatedComplaint : complaint));
      setTransitionMessage(`Status updated to ${updatedComplaint.status.replaceAll("_", " ")}.`);
      setPendingTransition(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the complaint status.");
    } finally {
      setUpdatingComplaintId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-300">Complaint operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-3 max-w-2xl leading-6 text-slate-300">Review submitted reports and filter the operational queue.</p>
        </div>
        <p className="text-sm text-slate-400">Page {page + 1}</p>
      </div>

      <div className="mt-8 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-200" htmlFor="filter-category">
          Category
          <select
            className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
            id="filter-category"
            onChange={(event) => setFilter("category", event.target.value as FilterState["category"])}
            value={filters.category}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-200" htmlFor="filter-priority">
          Priority
          <select
            className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
            id="filter-priority"
            onChange={(event) => setFilter("priority", event.target.value as FilterState["priority"])}
            value={filters.priority}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-200" htmlFor="filter-status">
          Status
          <select
            className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
            id="filter-status"
            onChange={(event) => setFilter("status", event.target.value as FilterState["status"])}
            value={filters.status}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <div className="sm:col-span-3">
          <button
            className="text-sm font-medium text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onClick={() => {
              setFilters(initialFilters);
              setPage(0);
            }}
            type="button"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="mt-6">
        {error && <Alert tone="error">{error}</Alert>}
        {transitionMessage && <div className={error ? "mt-4" : ""}><Alert tone="success">{transitionMessage}</Alert></div>}
        <div className={error || transitionMessage ? "mt-4" : ""}>
          {isLoading ? (
            <LoadingPanel label="Loading complaints" />
          ) : (
            <DashboardTable
              complaints={complaints}
              onAdvanceStatus={setPendingTransition}
              updatingComplaintId={updatingComplaintId}
            />
          )}
        </div>
      </div>

      <nav aria-label="Complaint pages" className="mt-5 flex items-center justify-between gap-4">
        <button
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          disabled={page === 0 || isLoading}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          disabled={complaints.length < PAGE_SIZE || isLoading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Next
        </button>
      </nav>

      {pendingTransition && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/75 p-4">
          <section aria-labelledby="transition-title" aria-modal="true" className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl" role="dialog">
            <p className="text-sm font-semibold text-amber-300">Confirm status update</p>
            <h2 className="mt-2 text-xl font-semibold" id="transition-title">Advance this complaint?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              <span className="font-medium text-slate-100">{pendingTransition.title}</span> will move from {pendingTransition.status.replaceAll("_", " ")} to {getNextStatus(pendingTransition.status)?.replaceAll("_", " ")}.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                disabled={updatingComplaintId === pendingTransition.id}
                onClick={() => setPendingTransition(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                disabled={updatingComplaintId === pendingTransition.id}
                onClick={() => void confirmTransition()}
                type="button"
              >
                {updatingComplaintId === pendingTransition.id ? "Updating…" : "Confirm update"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
