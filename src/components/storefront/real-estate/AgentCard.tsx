"use client";

import { Mail, Phone } from "lucide-react";

export function AgentCard({
  name,
  role,
  details,
  phone,
  email,
}: {
  name: string;
  role: string;
  details: string;
  phone?: string;
  email?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#dce8dd] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ecf7ee] text-lg font-semibold text-[#1f9b46] dark:bg-secondary/50">
        {name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}
      </div>
      <p className="text-lg font-semibold text-slate-950 dark:text-foreground">{name}</p>
      <p className="mt-1 text-sm font-medium text-[#1f9b46]">{role}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{details}</p>
      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-muted-foreground">
        {phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#1f9b46]" /> {phone}</p> : null}
        {email ? <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#1f9b46]" /> {email}</p> : null}
      </div>
    </div>
  );
}
