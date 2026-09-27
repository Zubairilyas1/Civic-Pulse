import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { civicPulseApi } from "../src/api/client";
import { getNextStatus } from "../src/api/status";
import { DashboardPage } from "../src/pages/DashboardPage";
import { complaintFixture } from "./fixtures";

describe("Dashboard status transition", () => {
  afterEach(() => vi.restoreAllMocks());

  it("confirms and sends the next valid status to the API", async () => {
    const user = userEvent.setup();
    vi.spyOn(civicPulseApi, "listComplaints").mockResolvedValue([complaintFixture]);
    const updatedComplaint = { ...complaintFixture, status: "IN_PROGRESS" as const };
    const updateStatus = vi.spyOn(civicPulseApi, "updateComplaintStatus").mockResolvedValue(updatedComplaint);

    render(<DashboardPage />);
    await screen.findByText(complaintFixture.title);
    await user.click(screen.getByRole("button", { name: "Advance to IN PROGRESS" }));
    expect(screen.getByRole("dialog", { name: "Advance this complaint?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm update" }));

    expect(updateStatus).toHaveBeenCalledWith(complaintFixture.id, { status: "IN_PROGRESS" });
    expect(await screen.findByText("Status updated to IN PROGRESS.")).toBeInTheDocument();
  });

  it("does not advance terminal complaint states", () => {
    expect(getNextStatus("RESOLVED")).toBeNull();
    expect(getNextStatus("REJECTED")).toBeNull();
  });
});
