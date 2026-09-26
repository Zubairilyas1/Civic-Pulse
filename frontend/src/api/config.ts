declare global {
  interface Window {
    __CIVICPULSE_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

const DEFAULT_API_BASE_URL = "/api";

export function getApiBaseUrl(): string {
  const configuredUrl = window.__CIVICPULSE_CONFIG__?.API_BASE_URL?.trim();
  return (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
