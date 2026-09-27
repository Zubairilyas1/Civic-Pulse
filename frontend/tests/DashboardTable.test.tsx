import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardTable } from "../src/components/DashboardTable";
import { complaintFixture } from "./fixtures";

describe("DashboardTable", () => {
  it("renders a complaint and its operational badges", () => {
    render(<DashboardTable complaints={[complaintFixture]} onAdvanceStatus={vi.fn()} updatingComplaintId={null} />);

    expect(screen.getByText(complaintFixture.title)).toBeInTheDocument();
    expect(screen.getByText(complaintFixture.location)).toBeInTheDocument();
    expect(screen.getByText("WATER")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("TRIAGED")).toBeInTheDocument();
  });

  it("requests an advance action for a non-terminal complaint", async () => {
    const user = userEvent.setup();
    const onAdvanceStatus = vi.fn();
    render(<DashboardTable complaints={[complaintFixture]} onAdvanceStatus={onAdvanceStatus} updatingComplaintId={null} />);

    await user.click(screen.getByRole("button", { name: "Advance to IN PROGRESS" }));

    expect(onAdvanceStatus).toHaveBeenCalledWith(complaintFixture);
  });
});
