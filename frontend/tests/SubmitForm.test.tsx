import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { civicPulseApi } from "../src/api/client";
import { SubmitForm } from "../src/components/SubmitForm";
import { complaintFixture } from "./fixtures";

describe("SubmitForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows client validation errors without making a request", async () => {
    const user = userEvent.setup();
    const createComplaint = vi.spyOn(civicPulseApi, "createComplaint");
    render(<SubmitForm />);

    await user.click(screen.getByRole("button", { name: "Submit complaint" }));

    expect(await screen.findByText("Title must be between 5 and 150 characters.")).toBeInTheDocument();
    expect(screen.getByText("Description must be between 10 and 2,000 characters.")).toBeInTheDocument();
    expect(screen.getByText("Location must be between 3 and 200 characters.")).toBeInTheDocument();
    expect(createComplaint).not.toHaveBeenCalled();
  });

  it("submits a valid report and displays its triage result", async () => {
    const user = userEvent.setup();
    const createComplaint = vi.spyOn(civicPulseApi, "createComplaint").mockResolvedValue(complaintFixture);
    render(<SubmitForm />);

    await user.type(screen.getByLabelText(/title/i), complaintFixture.title);
    await user.type(screen.getByLabelText(/description/i), complaintFixture.description);
    await user.type(screen.getByLabelText(/location/i), complaintFixture.location);
    await user.click(screen.getByRole("button", { name: "Submit complaint" }));

    expect(createComplaint).toHaveBeenCalledWith({
      title: complaintFixture.title,
      description: complaintFixture.description,
      location: complaintFixture.location,
    });
    expect(await screen.findByRole("heading", { name: "Complaint received" })).toBeInTheDocument();
    expect(screen.getByText("simulated_v1")).toBeInTheDocument();
  });
});
