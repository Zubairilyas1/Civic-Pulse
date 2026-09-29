import type { Complaint } from "../src/api/types";

export const complaintFixture: Complaint = {
  id: "complaint-001",
  title: "Broken water pipeline near the market",
  description: "A water pipeline has been leaking continuously near the central market since this morning.",
  location: "Sector G-10 Markaz, Islamabad",
  status: "open",
  category: "water",
  priority: "high",
  summary: "A water leak requires municipal maintenance.",
  triaged_by: "simulated",
  created_at: "2026-09-26T12:00:00Z",
  updated_at: "2026-09-26T12:00:00Z",
};
