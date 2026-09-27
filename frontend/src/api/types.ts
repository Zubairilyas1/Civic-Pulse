export const CATEGORIES = ["WATER", "ROADS", "ELECTRICITY", "WASTE", "SANITATION", "OTHER"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const STATUSES = ["SUBMITTED", "TRIAGED", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const;

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
  status: ComplaintStatus;
  category: Category | null;
  priority: Priority | null;
  summary: string | null;
  triaged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintFilters {
  category?: Category;
  priority?: Priority;
  status?: ComplaintStatus;
  skip?: number;
  limit?: number;
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

export interface ProvidersMeta {
  active_provider: string;
  available_providers: ProviderInfo[];
}
