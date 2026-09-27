import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, AlignLeft, MapPin, Send, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
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

  const isTitleValid = values.title.length >= 5 && values.title.length <= 150;

  return (
    <div className="space-y-6">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-slate-900"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="mb-5 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Issue Details
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Provide complete detail so the municipal team can triage and resolve the issue quickly.
          </p>
        </div>

        <div className="space-y-5">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800" htmlFor="complaint-title">
              Complaint Title
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <FileText className="h-4 w-4" />
              </div>
              <input
                aria-describedby={errors.title ? "title-error" : "title-help"}
                aria-invalid={Boolean(errors.title)}
                className="glass-input block w-full rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                id="complaint-title"
                maxLength={150}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="e.g. Water main pipeline leaking near sector market"
                value={values.title}
              />
              {isTitleValid && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium" id="title-help">5–150 characters</span>
              <span className={`font-mono text-[11px] font-bold ${isTitleValid ? "text-emerald-700" : "text-slate-400"}`}>
                {isTitleValid ? "✓ " : ""}{values.title.length}/150
              </span>
            </div>
            {errors.title && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600" id="title-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.title}
              </motion.span>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800" htmlFor="complaint-description">
              Detailed Description
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute top-3.5 left-0 flex items-center pl-3.5 text-slate-400">
                <AlignLeft className="h-4 w-4" />
              </div>
              <textarea
                aria-describedby={errors.description ? "description-error" : "description-help"}
                aria-invalid={Boolean(errors.description)}
                className="glass-input block min-h-32 w-full resize-y rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                id="complaint-description"
                maxLength={2000}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Include what happened, how long it has been happening, and any immediate safety..."
                value={values.description}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium" id="description-help">10–2,000 characters</span>
              <span className={`font-mono text-[11px] ${values.description.length > 1900 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                {values.description.length}/2000
              </span>
            </div>
            {errors.description && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600" id="description-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.description}
              </motion.span>
            )}
          </div>

          {/* Location Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800" htmlFor="complaint-location">
              Location / Area Address
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <MapPin className="h-4 w-4" />
              </div>
              <input
                aria-describedby={errors.location ? "location-error" : "location-help"}
                aria-invalid={Boolean(errors.location)}
                className="glass-input block w-full rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                id="complaint-location"
                maxLength={200}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="e.g. Street 14, Sector G-10/2, Islamabad"
                value={values.location}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium" id="location-help">3–200 characters</span>
              <span className="font-mono text-[11px] text-slate-400">{values.location.length}/200</span>
            </div>
            {errors.location && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600" id="location-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.location}
              </motion.span>
            )}
          </div>
        </div>

        {submissionError && <div className="mt-5"><Alert tone="error">{submissionError}</Alert></div>}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Submit complaint"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/30 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Executing AI Triage Protocol…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit complaint</span>
            </>
          )}
        </motion.button>
      </motion.form>

      {/* Triage Output Live Result Alert */}
      <AnimatePresence mode="wait">
        {createdComplaint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            aria-live="polite"
            className="rounded-2xl border border-emerald-500/40 bg-[#0B1E1F] p-5 shadow-2xl text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#1A383B] pb-3">
              <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Complaint received
              </h2>
              <span className="font-mono text-xs text-emerald-300 font-bold">Ref: {createdComplaint.id.substring(0, 8)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value={createdComplaint.status} />
              <StatusBadge value={createdComplaint.category} />
              <StatusBadge value={createdComplaint.priority} />
            </div>

            <div className="rounded-xl border border-[#183a3d] bg-[#071718] p-3.5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Generated Triage Summary</span>
              <p className="text-xs leading-relaxed text-slate-200">{createdComplaint.summary || "Triage completed."}</p>
              <div className="flex items-center justify-between text-[11px] border-t border-[#183a3d] pt-2">
                <span className="text-slate-400">Triaged By Provider:</span>
                <span className="font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  {createdComplaint.triaged_by || "simulated_v1"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
