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
    >
      <div className="mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>CIVIC COMPLAINT PORTAL</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Submit a Civic Complaint
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          Provide municipal details below. Complaints are validated client-side and triaged automatically across Groq LLM, Ollama, and Keyword Rule engines.
        </p>
      </div>
      <SubmitForm />
    </motion.section>
  );
}
