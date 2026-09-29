import type { ComplaintStatus } from "./types";

export function getNextStatus(status: ComplaintStatus): ComplaintStatus | null {
  // Contract transition table (§2.2): open → in_progress → resolved.
  const nextStatuses: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
    open: "in_progress",
    in_progress: "resolved",
  };
  return nextStatuses[status] || null;
}
