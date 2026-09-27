import { useState, type FormEvent } from "react";
import { ApiError, civicPulseApi } from "../api/client";
import type { Complaint, ComplaintCreateInput } from "../api/types";
import { Alert } from "./Feedback";
import { StatusBadge } from "./StatusBadge";

type FormErrors = Partial<Record<keyof ComplaintCreateInput, string>>;

const initialValues: ComplaintCreateInput = {
  title: "",
  description: "",
  location: "",
};

function validate(values: ComplaintCreateInput): FormErrors {
  const errors: FormErrors = {};
  if (values.title.length < 5 || values.title.length > 150) {
    errors.title = "Title must be between 5 and 150 characters.";
  }
  if (values.description.length < 10 || values.description.length > 2000) {
    errors.description = "Description must be between 10 and 2,000 characters.";
  }
  if (values.location.length < 3 || values.location.length > 200) {
    errors.location = "Location must be between 3 and 200 characters.";
  }
  return errors;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    const retryMessage = error.retryAfter ? ` Try again in ${error.retryAfter} seconds.` : " Please wait before trying again.";
    return `CivicPulse is receiving too many requests.${retryMessage}`;
  }
  return error instanceof Error ? error.message : "Unable to submit the complaint. Please try again.";
}

export function SubmitForm() {
  const [values, setValues] = useState<ComplaintCreateInput>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof ComplaintCreateInput, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedValues = {
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.location.trim(),
    };
    const nextErrors = validate(normalizedValues);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setCreatedComplaint(null);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setCreatedComplaint(null);

    try {
      const complaint = await civicPulseApi.createComplaint(normalizedValues);
      setCreatedComplaint(complaint);
      setValues(initialValues);
    } catch (error) {
      setSubmissionError(messageFor(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
      <form className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Describe the issue</h2>
          <p className="mt-1 text-sm text-slate-400">Required fields are validated before the complaint is sent for triage.</p>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-medium text-slate-200" htmlFor="complaint-title">
            Title
            <input
              aria-describedby={errors.title ? "title-error" : "title-help"}
              aria-invalid={Boolean(errors.title)}
              className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              id="complaint-title"
              maxLength={150}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g. Water pipeline leak near the market"
              value={values.title}
            />
            <span className="mt-1 block text-xs text-slate-500" id="title-help">5–150 characters</span>
            {errors.title && <span className="mt-1 block text-xs text-rose-300" id="title-error">{errors.title}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-200" htmlFor="complaint-description">
            Description
            <textarea
              aria-describedby={errors.description ? "description-error" : "description-help"}
              aria-invalid={Boolean(errors.description)}
              className="mt-2 block min-h-36 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              id="complaint-description"
              maxLength={2000}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Include what happened, how long it has been happening, and any immediate safety risk."
              value={values.description}
            />
            <span className="mt-1 block text-xs text-slate-500" id="description-help">10–2,000 characters</span>
            {errors.description && <span className="mt-1 block text-xs text-rose-300" id="description-error">{errors.description}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-200" htmlFor="complaint-location">
            Location
            <input
              aria-describedby={errors.location ? "location-error" : "location-help"}
              aria-invalid={Boolean(errors.location)}
              className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              id="complaint-location"
              maxLength={200}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="e.g. Sector G-10 Markaz, Islamabad"
              value={values.location}
            />
            <span className="mt-1 block text-xs text-slate-500" id="location-help">3–200 characters</span>
            {errors.location && <span className="mt-1 block text-xs text-rose-300" id="location-error">{errors.location}</span>}
          </label>
        </div>

        {submissionError && <div className="mt-5"><Alert tone="error">{submissionError}</Alert></div>}

        <button
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Triaging complaint…" : "Submit complaint"}
        </button>
      </form>

      <aside aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-indigo-300">Triage result</p>
        {isSubmitting ? (
          <div className="mt-5 space-y-3" aria-label="Triage in progress" aria-busy="true">
            <div className="h-5 w-2/5 animate-pulse rounded bg-slate-700/60" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-800" />
            <div className="h-14 w-full animate-pulse rounded bg-slate-800" />
          </div>
        ) : createdComplaint ? (
          <div className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Complaint received</h2>
              <p className="mt-1 text-sm text-slate-400">Reference: {createdComplaint.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={createdComplaint.status} />
              <StatusBadge value={createdComplaint.category} />
              <StatusBadge value={createdComplaint.priority} />
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">AI summary</dt>
                <dd className="mt-1 leading-6 text-slate-200">{createdComplaint.summary || "Triage is pending."}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Triaged by</dt>
                <dd className="mt-1 font-medium text-slate-200">{createdComplaint.triaged_by || "Not yet assigned"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Submitted complaints are classified by the configured triage provider. The result appears here when the request completes.
          </p>
        )}
      </aside>
    </div>
  );
}
