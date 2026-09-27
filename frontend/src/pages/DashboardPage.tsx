import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, RotateCcw, ChevronLeft, ChevronRight, LayoutDashboard, AlertTriangle, ArrowRight } from "lucide-react";
import { civicPulseApi } from "../api/client";
import { getNextStatus } from "../api/status";
import { CATEGORIES, PRIORITIES, STATUSES, type Category, type Complaint, type ComplaintStatus, type Priority } from "../api/types";
import { DashboardTable } from "../components/DashboardTable";
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
      setTransitionMessage(`Status updated to ${updatedComplaint.status.replace(/_/g, " ")}.`);
      setPendingTransition(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the complaint status.");
    } finally {
      setUpdatingComplaintId(null);
    }
  }

  const isFiltered = Boolean(filters.category || filters.priority || filters.status);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
            <span>OPERATIONAL COMPLAINT QUEUE</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Complaints Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-300">
            Monitor, inspect, and advance complaint status transitions across all municipal service channels.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#1b3d40] bg-[#081b1c] px-3.5 py-1.5 text-xs font-semibold text-slate-300">
          <span>Page {page + 1}</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">{complaints.length} records shown</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel mt-8 rounded-2xl p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-200">
            <Filter className="h-4 w-4 text-emerald-400" />
            Queue Filtering Criteria
          </span>
          {isFiltered && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
              onClick={() => {
                setFilters(initialFilters);
                setPage(0);
              }}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </motion.button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-bold text-slate-300" htmlFor="filter-category">
            Category
            <select
              className="glass-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 bg-white focus:outline-none"
              id="filter-category"
              onChange={(event) => setFilter("category", event.target.value as FilterState["category"])}
              value={filters.category}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-300" htmlFor="filter-priority">
            Priority Level
            <select
              className="glass-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 bg-white focus:outline-none"
              id="filter-priority"
              onChange={(event) => setFilter("priority", event.target.value as FilterState["priority"])}
              value={filters.priority}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-300" htmlFor="filter-status">
            Complaint Status
            <select
              className="glass-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 bg-white focus:outline-none"
              id="filter-status"
              onChange={(event) => setFilter("status", event.target.value as FilterState["status"])}
              value={filters.status}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="mt-6">
        {error && <Alert tone="error">{error}</Alert>}
        {transitionMessage && <div className={error ? "mt-4" : ""}><Alert tone="success">{transitionMessage}</Alert></div>}
        <div className={error || transitionMessage ? "mt-4" : ""}>
          {isLoading ? (
            <LoadingPanel label="Fetching operational queue" />
          ) : (
            <DashboardTable
              complaints={complaints}
              onAdvanceStatus={setPendingTransition}
              updatingComplaintId={updatingComplaintId}
            />
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <nav aria-label="Complaint pages" className="mt-6 flex items-center justify-between gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-xl border border-[#1b3d40] bg-[#081b1c] px-4 py-2.5 text-xs font-bold text-slate-200 shadow-2xs hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page === 0 || isLoading}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Page
        </motion.button>
        <span className="text-xs font-bold text-slate-400">Page {page + 1}</span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-xl border border-[#1b3d40] bg-[#081b1c] px-4 py-2.5 text-xs font-bold text-slate-200 shadow-2xs hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={complaints.length < PAGE_SIZE || isLoading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Next Page
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </nav>

      {/* Status Transition Confirmation Modal */}
      <AnimatePresence>
        {pendingTransition && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xs">
            <motion.section
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring" as const, stiffness: 350, damping: 25 }}
              aria-labelledby="transition-title"
              aria-modal="true"
              className="glass-panel w-full max-w-md rounded-2xl bg-[#0B1E1F] border border-[#1b3f42] p-6 shadow-2xl text-slate-100"
              role="dialog"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                State Machine Transition
              </div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-white" id="transition-title">
                Advance this complaint?
              </h2>
              <div className="mt-4 rounded-xl border border-[#163638] bg-[#071718] p-4">
                <p className="text-sm font-bold text-white">{pendingTransition.title}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <span className="rounded bg-slate-800 px-2.5 py-1 text-slate-300">{pendingTransition.status.replace(/_/g, " ")}</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  <span className="rounded bg-emerald-600 px-2.5 py-1 text-white font-bold">{getNextStatus(pendingTransition.status)?.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:bg-[#163638] hover:text-white"
                  disabled={updatingComplaintId === pendingTransition.id}
                  onClick={() => setPendingTransition(null)}
                  type="button"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  aria-label="Confirm update"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/50 disabled:opacity-50"
                  disabled={updatingComplaintId === pendingTransition.id}
                  onClick={() => void confirmTransition()}
                  type="button"
                >
                  {updatingComplaintId === pendingTransition.id ? "Updating…" : "Confirm update"}
                </motion.button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
