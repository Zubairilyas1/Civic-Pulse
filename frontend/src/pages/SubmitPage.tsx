import { motion } from "motion/react";
import { SubmitForm } from "../components/SubmitForm";
import { Sparkles } from "lucide-react";

export function SubmitPage() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="pt-1 sm:pt-2"
    >
      <div className="mb-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>CIVIC COMPLAINT PORTAL</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Submit a Civic Complaint
        </h1>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">
          Provide municipal details below. Complaints are validated client-side and triaged automatically across Groq LLM, Ollama, and Keyword Rule engines.
        </p>
      </div>
      <SubmitForm />
    </motion.section>
  );
}
