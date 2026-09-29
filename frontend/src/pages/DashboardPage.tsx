import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, RotateCcw, ChevronLeft, ChevronRight, LayoutDashboard, AlertTriangle, ArrowRight, Search } from "lucide-react";
import { civicPulseApi } from "../api/client";
import { getNextStatus } from "../api/status";
import { CATEGORIES, PRIORITIES, STATUSES, type Category, type Complaint, type ComplaintStatus, type Priority } from "../api/types";
import { DashboardTable } from "../components/DashboardTable";
import { Alert, LoadingPanel } from "../components/Feedback";

// Use the same page size for API requests and pagination calculations.
const PAGE_SIZE = 10;

interface FilterState {
  searchQuery: string;
  category: "" | Category;
  priority: "" | Priority;
  status: "" | ComplaintStatus;
}

// Empty filter values represent an unfiltered complaint list.
const initialFilters: FilterState = { searchQuery: "", category: "", priority: "", status: "" };

export function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<Complaint | null>(null);
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  // Reload the queue when a server-side filter or page changes.
  useEffect(() => {
    // Ignore results from requests superseded by effect cleanup.
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    void civicPulseApi
      .listComplaints({
        // Omit empty dropdown filters from the API request.
        category: filters.category || undefined,
        priority: filters.priority || undefined,
        status: filters.status || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      .then((data) => {
        if (isCurrent) {
          setComplaints(data.items);
          setTotal(data.total);
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

  // Restart pagination when any filter changes.
  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  // Restore all filters and return to the first page.
  function resetAllFilters(): void {
    setFilters(initialFilters);
    setPage(1);
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
      setTransitionMessage(`Status updated to ${updatedComplaint.status.replace(/_/g, " ").toUpperCase()}.`);
      setPendingTransition(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the complaint status.");
    } finally {
      setUpdatingComplaintId(null);
    }
  }

  // Client-side text search filtering
  const filteredComplaints = complaints.filter((item) => {
    if (!filters.searchQuery.trim()) return true;
    const query = filters.searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      (item.summary && item.summary.toLowerCase().includes(query))
    );
  });

  const isFiltered = Boolean(filters.searchQuery || filters.category || filters.priority || filters.status);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
            <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" />
            <span>LIVE TRIAGE QUEUE</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Complaints Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Monitor, search, and advance complaint status transitions across all municipal service channels.
          </p>
        </div>
      </div>

      {/* Filter & Free-Text Search Toolbar */}
      <div className="glass-panel mt-8 rounded-2xl p-4 shadow-xs space-y-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
            <Filter className="h-4 w-4 text-emerald-600" />
            Filter & Search Operations
          </span>
          {isFiltered && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs"
              onClick={resetAllFilters}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </motion.button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {/* Free-Text Search Bar */}
          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 block mb-1.5" htmlFor="filter-search">
              Keyword Search
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                id="filter-search"
                type="text"
                className="glass-input block w-full rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                placeholder="Title, Location, or ID..."
                value={filters.searchQuery}
                onChange={(e) => setFilter("searchQuery", e.target.value)}
              />
            </div>
          </div>

          {/* Compact Category Dropdown */}
          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 block mb-1.5" htmlFor="filter-category">
              Category
            </label>
            <select
              className="glass-input block w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              id="filter-category"
              onChange={(event) => setFilter("category", event.target.value as FilterState["category"])}
              value={filters.category}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          {/* Compact Priority Dropdown */}
          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 block mb-1.5" htmlFor="filter-priority">
              Priority Level
            </label>
            <select
              className="glass-input block w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              id="filter-priority"
              onChange={(event) => setFilter("priority", event.target.value as FilterState["priority"])}
              value={filters.priority}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </div>

          {/* Compact Status Dropdown */}
          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 block mb-1.5" htmlFor="filter-status">
              Complaint Status
            </label>
            <select
              className="glass-input block w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              id="filter-status"
              onChange={(event) => setFilter("status", event.target.value as FilterState["status"])}
              value={filters.status}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ").toUpperCase()}</option>)}
            </select>
          </div>
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
              complaints={filteredComplaints}
              onAdvanceStatus={setPendingTransition}
              updatingComplaintId={updatingComplaintId}
              onResetFilters={resetAllFilters}
            />
          )}
        </div>
      </div>

      {/* Pagination Controls - Hidden when 0 records match */}
      {filteredComplaints.length > 0 && (
        <nav aria-label="Complaint pages" className="mt-6 flex items-center justify-between gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Page
          </motion.button>
          <span className="text-xs font-bold text-slate-500">
            Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} complaint{total === 1 ? "" : "s"}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page * PAGE_SIZE >= total || isLoading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next Page
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </nav>
      )}

      {/* Status Transition Confirmation Modal */}
      <AnimatePresence>
        {pendingTransition && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <motion.section
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring" as const, stiffness: 350, damping: 25 }}
              aria-labelledby="transition-title"
              aria-modal="true"
              className="glass-panel w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl"
              role="dialog"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                State Machine Transition
              </div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900" id="transition-title">
                Advance this complaint?
              </h2>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{pendingTransition.title}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <span className="rounded bg-slate-200 px-2.5 py-1 text-slate-700">{pendingTransition.status.replace(/_/g, " ").toUpperCase()}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <span className="rounded bg-emerald-600 px-2.5 py-1 text-white font-bold">{getNextStatus(pendingTransition.status)?.replace(/_/g, " ").toUpperCase()}</span>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
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
