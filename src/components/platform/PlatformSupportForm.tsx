"use client";

import { useState } from "react";

const topics = [
  ["pre_sales", "Pre-sales question"],
  ["billing_subscription", "Billing or subscription"],
  ["account_access", "Account or access"],
  ["privacy_data", "Privacy or data request"],
  ["abuse_security", "Abuse or security report"],
  ["other", "Other platform question"],
] as const;

type FormState = {
  name: string;
  email: string;
  topic: (typeof topics)[number][0];
  message: string;
  website: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  topic: "pre_sales",
  message: "",
  website: "",
};

export function PlatformSupportForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setReferenceId(null);
    try {
      const response = await fetch("/api/platform/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.referenceId) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Could not submit this support request.");
      }
      setReferenceId(String(payload.referenceId));
      setForm(initialForm);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit this support request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Name
          <input required maxLength={100} value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" autoComplete="name" />
        </label>
        <label className="text-sm font-semibold">Email
          <input required type="email" maxLength={255} value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" autoComplete="email" />
        </label>
      </div>

      <label className="block text-sm font-semibold">Topic
        <select value={form.topic} onChange={(event) => update("topic", event.target.value as FormState["topic"])} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal">
          {topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label className="block text-sm font-semibold">Message
        <textarea required minLength={10} maxLength={3000} rows={7} value={form.message} onChange={(event) => update("message", event.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 font-normal" placeholder="Describe the question or issue and include only information needed to investigate it." />
      </label>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label>
      </div>

      <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
        Do not submit passwords, one-time codes, access tokens, API keys, service-role keys, payment credentials, or other secrets. A support request is not a guarantee of a particular response time or outcome.
      </p>

      {error ? <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {referenceId ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">Request recorded. Reference: <strong>{referenceId}</strong>. Keep this reference for follow-up.</p> : null}

      <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {submitting ? "Recording request…" : "Submit platform support request"}
      </button>
    </form>
  );
}
