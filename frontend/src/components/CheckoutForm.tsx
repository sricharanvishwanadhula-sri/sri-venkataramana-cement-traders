import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, ShieldCheck, Store, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label, Textarea } from "./checkout-ui";
import { apiGet, apiPost, formatApiError, formatINR } from "../lib/api";
import type { CartQuoteResponse, CheckoutCapabilities, CheckoutItem, CurrentDraftResponse, DraftInput, DraftResponse } from "../lib/checkout-types";

export default function CheckoutForm({ items, prefix }: { items: CheckoutItem[]; prefix: string }) {
  const status = useQuery({ queryKey: ["checkout-status"], queryFn: () => apiGet<CheckoutCapabilities>("/api/checkout/status"), retry: false });
  const current = useQuery({ queryKey: ["checkout-current"], queryFn: () => apiGet<CurrentDraftResponse>("/api/checkout/drafts/current"), staleTime: 0, retry: false });
  const quote = useQuery({ queryKey: ["checkout-quote", items], queryFn: () => apiPost<CartQuoteResponse>("/api/cart/quote", { items, advance_percent: 100 }), enabled: items.length > 0, staleTime: 0, retry: false });
  return <div className="space-y-4 secure-checkout" data-testid={`${prefix}-flow`}>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4" data-testid={`${prefix}-locked-notice`}>
      <div className="flex gap-2 font-bold text-amber-900"><LockKeyhole size={18} aria-hidden="true" /> Online payments are currently locked</div>
      <p className="mt-2 text-xs leading-relaxed text-amber-900">{status.data?.message ?? "Payment remains locked until official WhatsApp and PhonePe setup is available."}</p>
      {status.isError && <p className="mt-2 text-xs" data-testid={`${prefix}-status-error`}>We could not check service availability. Payment stays blocked.</p>}
    </div>
    <div className="flex items-start gap-3 text-sm rounded-lg bg-slate-100 p-3" data-testid={`${prefix}-pickup-rule`}><Store className="text-amber-700 shrink-0" size={19} aria-hidden="true" /><div><strong>Shop pickup only · No delivery</strong><p className="text-xs text-slate-600 mt-1">Full payment in one transaction after WhatsApp verification. No advance or balance instalments.</p></div></div>
    {quote.isFetching && items.length > 0 && <p className="text-sm text-slate-500" data-testid={`${prefix}-quote-loading`}>Checking current prices and stock…</p>}
    {quote.isError && <p role="alert" className="text-sm text-red-700" data-testid={`${prefix}-quote-error`}>{formatApiError(quote.error)}</p>}
    {quote.data && <div className="rounded-lg border p-4 space-y-2 text-sm" data-testid={`${prefix}-totals`}>
      <div className="flex justify-between" data-testid={`${prefix}-subtotal`}><span>Materials</span><span>{formatINR(quote.data.subtotal_ex_gst)}</span></div>
      <div className="flex justify-between" data-testid={`${prefix}-hamali`}><span>Loading / hamali</span><span>{formatINR(quote.data.hamali_total)}</span></div>
      <div className="flex justify-between" data-testid={`${prefix}-gst`}><span>GST</span><span>{formatINR(quote.data.gst_total)}</span></div>
      <div className="flex justify-between border-t pt-3 font-bold text-lg" data-testid={`${prefix}-total`}><span>Full order total</span><span className="text-amber-700">{formatINR(quote.data.total_amount)}</span></div>
      <p className="text-xs text-slate-500" data-testid={`${prefix}-quote-note`}>Quote only. No money collected or stock reserved. Confirm any negotiated price with the shop before paying.</p>
      {quote.data.insufficient.length > 0 && <p className="text-red-700 text-xs" data-testid={`${prefix}-stock-error`}>Not enough stock: {quote.data.insufficient.map(row => `${row.product_title} (${row.available} available)`).join(", ")}</p>}
    </div>}
    {current.isPending ? <p data-testid={`${prefix}-draft-loading`}>Loading your checkout…</p> : current.isError ? <div data-testid={`${prefix}-draft-error`} className="text-sm text-red-700">Unable to load checkout. <Button variant="outline" onClick={() => void current.refetch()} data-testid={`${prefix}-draft-retry`}>Try again</Button></div> : <CheckoutDetails key={current.data.draft?.id ?? "new"} initial={current.data.draft} items={items} prefix={prefix} quote={quote.data} quoteBusy={quote.isFetching} />}
  </div>;
}

function CheckoutDetails({ initial, items, prefix, quote, quoteBusy }: { initial: DraftResponse | null; items: CheckoutItem[]; prefix: string; quote?: CartQuoteResponse; quoteBusy: boolean }) {
  const client = useQueryClient();
  const [name, setName] = useState(initial?.customer_name ?? "");
  const [phone, setPhone] = useState(initial?.customer_phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [consent, setConsent] = useState(initial?.whatsapp_consent ?? false);
  const [saved, setSaved] = useState(initial);
  const [edited, setEdited] = useState(false);
  const validPhone = /^(?:\+?91)?[6-9]\d{9}$/.test(phone.replace(/[\s()\-]/g, ""));
  const save = useMutation({ mutationFn: (payload: DraftInput) => apiPost<DraftResponse>("/api/checkout/drafts", payload), onSuccess: data => {
    setSaved(data); setEdited(false);
    client.setQueryData<CurrentDraftResponse>(["checkout-current"], { draft: data });
    void client.invalidateQueries({ queryKey: ["checkout-current"] });
    void client.invalidateQueries({ queryKey: ["admin-commerce"] });
    toast.success("Draft saved. No payment taken and no order placed.");
  }, onError: error => toast.error(formatApiError(error)) });
  const valid = name.trim().length >= 2 && validPhone && consent && items.length > 0 && !!quote && quote.insufficient.length === 0 && quote.total_amount > 0 && !quoteBusy;
  return <form className="space-y-5" data-testid={`${prefix}-form`} onSubmit={event => { event.preventDefault(); if (valid) save.mutate({ customer_name: name.trim(), customer_phone: phone, notes, whatsapp_consent: true, items, advance_percent: 100, fulfillment: "shop_pickup" }); }}>
    <section className="space-y-3" data-testid={`${prefix}-contact-step`}>
      <h3 className="font-heading font-bold" data-testid={`${prefix}-contact-heading`}>1. Your pickup details</h3>
      <div><Label htmlFor={`${prefix}-name`} data-testid={`${prefix}-name-label`}>Full name</Label><Input id={`${prefix}-name`} value={name} onChange={e => { setName(e.target.value); setEdited(true); }} autoComplete="name" required minLength={2} maxLength={100} data-testid={`${prefix}-name`} /></div>
      <div><Label htmlFor={`${prefix}-phone`} data-testid={`${prefix}-phone-label`}>WhatsApp mobile number</Label><Input id={`${prefix}-phone`} value={phone} onChange={e => { setPhone(e.target.value); setEdited(true); }} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="+91 98765 43210" aria-describedby={`${prefix}-phone-help`} data-testid={`${prefix}-phone`} /><p id={`${prefix}-phone-help`} className="text-xs text-slate-500 mt-1" data-testid={`${prefix}-phone-help`}>Use an Indian number you can access on WhatsApp. Changing it requires fresh verification.</p>{phone && !validPhone && <p className="text-xs text-red-700 mt-1" data-testid={`${prefix}-phone-invalid`}>Enter a valid 10-digit Indian mobile number, optionally with +91.</p>}</div>
      <div><Label htmlFor={`${prefix}-notes`} data-testid={`${prefix}-notes-label`}>Pickup notes (optional)</Label><Textarea id={`${prefix}-notes`} rows={2} value={notes} maxLength={1000} onChange={e => { setNotes(e.target.value); setEdited(true); }} data-testid={`${prefix}-notes`} /></div>
      <label className="flex gap-3 items-start text-xs leading-relaxed text-slate-600" data-testid={`${prefix}-consent-label`}><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setEdited(true); }} className="mt-1 accent-amber-700" data-testid={`${prefix}-consent`} /><span>I agree to receive a verification code and order/invoice updates from Sri Venkataramana Cement Traders on this WhatsApp number. No marketing consent is required.</span></label>
      <Button type="submit" variant="outline" className="w-full font-semibold" disabled={!valid || save.isPending} data-testid={`${prefix}-save-draft`}>{save.isPending ? "Saving draft…" : "Save checkout draft"}</Button>
      {saved && <div className="bg-slate-50 rounded p-3 text-xs text-slate-600" role="status" data-testid={`${prefix}-draft-saved`}><strong>{saved.reference}</strong> · {edited ? "Details changed—save again. WhatsApp remains unverified." : "Draft saved—not an order. No OTP sent and no money taken."}<p className="mt-1">Drafts expire after 24 hours. Your materials are not reserved.</p></div>}
    </section>
    <section className="border-t pt-4 space-y-3" data-testid={`${prefix}-otp-step`}>
      <h3 className="flex gap-2 items-center font-heading font-bold" data-testid={`${prefix}-otp-heading`}><MessageCircle size={17} aria-hidden="true" />2. Verify WhatsApp</h3>
      <p className="text-xs text-slate-500" data-testid={`${prefix}-otp-notice`}>Official WhatsApp OTP service is not connected. There is no test code or verification bypass.</p>
      <Button type="button" variant="outline" disabled className="w-full" data-testid={`${prefix}-send-otp`}>Send WhatsApp OTP · setup pending</Button>
      <Label htmlFor={`${prefix}-otp`} data-testid={`${prefix}-otp-label`}>6-digit WhatsApp verification code</Label>
      <div className="flex gap-2"><Input id={`${prefix}-otp`} disabled placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" data-testid={`${prefix}-otp`} /><Button type="button" disabled variant="outline" data-testid={`${prefix}-verify-otp`}>Verify</Button></div>
    </section>
    <section className="border-t pt-4 space-y-3" data-testid={`${prefix}-payment-step`}>
      <h3 className="font-heading font-bold" data-testid={`${prefix}-payment-heading`}>3. Full payment</h3>
      <Button type="button" disabled className="w-full h-12 bg-slate-800 text-white" data-testid={`${prefix}-pay`}><LockKeyhole className="mr-2" size={17} aria-hidden="true" />Payment locked{quote ? ` · ${formatINR(quote.total_amount)}` : ""}</Button>
      <p className="text-xs text-slate-500 flex gap-2" data-testid={`${prefix}-server-gate`}><ShieldCheck size={16} className="shrink-0" aria-hidden="true" />Both the website and server block payment. Never share your UPI PIN or bank OTP here.</p>
      <p className="text-xs text-slate-500 flex gap-2" data-testid={`${prefix}-invoice-notice`}><FileText size={16} className="shrink-0" aria-hidden="true" />Automatic WhatsApp invoices will be available after provider activation and verified full payment.</p>
    </section>
  </form>;
}