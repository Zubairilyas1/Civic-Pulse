import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsCards } from "../src/components/StatsCards";

describe("StatsCards", () => {
  it("renders aggregates and an emerald cache-hit badge", () => {
    render(
      <StatsCards
        cacheStatus="HIT"
        stats={{
          total_complaints: 12,
          by_status: { SUBMITTED: 2, TRIAGED: 3, IN_PROGRESS: 1, RESOLVED: 6 },
          by_category: { WATER: 5, ROADS: 7 },
          by_priority: { HIGH: 4, MEDIUM: 8 },
        }}
      />,
    );

    const totalCard = screen.getByText("Total complaints").closest("article");
    const openCard = screen.getByText("Open complaints").closest("article");
    const resolvedCard = screen.getByText("Resolved").closest("article");

    expect(totalCard).toHaveTextContent("12");
    expect(openCard).toHaveTextContent("6");
    expect(resolvedCard).toHaveTextContent("6");
    expect(screen.getByText("HIT")).toHaveClass("bg-emerald-950");
  });
});
