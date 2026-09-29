// Contract value sets (§2.3): lowercase on the wire, rendered uppercase in the UI.
export const CATEGORIES = ["water", "roads", "electricity", "streetlights", "sanitation", "other"] as const;
export const PRIORITIES = ["low", "normal", "high"] as const;
export const STATUSES = ["open", "in_progress", "resolved", "rejected"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ComplaintStatus = (typeof STATUSES)[number];

export interface ComplaintCreateInput {
  title: string;
  description: string;
  location: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  location: string;
  reporter_contact?: string | null;
  status: ComplaintStatus;
  category: Category | null;
  priority: Priority | null;
  summary: string | null;
  triaged_by: string | null;
  triage_latency_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintFilters {
  category?: Category;
  priority?: Priority;
  status?: ComplaintStatus;
  page?: number;
  page_size?: number;
}

export interface ComplaintListResponse {
  items: Complaint[];
  total: number;
  page: number;
  page_size: number;
}

export interface StatusUpdateInput {
  status: ComplaintStatus;
  notes?: string;
}

export interface ComplaintStats {
  total_complaints: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface ProviderInfo {
  name: string;
  enabled: boolean;
  description: string;
}

export interface TriageOutcome {
  complaint_id: string;
  provider: string;
  latency_ms: number;
  fallback: boolean;
  error_class?: string | null;
  timestamp: string;
}

export interface ProvidersMeta {
  active_provider: string;
  available_providers: ProviderInfo[];
  recent_outcomes?: TriageOutcome[];
}
