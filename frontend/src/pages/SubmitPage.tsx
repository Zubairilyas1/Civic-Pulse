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
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>MUNICIPAL OPERATIONS PROTOCOL</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Submit a Civic Complaint
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">
          Describe the infrastructure, safety, or municipal issue. Our multi-tiered AI triage engine auto-classifies priority and routes it directly to municipal teams.
        </p>
      </div>
      <SubmitForm />
    </motion.section>
  );
}
