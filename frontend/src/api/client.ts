import { getApiBaseUrl } from "./config";
import type {
  Complaint,
  ComplaintCreateInput,
  ComplaintFilters,
  ComplaintStats,
  ProvidersMeta,
  StatusUpdateInput,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: unknown,
    public readonly retryAfter?: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
    return detail.message;
  }

  return `The request could not be completed (HTTP ${status}).`;
}

function buildUrl(path: string, searchParams?: URLSearchParams): string {
  const query = searchParams?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError("Unable to reach CivicPulse. Check your connection and try again.", 0, null);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: unknown } | null;
    const detail = body?.detail ?? body;
    throw new ApiError(getErrorMessage(detail, response.status), response.status, detail, response.headers.get("Retry-After"));
  }

  return response.json() as Promise<T>;
}

export const civicPulseApi = {
  createComplaint(input: ComplaintCreateInput): Promise<Complaint> {
    return request<Complaint>("/complaints", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listComplaints(filters: ComplaintFilters = {}): Promise<Complaint[]> {
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
    return request<Complaint[]>(`/complaints${searchParams.size ? `?${searchParams.toString()}` : ""}`);
  },

  updateComplaintStatus(complaintId: string, input: StatusUpdateInput): Promise<Complaint> {
    return request<Complaint>(`/complaints/${complaintId}/status`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async getStats(): Promise<{ data: ComplaintStats; cacheStatus: string | null }> {
    const response = await fetch(buildUrl("/stats"));
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: unknown } | null;
      const detail = body?.detail ?? body;
      throw new ApiError(getErrorMessage(detail, response.status), response.status, detail, response.headers.get("Retry-After"));
    }
    return {
      data: await response.json() as ComplaintStats,
      cacheStatus: response.headers.get("X-Cache"),
    };
  },

  getProviders(): Promise<ProvidersMeta> {
    return request<ProvidersMeta>("/meta/providers");
  },
};
