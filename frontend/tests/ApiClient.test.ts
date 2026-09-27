import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, civicPulseApi } from "../src/api/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("civicPulseApi", () => {
  it("turns an HTML response into a useful API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html><html></html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })));

    await expect(civicPulseApi.listComplaints()).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: "CivicPulse returned an invalid response. Please try again.",
        status: 200,
      }),
    );
  });
});
