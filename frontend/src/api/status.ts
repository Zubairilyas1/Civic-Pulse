import type { ComplaintStatus } from "./types";

export function getNextStatus(status: ComplaintStatus): ComplaintStatus | null {
  const nextStatuses: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
    SUBMITTED: "TRIAGED",
    TRIAGED: "IN_PROGRESS",
    IN_PROGRESS: "RESOLVED",
  };
  return nextStatuses[status] || null;
}
