import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Plus, Minus, MessageCircle, Copy, Store } from "lucide-react";
import { toast } from "sonner";
import api, { formatINR, formatApiError } from "@/lib/api";

const WHATSAPP = "919440828759";

const ADVANCE_OPTIONS = [25, 50, 100];

export default function CartDrawer() {
  const { t } = useLang();
  const nav = useNavigate();
  const { items, updateQty, removeItem, clearCart, open, setOpen } = useCart();
  const [step, setStep] = useState(1); // 1 items+advance, 2 pickup info, 3 payment
  const [advance, setAdvance] = useState(50);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [details, setDetails] = useState({ customer_name: "", customer_phone: "", notes: "" });
  const [upiInfo, setUpiInfo] = useState(null);
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Live cart quote
  useEffect(() => {
    if (!open || items.length === 0) { setQuote(null); return; }
    const payload = {
      items: items.map((i) => ({ product_id: i.product_id, brand_id: i.brand_id, quantity: i.quantity })),
      advance_percent: advance,
    };
    api.post("/cart/quote", payload)
      .then((r) => { setQuote(r.data); setQuoteError(null); })
      .catch((e) => { setQuote(null); setQuoteError(formatApiError(e)); });
  }, [open, items, advance]);

  useEffect(() => {
    if (open && step === 3) {
      const amt = quote?.advance_amount || 0;
      api.get("/upi/active", { params: { amount: amt } }).then((r) => setUpiInfo(r.data)).catch(() => {});
    }
  }, [open, step, quote]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setOrder(null);
        setUpiInfo(null);
      }, 300);
    }
  }, [open]);

  const submitOrder = async () => {
    if (!details.customer_name.trim() || !details.customer_phone.trim()) {
      toast.error(t("name_phone_required"));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: details.customer_name.trim(),
        customer_phone: details.customer_phone.trim(),
        notes: details.notes,
        advance_percent: advance,
        items: items.map((i) => ({ product_id: i.product_id, brand_id: i.brand_id, quantity: i.quantity })),
      };
      const { data } = await api.post("/orders", payload);
      setOrder(data.order);
      setStep(3);
      toast.success(t("order_placed_toast"));
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    if (!order) return;
    const trackLink = `${window.location.origin}/order/${order.order_code}`;
    const linesTxt = order.items.map((it, i) =>
      `${i + 1}. ${it.product_title} (${it.brand_name}) — ${it.quantity} ${it.unit} × ${formatINR(it.unit_price)}`
    ).join("\n");
    const parts = [
      `*Order — ${order.order_code}*`,
      ``,
      `*Customer:* ${order.customer_name}`,
      `*Phone:* ${order.customer_phone}`,
      ``,
      `*Items:*`,
      linesTxt,
      ``,
      `Subtotal: ${formatINR(order.subtotal_ex_gst)}`,
      order.hamali_total > 0 ? `Hamali: ${formatINR(order.hamali_total)}` : null,
      order.gst_total > 0 ? `GST: ${formatINR(order.gst_total)}` : null,
      `*Total: ${formatINR(order.total_amount)}*`,
      `*Advance (${order.advance_percent}%): ${formatINR(order.advance_amount)}*`,
      `Balance at pickup: ${formatINR(order.balance_amount)}`,
      order.assigned_upi_id ? `UPI: ${order.assigned_upi_id}` : null,
      order.notes ? `Notes: ${order.notes}` : null,
      ``,
      `Track: ${trackLink}`,
    ].filter(Boolean);
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(parts.join("\n"))}`, "_blank");
    setTimeout(() => {
      clearCart();
      setOpen(false);
      nav(`/order/${order.order_code}`);
    }, 800);
  };

  const copyUpi = () => {
    if (upiInfo?.active?.upi_id) {
      navigator.clipboard.writeText(upiInfo.active.upi_id);
      toast.success(t("upi_copied"));
    }
  };

  const totalAmount = quote?.total_amount ?? 0;
  const advanceAmount = quote?.advance_amount ?? 0;
  const balanceAmount = quote?.balance_amount ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white"
        data-testid="cart-drawer"
      >
        <VisuallyHidden.Root>
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>Review your items, choose advance percent, and pay via UPI.</SheetDescription>
        </VisuallyHidden.Root>
        <div className="p-4 border-b bg-[#0F172A] text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg uppercase tracking-wide">
              {step === 1 ? t("your_cart") : step === 2 ? t("your_info") : t("complete_payment")}
            </h3>
          </div>
          <div className="flex gap-1 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? "bg-[#D97706]" : "bg-[#334155]"}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 1 && (
            <>
              {items.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="font-heading text-lg font-bold">{t("cart_empty")}</p>
                  <p className="text-sm mt-1">{t("cart_empty_desc")}</p>
                </div>
              ) : (
                <>
                  {items.map((it, idx) => (
                    <div
                      key={it.key || `${it.product_id}::${it.brand_id}`}
                      className="flex gap-3 border-b pb-4"
                      data-testid={`cart-item-${idx}`}
                    >
                      {it.image_url && (
                        <img src={it.image_url} alt={it.product_title} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{it.product_title}</div>
                        <div className="text-xs text-slate-500">{it.brand_name} · {it.unit}</div>
                        <div className="font-mono-price text-[#B45309] font-bold text-sm mt-1">
                          {formatINR(it.unit_price)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(idx, it.quantity - 1)}
                            className="w-7 h-7 border rounded flex items-center justify-center hover:bg-slate-100"
                            data-testid={`cart-dec-${idx}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono-price font-bold w-8 text-center">{it.quantity}</span>
                          <button
                            onClick={() => updateQty(idx, it.quantity + 1)}
                            className="w-7 h-7 border rounded flex items-center justify-center hover:bg-slate-100"
                            data-testid={`cart-inc-${idx}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(idx)}
                            className="ml-auto text-red-600 hover:bg-red-50 w-7 h-7 rounded flex items-center justify-center"
                            data-testid={`cart-remove-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Live quote breakdown */}
                  {quote && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1" data-testid="cart-breakdown">
                      <Row label={t("subtotal")} value={formatINR(quote.subtotal_ex_gst)} />
                      {quote.hamali_total > 0 && <Row label={t("hamali_line")} value={formatINR(quote.hamali_total)} testid="cart-hamali" />}
                      {quote.gst_total > 0 && <Row label={t("gst_line")} value={formatINR(quote.gst_total)} />}
                      <div className="pt-2 border-t"><Row label={t("total")} value={formatINR(quote.total_amount)} bold /></div>
                    </div>
                  )}
                  {quoteError && <div className="text-xs text-red-600" data-testid="cart-quote-error">{quoteError}</div>}
                  {quote?.insufficient?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700" data-testid="cart-insufficient">
                      <p className="font-semibold mb-1">{t("insufficient_stock")}:</p>
                      {quote.insufficient.map((r) => (
                        <div key={`${r.product_id}::${r.brand_name}`}>• {r.product_title} ({r.brand_name}) — {t("max_available")}: {r.available}</div>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 italic">{t("price_disclaimer")}</div>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded p-3 text-xs" data-testid="pickup-info-box">
                <div className="flex items-start gap-2">
                  <Store className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#92400E]">{t("pickup_info_title")}</p>
                    <p className="text-[#92400E] mt-1">{t("pickup_info_desc")}</p>
                  </div>
                </div>
              </div>
              <div>
                <Label>{t("full_name")}</Label>
                <Input value={details.customer_name} onChange={(e) => setDetails({ ...details, customer_name: e.target.value })} data-testid="checkout-name" />
              </div>
              <div>
                <Label>{t("phone_number")}</Label>
                <Input value={details.customer_phone} onChange={(e) => setDetails({ ...details, customer_phone: e.target.value })} data-testid="checkout-phone" inputMode="tel" />
              </div>
              <div>
                <Label>{t("order_notes")}</Label>
                <Textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} rows={3} data-testid="checkout-notes" />
              </div>

              {/* Advance selector */}
              <div className="border rounded-lg p-3 bg-white" data-testid="advance-selector">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{t("advance_label")}</div>
                <div className="flex gap-2">
                  {ADVANCE_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAdvance(p)}
                      className={`flex-1 py-2 rounded font-bold text-sm border-2 transition ${advance === p ? "bg-[#D97706] border-[#B45309] text-white" : "bg-white border-slate-200 text-slate-600 hover:border-[#D97706]"}`}
                      data-testid={`advance-${p}`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
                {quote && (
                  <div className="mt-3 text-sm space-y-1" data-testid="advance-breakdown">
                    <Row label={`${t("advance_label")} (${advance}%)`} value={formatINR(advanceAmount)} highlight />
                    <Row label={t("balance_label")} value={formatINR(balanceAmount)} bold />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#DCFCE7] border border-[#166534] rounded p-3 text-sm text-[#166534]" data-testid="order-created-banner">
                <p className="font-bold">{t("order_placed_success")}</p>
                {order && <p className="text-xs mt-1">Order: <span className="font-mono-price font-bold">{order.order_code}</span></p>}
              </div>

              <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg p-4">
                <div className="text-xs uppercase tracking-widest text-[#92400E] font-bold mb-1">{t("payment_via_upi")}</div>
                <div className="font-mono-price font-bold text-[#B45309] text-2xl" data-testid="payment-advance-amount">
                  {formatINR(order?.advance_amount ?? advanceAmount)}
                </div>
                {order && <div className="text-xs text-slate-500 mt-1">{t("balance_at_pickup")}: {formatINR(order.balance_amount)}</div>}
              </div>

              {upiInfo?.active ? (
                <div className="border-2 border-dashed border-[#D97706] rounded-lg p-5 text-center bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                      `upi://pay?pa=${upiInfo.active.upi_id}&pn=${encodeURIComponent(upiInfo.active.holder_name)}&am=${order?.advance_amount ?? advanceAmount}&cu=INR`,
                    )}`}
                    alt="UPI QR"
                    className="mx-auto rounded"
                    data-testid="upi-qr-image"
                  />
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{t("pay_to")}</div>
                    <div className="font-mono-price font-bold text-[#0F172A] text-lg mt-1" data-testid="upi-active-id">
                      {upiInfo.active.upi_id}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{upiInfo.active.holder_name}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyUpi}
                      className="mt-3"
                      data-testid="copy-upi-btn"
                    >
                      <Copy className="w-3 h-3 mr-1" /> {t("copy_upi")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-6">Loading UPI...</div>
              )}

              <div className="bg-[#F1F5F9] rounded-lg p-4 text-xs text-slate-600">
                <p className="font-semibold text-[#0F172A] mb-1">{t("payment_steps")}</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t("step1")}</li>
                  <li>{t("step2")}</li>
                  <li>{t("step3")}</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white space-y-2">
          {step === 1 && items.length > 0 && (
            <>
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm text-slate-500 uppercase tracking-widest font-bold">{t("total")}</span>
                <span className="font-mono-price font-bold text-[#B45309] text-2xl" data-testid="cart-total">{formatINR(totalAmount)}</span>
              </div>
              <Button
                className="btn-amber w-full h-12 font-heading font-bold uppercase tracking-wide"
                onClick={() => setStep(2)}
                disabled={!quote || quote.insufficient?.length > 0}
                data-testid="cart-checkout-btn"
              >
                {t("proceed_checkout")}
              </Button>
            </>
          )}
          {step === 2 && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} data-testid="checkout-back-btn">
                {t("back")}
              </Button>
              <Button className="btn-amber flex-1 font-heading font-bold uppercase" onClick={submitOrder} disabled={submitting} data-testid="checkout-submit-btn">
                {submitting ? t("submitting") : t("place_order_pay")}
              </Button>
            </div>
          )}
          {step === 3 && (
            <Button
              onClick={sendWhatsApp}
              className="w-full h-12 bg-[#15803D] hover:bg-[#166534] text-white font-heading font-bold uppercase tracking-wide"
              data-testid="checkout-whatsapp-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> {t("confirm_whatsapp")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, bold = false, highlight = false, testid }) {
  return (
    <div className="flex justify-between" data-testid={testid}>
      <span className={`${bold ? "font-bold text-[#0F172A]" : "text-slate-600"} ${highlight ? "text-[#B45309] font-bold" : ""}`}>{label}</span>
      <span className={`font-mono-price ${bold || highlight ? "font-bold" : ""} ${highlight ? "text-[#B45309]" : "text-[#0F172A]"}`}>{value}</span>
    </div>
  );
}
