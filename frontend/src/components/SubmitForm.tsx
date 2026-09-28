import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, AlignLeft, MapPin, Send, Sparkles, CheckCircle2, ShieldCheck, AlertCircle, Cpu, Zap, Lock } from "lucide-react";
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

function detectDraftCategory(title: string, description: string): { label: string; tone: string } {
  const combined = `${title} ${description}`.toLowerCase();
  if (/\b(water|leak|pipeline|drain|sewage|tap|overflow)\b/.test(combined)) {
    return { label: "WATER", tone: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  }
  if (/\b(road|pothole|street|asphalt|traffic|footpath|sidewalk)\b/.test(combined)) {
    return { label: "ROADS", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (/\b(power|electricity|wire|cable|transformer|outage|blackout|spark)\b/.test(combined)) {
    return { label: "ELECTRICITY", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  if (/\b(garbage|trash|waste|dump|litter|bin)\b/.test(combined)) {
    return { label: "WASTE", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (/\b(sanitation|sewer|stink|smell|filth|mosquito|contamination)\b/.test(combined)) {
    return { label: "SANITATION", tone: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { label: "OTHER", tone: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function SubmitForm() {
  const [values, setValues] = useState<ComplaintCreateInput>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDraftContent = values.title.trim().length > 0 || values.description.trim().length > 0 || values.location.trim().length > 0;
  const draftCategory = detectDraftCategory(values.title, values.description);
  const isFormValid = values.title.trim().length >= 5 && values.description.trim().length >= 10 && values.location.trim().length >= 3;

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] items-stretch">
      {/* Left Form Card */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full"
        noValidate
        onSubmit={handleSubmit}
      >
        <div>
          <div className="mb-4 border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                  <FileText className="h-4 w-4" />
                </div>
                Issue Details
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                Provide complete detail so the municipal team can triage and resolve the issue quickly.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Real-Time Validation
            </span>
          </div>

          <div className="space-y-4">
            {/* Title Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="complaint-title">
                Complaint Title
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <FileText className="h-4 w-4" />
                </div>
                <input
                  aria-describedby={errors.title ? "title-error" : "title-help"}
                  aria-invalid={Boolean(errors.title)}
                  className="glass-input block w-full rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  id="complaint-title"
                  maxLength={150}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="e.g. Water main pipeline leaking near sector market"
                  value={values.title}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium text-[11px]" id="title-help">5–150 characters</span>
                <span className={`font-mono text-[11px] font-semibold ${values.title.length > 140 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                  {values.title.length}/150
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
              <label className="block text-xs font-semibold text-slate-700" htmlFor="complaint-description">
                Detailed Description
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute top-3 left-0 flex items-center pl-3.5 text-slate-400">
                  <AlignLeft className="h-4 w-4" />
                </div>
                <textarea
                  aria-describedby={errors.description ? "description-error" : "description-help"}
                  aria-invalid={Boolean(errors.description)}
                  className="glass-input block min-h-24 sm:min-h-28 w-full resize-y rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  id="complaint-description"
                  maxLength={2000}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Include what happened, how long it has been happening, and any immediate safety risk..."
                  value={values.description}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium text-[11px]" id="description-help">10–2,000 characters</span>
                <span className={`font-mono text-[11px] font-semibold ${values.description.length > 1900 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
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
              <label className="block text-xs font-semibold text-slate-700" htmlFor="complaint-location">
                Location / Area Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  aria-describedby={errors.location ? "location-error" : "location-help"}
                  aria-invalid={Boolean(errors.location)}
                  className="glass-input block w-full rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  id="complaint-location"
                  maxLength={200}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="e.g. Street 14, Sector G-10/2, Islamabad"
                  value={values.location}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium text-[11px]" id="location-help">3–200 characters</span>
                <span className="font-mono text-[11px] text-slate-400 font-semibold">{values.location.length}/200</span>
              </div>
              {errors.location && (
                <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600" id="location-error">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.location}
                </motion.span>
              )}
            </div>
          </div>
        </div>

        <div>
          {submissionError && <div className="mt-4"><Alert tone="error">{submissionError}</Alert></div>}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Submit complaint"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      </motion.form>

      {/* Right AI Triage Output & Engine Panel */}
      <aside aria-live="polite" className="glass-panel flex flex-col justify-between rounded-2xl p-5 sm:p-6 space-y-5 h-full">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              {hasDraftContent && !createdComplaint ? "Live Complaint Draft" : "Triage Output Engine"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {hasDraftContent && !createdComplaint ? "Draft Mode" : "Live Pipeline"}
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
                className="mt-4 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  <span className="text-sm font-semibold text-slate-700">Analyzing complaint text…</span>
                </div>
                <div className="h-5 w-2/5 animate-pulse rounded bg-slate-200" />
                <div className="h-20 w-full animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
              </motion.div>
            ) : createdComplaint ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                className="mt-4 space-y-4"
              >
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-2xs">
                  <h2 className="text-base font-extrabold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Complaint received
                  </h2>
                  <p className="mt-1 text-xs text-emerald-700 font-mono font-bold">Reference ID: {createdComplaint.id}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Classified Badges</span>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={createdComplaint.status} />
                    <StatusBadge value={createdComplaint.category} />
                    <StatusBadge value={createdComplaint.priority} />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">AI Generated Summary</span>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-900">
                      {createdComplaint.summary || "Triage completed."}
                    </p>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Triaged By Provider:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200 font-mono">
                      {createdComplaint.triaged_by || "Rules Engine"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : hasDraftContent ? (
              <motion.div key="draft" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complaint Title</span>
                    <h4 className="text-sm font-extrabold text-slate-900 break-words leading-snug">
                      {values.title.trim() || <span className="italic text-slate-400 font-normal">Type a title on the left…</span>}
                    </h4>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location / Address</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{values.location.trim() || <span className="italic text-slate-400 font-normal">Specify location address…</span>}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description Preview</span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3 mt-0.5 break-words">
                      {values.description.trim() || <span className="italic text-slate-400 font-normal">Describe the municipal issue details…</span>}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 text-[11px]">Detected Category:</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${draftCategory.tone}`}>
                      {draftCategory.label} (Pending AI)
                    </span>
                  </div>
                  <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Validation Status:</span>
                    <span className={isFormValid ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                      {isFormValid ? "Ready for AI Triage" : "Completing Required Fields…"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-xs text-center space-y-3">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shadow-2xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Multi-Engine AI Triage Active</h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-600">
                    Complaints are classified in real-time across LLMs & Keyword Rules. Summary, category, and priority badges render here upon submission.
                  </p>
                </div>

                {/* Engine Telemetry Stack */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Engine Provider Fallback Stack</span>
                  
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">Groq LLM (Llama-3.3 70B)</span>
                    </div>
                    <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold font-mono text-[10px] border border-emerald-200">Primary</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-teal-600" />
                      <span className="font-bold text-slate-800">Ollama (Local Fallback)</span>
                    </div>
                    <span className="rounded bg-teal-50 text-teal-700 px-2 py-0.5 font-bold font-mono text-[10px] border border-teal-200">Local</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-800">Deterministic Rule Engine</span>
                    </div>
                    <span className="rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 font-bold font-mono text-[10px] border border-indigo-200">Guardrail</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-slate-200/80 pt-3 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            End-to-End Encrypted &amp; Privacy Protected
          </span>
          <span className="text-emerald-700 font-bold font-mono">100% Secure</span>
        </div>
      </aside>
    </div>
  );
}
