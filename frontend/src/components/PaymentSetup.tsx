import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, CheckCircle2, ExternalLink, CircleDashed } from "lucide-react";
import { Button } from "./checkout-ui";
import { apiGet, formatApiError } from "../lib/api";
import type { SetupResponse } from "../lib/checkout-types";

export default function PaymentSetup() {
  const setup = useQuery({ queryKey: ["admin-payment-setup"], queryFn: () => apiGet<SetupResponse>("/api/admin/payment-setup"), retry: false });
  if (setup.isPending) return <p data-testid="payment-setup-loading">Loading activation checklist…</p>;
  if (setup.isError) return <div data-testid="payment-setup-error">{formatApiError(setup.error)}<Button variant="outline" onClick={() => void setup.refetch()} data-testid="payment-setup-retry">Try again</Button></div>;
  return <div className="payment-setup max-w-4xl space-y-5" data-testid="payment-setup-panel">
    <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8" data-testid="payment-setup-status"><p className="uppercase text-xs tracking-widest text-amber-400 font-bold">Protecting your customers comes first</p><h2 className="font-heading text-2xl font-bold mt-3 flex gap-3 items-center"><LockKeyhole className="text-amber-400 shrink-0" />Payments intentionally locked</h2><p className="text-slate-300 text-sm mt-3 leading-relaxed">No live OTPs, payment collection, refunds or automatic WhatsApp invoices are connected. Customers can browse and save nonpayable drafts. Adding credentials alone will not unlock this release.</p></div>
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-900" data-testid="payment-setup-charges">{setup.data.charges_notice}</div>
    <div className="space-y-3">{setup.data.tasks.map((task, index) => <section key={task.id} className="bg-white border rounded-lg p-5 flex gap-4" data-testid={`setup-task-${task.id}`}>
      <div className="pt-1 text-slate-400">{task.state === "ready" ? <CheckCircle2 className="text-green-700" size={22} aria-hidden="true" /> : <CircleDashed size={22} aria-hidden="true" />}</div>
      <div className="flex-1"><div className="flex items-start justify-between gap-3 flex-wrap"><h3 className="font-heading font-bold" data-testid={`setup-task-title-${task.id}`}>{index + 1}. {task.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${task.state === "ready" ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`} data-testid={`setup-task-state-${task.id}`}>{task.state.replace(/_/g, " ")}</span></div><p className="text-sm text-slate-600 mt-2 leading-relaxed" data-testid={`setup-task-description-${task.id}`}>{task.description}</p>{task.url && <a href={task.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-700 hover:text-amber-900" data-testid={`setup-task-link-${task.id}`}>Open official setup <ExternalLink size={13} /></a>}</div>
    </section>)}</div>
    <p className="text-xs text-slate-500 leading-relaxed" data-testid="payment-setup-safety-note">Never share UPI PINs, bank OTPs, payment secrets or Meta access tokens in customer forms. WhatsApp verification proves access to that number—not identity or payment. Bank transfers made outside this website cannot be blocked by its checkout gate.</p>
  </div>;
}