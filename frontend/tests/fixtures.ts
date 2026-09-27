import type { Complaint } from "../src/api/types";

export const complaintFixture: Complaint = {
  id: "complaint-001",
  title: "Broken water pipeline near the market",
  description: "A water pipeline has been leaking continuously near the central market since this morning.",
  location: "Sector G-10 Markaz, Islamabad",
  status: "TRIAGED",
  category: "WATER",
  priority: "HIGH",
  summary: "A water leak requires municipal maintenance.",
  triaged_by: "simulated_v1",
  created_at: "2026-09-26T12:00:00Z",
  updated_at: "2026-09-26T12:00:00Z",
};
