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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 sm:p-8"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="mb-6 border-b border-white/10 pb-5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            Issue Details
          </h2>
          <p className="mt-1 text-xs text-slate-400">All information is validated client-side and checked for PII before AI triage dispatch.</p>
        </div>

        <div className="space-y-6">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="complaint-title">
              Complaint Title
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <FileText className="h-4 w-4" />
              </div>
              <input
                aria-describedby={errors.title ? "title-error" : "title-help"}
                aria-invalid={Boolean(errors.title)}
                className="glass-input block w-full rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                id="complaint-title"
                maxLength={150}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="e.g. Water main pipeline leaking near sector market"
                value={values.title}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500" id="title-help">5–150 characters</span>
              <span className={`font-mono text-[11px] ${values.title.length > 140 ? "text-amber-400" : "text-slate-500"}`}>
                {values.title.length}/150
              </span>
            </div>
            {errors.title && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-400" id="title-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.title}
              </motion.span>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="complaint-description">
              Detailed Description
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute top-3.5 left-0 flex items-center pl-3.5 text-slate-500">
                <AlignLeft className="h-4 w-4" />
              </div>
              <textarea
                aria-describedby={errors.description ? "description-error" : "description-help"}
                aria-invalid={Boolean(errors.description)}
                className="glass-input block min-h-36 w-full resize-y rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                id="complaint-description"
                maxLength={2000}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Provide exact details of the damage, duration, and potential safety risks to residents..."
                value={values.description}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500" id="description-help">10–2,000 characters</span>
              <span className={`font-mono text-[11px] ${values.description.length > 1900 ? "text-amber-400" : "text-slate-500"}`}>
                {values.description.length}/2000
              </span>
            </div>
            {errors.description && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-400" id="description-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.description}
              </motion.span>
            )}
          </div>

          {/* Location Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="complaint-location">
              Location / Area Address
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <MapPin className="h-4 w-4" />
              </div>
              <input
                aria-describedby={errors.location ? "location-error" : "location-help"}
                aria-invalid={Boolean(errors.location)}
                className="glass-input block w-full rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                id="complaint-location"
                maxLength={200}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="e.g. Street 14, Sector G-10/2, Islamabad"
                value={values.location}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500" id="location-help">3–200 characters</span>
              <span className="font-mono text-[11px] text-slate-500">{values.location.length}/200</span>
            </div>
            {errors.location && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-400" id="location-error">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.location}
              </motion.span>
            )}
          </div>
        </div>

        {submissionError && <div className="mt-6"><Alert tone="error">{submissionError}</Alert></div>}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Submit complaint"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* AI Triage Result Panel */}
      <aside aria-live="polite" className="glass-panel flex flex-col justify-between rounded-2xl p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Triage Output Engine
            </span>
            <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/10">
              Live Pipeline
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isSubmitting ? (
              <motion.div
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-label="Triage in progress"
                aria-busy="true"
                className="mt-6 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  <span className="text-sm font-medium text-slate-300">Analyzing report text & category…</span>
                </div>
                <div className="h-5 w-2/5 animate-pulse rounded bg-slate-700/50" />
                <div className="h-20 w-full animate-pulse rounded-xl bg-slate-800/60" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-slate-800/60" />
              </motion.div>
            ) : createdComplaint ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="mt-6 space-y-5"
              >
                  <div>
                    <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Complaint received
                    </h2>
                    <p className="mt-1 text-xs text-emerald-200/80 font-mono">Reference: {createdComplaint.id}</p>
                  </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-400">Classified Badges</span>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={createdComplaint.status} />
                    <StatusBadge value={createdComplaint.category} />
                    <StatusBadge value={createdComplaint.priority} />
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Generated Summary</span>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      {createdComplaint.summary || "Triage completed."}
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Triaged By Provider:</span>
                    <span className="font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {createdComplaint.triaged_by || "Rules Engine"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/30 p-5 text-center">
                  <ShieldCheck className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-3 text-xs font-medium leading-relaxed text-slate-400">
                    Submit your report to trigger automated classification across Groq LLM, Ollama, or Keyword Rule engines.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-[11px] text-slate-500 flex items-center justify-between">
          <span>PII Masking Guardrails Enabled</span>
          <span className="text-indigo-400">SHA-256 Encrypted</span>
        </div>
      </aside>
    </div>
  );
}
