import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Plus, Minus, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import api, { formatINR, formatApiError } from "@/lib/api";

const WHATSAPP = "919440828759";

export default function CartDrawer() {
  const { t } = useLang();
  const { items, updateQty, removeItem, totalAmount, clearCart, open, setOpen } = useCart();
  const [step, setStep] = useState(1); // 1 items, 2 details, 3 payment
  const [details, setDetails] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
    site_contact: "",
    urgency_date: "",
    notes: "",
  });
  const [upiInfo, setUpiInfo] = useState(null);
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && step === 3) {
      api.get("/upi/active").then((r) => setUpiInfo(r.data)).catch(() => {});
    }
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setOrder(null);
      }, 300);
    }
  }, [open]);

  const submitOrder = async () => {
    if (!details.customer_name || !details.customer_phone || !details.delivery_address) {
      toast.error("Please fill name, phone and delivery address");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...details,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_title: i.product_title,
          brand_name: i.brand_name,
          unit: i.unit,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
        })),
        total_amount: totalAmount,
      };
      const { data } = await api.post("/orders", payload);
      setOrder(data);
      setStep(3);
      toast.success("Order placed! Complete payment & confirm via WhatsApp");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    const lines = [
      `*New Order — Sri Venkataramana Cement Traders*`,
      ``,
      `*Customer:* ${details.customer_name}`,
      `*Phone:* ${details.customer_phone}`,
      `*Delivery Address:* ${details.delivery_address}`,
      details.site_contact ? `*Site Contact:* ${details.site_contact}` : null,
      details.urgency_date ? `*Delivery Needed:* ${details.urgency_date}` : null,
      details.notes ? `*Notes:* ${details.notes}` : null,
      ``,
      `*Items:*`,
      ...items.map(
        (i, idx) =>
          `${idx + 1}. ${i.product_title} (${i.brand_name}) — ${i.quantity} ${i.unit} × ₹${i.unit_price} = ₹${(i.unit_price * i.quantity).toLocaleString("en-IN")}`,
      ),
      ``,
      `*Total: ₹${totalAmount.toLocaleString("en-IN")}*`,
      upiInfo?.active ? `*Payment UPI:* ${upiInfo.active.upi_id}` : null,
      order ? `*Order ID:* ${order.id.slice(0, 8).toUpperCase()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
    toast.success("Opening WhatsApp...");
    setTimeout(() => {
      clearCart();
      setOpen(false);
    }, 800);
  };

  const copyUpi = () => {
    if (upiInfo?.active?.upi_id) {
      navigator.clipboard.writeText(upiInfo.active.upi_id);
      toast.success("UPI ID copied");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white"
        data-testid="cart-drawer"
      >
        <div className="p-4 border-b bg-[#0F172A] text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg uppercase tracking-wide">
              {step === 1 ? t("your_cart") : step === 2 ? t("delivery_details") : t("complete_payment")}
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
                items.map((it, idx) => (
                  <div
                    key={idx}
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
                ))
              )}
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <Label>{t("full_name")}</Label>
                <Input value={details.customer_name} onChange={(e) => setDetails({ ...details, customer_name: e.target.value })} data-testid="checkout-name" />
              </div>
              <div>
                <Label>{t("phone_number")}</Label>
                <Input value={details.customer_phone} onChange={(e) => setDetails({ ...details, customer_phone: e.target.value })} data-testid="checkout-phone" />
              </div>
              <div>
                <Label>{t("delivery_address")}</Label>
                <Textarea value={details.delivery_address} onChange={(e) => setDetails({ ...details, delivery_address: e.target.value })} rows={3} data-testid="checkout-address" />
              </div>
              <div>
                <Label>{t("site_contact")}</Label>
                <Input value={details.site_contact} onChange={(e) => setDetails({ ...details, site_contact: e.target.value })} data-testid="checkout-site-contact" />
              </div>
              <div>
                <Label>{t("delivery_date")}</Label>
                <Input type="date" value={details.urgency_date} onChange={(e) => setDetails({ ...details, urgency_date: e.target.value })} data-testid="checkout-date" />
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} rows={2} data-testid="checkout-notes" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg p-4">
                <div className="text-xs uppercase tracking-widest text-[#92400E] font-bold mb-1">{t("payment_via_upi")}</div>
                <div className="font-mono-price font-bold text-[#B45309] text-2xl">
                  {formatINR(totalAmount)}
                </div>
              </div>

              {upiInfo?.active ? (
                <div className="border-2 border-dashed border-[#D97706] rounded-lg p-5 text-center bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                      `upi://pay?pa=${upiInfo.active.upi_id}&pn=${encodeURIComponent(upiInfo.active.holder_name)}&am=${totalAmount}&cu=INR`,
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
                  <div className="mt-3 pt-3 border-t text-xs text-slate-500">
                    {t("active_upi_usage")} {formatINR(upiInfo.usage_2day)} / {formatINR(upiInfo.limit_2day)})
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
                <span className="font-mono-price font-bold text-[#B45309] text-2xl">{formatINR(totalAmount)}</span>
              </div>
              <Button className="btn-amber w-full h-12 font-heading font-bold uppercase tracking-wide" onClick={() => setStep(2)} data-testid="cart-checkout-btn">
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
                {submitting ? t("submitting") : t("place_order")}
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
