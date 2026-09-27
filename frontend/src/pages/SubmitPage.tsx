import { SubmitForm } from "../components/SubmitForm";

export function SubmitPage() {
  return (
    <section>
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold text-indigo-300">New civic report</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Submit a complaint</h1>
        <p className="mt-3 leading-6 text-slate-300">
          Give the municipal team enough detail to assess the issue and route it to the right service.
        </p>
      </div>
      <SubmitForm />
    </section>
  );
}
