import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Phone, MapPin, Clock, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import api, { BACKEND_URL, formatINR } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import UpiPayBlock from "@/components/UpiPayBlock";

const WHATSAPP = "919440828759";

const STATUS_STYLES = {
  PendingVerification: { cls: "badge-low-stock", label_key: "status_pending" },
  AdvanceReceived: { cls: "badge-in-stock", label_key: "status_advance_received" },
  ReadyForPickup: { cls: "badge-in-stock", label_key: "status_ready_pickup" },
  Completed: { cls: "badge-in-stock", label_key: "status_completed" },
  Cancelled: { cls: "badge-out-stock", label_key: "status_cancelled" },
};

export default function OrderConfirmation() {
  const { code } = useParams();
  const { t } = useLang();
  const [order, setOrder] = useState(null);
  const [shop, setShop] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/orders/${code}`),
      api.get("/settings/public"),
    ]).then(([o, s]) => { setOrder(o.data); setShop(s.data); })
      .catch(() => setErr(true));
  }, [code]);

  const copyCode = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_code);
    toast.success("Order code copied");
  };

  const invoiceUrl = order
    ? `${BACKEND_URL}/api/orders/${order.order_code}/invoice.pdf`
    : "";

  const openInvoice = () => {
    window.open(`${invoiceUrl}?download=1`, "_blank");
  };

  const sendInvoiceWhatsApp = () => {
    if (!order) return;
    const msg = [
      `*GST Tax Invoice — ${order.order_code}*`,
      `${shop?.shop_name || "Sri Venkataramana Cement Traders"}`,
      ``,
      `*Customer:* ${order.customer_name}`,
      `*Total:* ₹${order.total_amount}`,
      `*Advance (${order.advance_percent}%):* ₹${order.advance_amount}`,
      `*Balance at pickup:* ₹${order.balance_amount}`,
      ``,
      `Download your invoice PDF:`,
      invoiceUrl,
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  const sendWhatsApp = () => {
    if (!order) return;
    const trackLink = `${window.location.origin}/order/${order.order_code}`;
    const lines = order.items.map((it, i) =>
      `${i + 1}. ${it.product_title} (${it.brand_name}) — ${it.quantity} ${it.unit} @ ₹${it.unit_price}`
    ).join("\n");
    const msg = [
      `*Order Slip — ${order.order_code}*`,
      ``,
      `*Customer:* ${order.customer_name}`,
      `*Phone:* ${order.customer_phone}`,
      ``,
      `*Items:*`,
      lines,
      ``,
      `Subtotal: ₹${order.subtotal_ex_gst}`,
      order.hamali_total > 0 ? `Hamali: ₹${order.hamali_total}` : null,
      `GST: ₹${order.gst_total}`,
      `*Total: ₹${order.total_amount}*`,
      `*Advance (${order.advance_percent}%): ₹${order.advance_amount}*`,
      `Balance at pickup: ₹${order.balance_amount}`,
      `UPI: ${order.assigned_upi_id}`,
      ``,
      `Invoice PDF: ${invoiceUrl}`,
      `Track: ${trackLink}`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (err) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header />
        <div className="max-w-2xl mx-auto py-16 text-center px-4">
          <h1 className="font-heading font-bold text-2xl text-[#0F172A]">Order not found</h1>
          <p className="text-slate-500 mt-2">Please check the order code and try again.</p>
          <Link to="/track" className="mt-6 inline-block">
            <Button className="btn-amber font-heading uppercase">Track by phone</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header />
        <div className="max-w-2xl mx-auto py-16 text-center text-slate-500">Loading order...</div>
      </div>
    );
  }

  const st = STATUS_STYLES[order.status] || STATUS_STYLES.PendingVerification;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="order-confirmation-page">
      <Header />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success banner */}
        <div className="bg-[#DCFCE7] border border-[#166534] rounded-lg p-5 flex items-start gap-3" data-testid="order-success-banner">
          <CheckCircle className="w-8 h-8 text-[#166534] shrink-0" />
          <div className="flex-1">
            <h1 className="font-heading font-black text-xl text-[#166534]">{t("order_confirmed")}</h1>
            <p className="text-sm text-[#166534] opacity-90 mt-0.5">{t("pickup_instructions")}</p>
          </div>
        </div>

        {/* Order code */}
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between" data-testid="order-code-block">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{t("order_code_label")}</div>
            <div className="font-mono-price font-bold text-2xl text-[#0F172A] mt-1" data-testid="order-code-value">{order.order_code}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge-stock ${st.cls}`} data-testid="order-status-badge">{t(st.label_key)}</span>
            <button onClick={copyCode} className="text-xs text-slate-500 hover:text-[#D97706] flex items-center gap-1" data-testid="copy-order-code">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>

        {/* Pickup slip */}
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-5" data-testid="pickup-slip">
          <h2 className="font-heading font-bold text-lg text-[#0F172A] mb-4">{t("pickup_slip")}</h2>
          <div className="text-sm mb-3">
            <div className="font-semibold">{order.customer_name}</div>
            <div className="text-slate-500">{order.customer_phone}</div>
          </div>
          <div className="border-t pt-3 space-y-1.5 text-sm">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between" data-testid={`slip-item-${i}`}>
                <div className="flex-1 pr-2">
                  <div className="font-medium">{it.product_title}</div>
                  <div className="text-xs text-slate-500">
                    {it.brand_name} · {it.quantity} {it.unit} × {formatINR(it.unit_price)}
                    {it.hamali_amount > 0 && ` · Hamali ${formatINR(it.hamali_amount)}`}
                  </div>
                </div>
                <div className="font-mono-price font-bold text-[#B45309]">{formatINR(it.subtotal_ex_gst)}</div>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1.5 text-sm">
            <Row label={t("subtotal")} value={formatINR(order.subtotal_ex_gst)} />
            {order.hamali_total > 0 && <Row label={t("hamali_line")} value={formatINR(order.hamali_total)} />}
            {order.gst_total > 0 && <Row label={t("gst_line")} value={formatINR(order.gst_total)} />}
            <Row label={t("total")} value={formatINR(order.total_amount)} bold />
            <Row label={t("advance_paid") + ` (${order.advance_percent}%)`} value={formatINR(order.advance_amount)} highlight />
            <Row label={t("balance_due")} value={formatINR(order.balance_amount)} bold />
          </div>
          {order.notes && (
            <div className="border-t mt-3 pt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Notes:</span> {order.notes}
            </div>
          )}
        </div>

        {/* UPI payment QR */}
        <UpiPayBlock order={order} />

        {/* Shop info */}
        {shop && (
          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-5" data-testid="shop-block">
            <h2 className="font-heading font-bold text-lg text-[#0F172A] mb-3">{t("shop_address")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[#D97706] mt-0.5" /><span>{shop.address}</span></div>
              <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-[#D97706] mt-0.5" /><span>{shop.opening_hours}</span></div>
              <div className="flex items-start gap-2"><Phone className="w-4 h-4 text-[#D97706] mt-0.5" /><a href={`tel:+${shop.whatsapp}`} className="hover:text-[#D97706]">+{shop.whatsapp.slice(0, 2)} {shop.whatsapp.slice(2)}</a></div>
            </div>
            {shop.maps_url && (
              <a href={shop.maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-[#D97706] font-semibold hover:underline" data-testid="shop-map-link">
                <MapPin className="w-3 h-3" /> {t("view_on_map")}
              </a>
            )}
          </div>
        )}

        {/* Invoice actions */}
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-5" data-testid="invoice-block">
          <h2 className="font-heading font-bold text-lg text-[#0F172A] mb-1">GST Tax Invoice</h2>
          <p className="text-xs text-slate-500 mb-4">
            Download your invoice as a PDF, or share the download link on WhatsApp.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={openInvoice}
              className="h-12 bg-[#0F172A] hover:bg-[#1E293B] text-white font-heading font-bold uppercase tracking-wide"
              data-testid="download-invoice-btn"
            >
              <FileText className="w-4 h-4 mr-2" /> Download invoice PDF
            </Button>
            <Button
              onClick={sendInvoiceWhatsApp}
              className="h-12 bg-[#15803D] hover:bg-[#166534] text-white font-heading font-bold uppercase tracking-wide"
              data-testid="send-invoice-whatsapp-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Send invoice on WhatsApp
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={sendWhatsApp} className="h-12 bg-[#15803D] hover:bg-[#166534] text-white font-heading font-bold uppercase tracking-wide" data-testid="send-order-whatsapp-btn">
            <MessageCircle className="w-4 h-4 mr-2" /> {t("send_order_whatsapp")}
          </Button>
          <a href={`tel:+${WHATSAPP}`}>
            <Button className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-white font-heading font-bold uppercase tracking-wide" data-testid="call-shop-btn">
              <Phone className="w-4 h-4 mr-2" /> {t("contact_shop")}
            </Button>
          </a>
        </div>

        <div className="mt-4 bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg p-3 text-xs text-[#92400E]" data-testid="future-bulk-note">
          {t("call_for_future_bulk")}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Row({ label, value, bold = false, highlight = false }) {
  return (
    <div className="flex justify-between">
      <span className={`${bold ? "font-bold text-[#0F172A]" : "text-slate-600"} ${highlight ? "text-[#B45309] font-bold" : ""}`}>{label}</span>
      <span className={`font-mono-price ${bold || highlight ? "font-bold" : ""} ${highlight ? "text-[#B45309]" : "text-[#0F172A]"}`}>{value}</span>
    </div>
  );
}
