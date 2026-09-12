import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import api, { formatINR, formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

let _rowSeq = 0;
const newRow = () => ({ key: `row-${++_rowSeq}`, product_id: "", brand_id: "", quantity: 1 });

export default function QuickOrder() {
  const { t } = useLang();
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState(() => [newRow()]);
  const [advance, setAdvance] = useState(50);
  const [details, setDetails] = useState({ customer_name: "", customer_phone: "", notes: "" });
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  const validRows = useMemo(
    () => rows.filter((r) => r.product_id && r.brand_id && Number(r.quantity) > 0),
    [rows],
  );

  useEffect(() => {
    if (validRows.length === 0) { setQuote(null); return; }
    api.post("/cart/quote", {
      items: validRows.map((r) => ({ product_id: r.product_id, brand_id: r.brand_id, quantity: Number(r.quantity) })),
      advance_percent: advance,
    }).then((r) => setQuote(r.data)).catch(() => setQuote(null));
  }, [validRows, advance]);

  const updateRow = (key, patch) => setRows((rs) => rs.map((r) => r.key === key ? { ...r, ...patch } : r));
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key));

  const submit = async () => {
    if (!details.customer_name.trim() || !details.customer_phone.trim()) {
      toast.error(t("name_phone_required")); return;
    }
    if (validRows.length === 0) { toast.error(t("add_at_least_one")); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders", {
        customer_name: details.customer_name.trim(),
        customer_phone: details.customer_phone.trim(),
        notes: details.notes,
        advance_percent: advance,
        items: validRows.map((r) => ({ product_id: r.product_id, brand_id: r.brand_id, quantity: Number(r.quantity) })),
      });
      toast.success(t("order_placed_toast"));
      nav(`/order/${data.order.order_code}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="quick-order-page">
      <Header />
      <section className="bg-[#0F172A] py-12 relative overflow-hidden">
        <div className="absolute inset-0 industrial-stripe opacity-30" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="inline-flex items-center gap-2 bg-[#D97706]/20 border border-[#D97706] px-3 py-1 rounded-sm mb-3">
            <Zap className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#FEF3C7]">{t("quick_order_eyebrow")}</span>
          </div>
          <h1 className="font-condensed uppercase font-black text-white text-4xl sm:text-5xl" data-testid="quick-order-title">
            {t("quick_order_title")}
          </h1>
          <p className="text-slate-300 mt-2 text-sm sm:text-base">{t("quick_order_desc")}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3" data-testid="quick-rows-block">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-[#0F172A]">{t("items_label")}</h2>
            <Button size="sm" variant="outline" onClick={addRow} data-testid="quick-add-row">
              <Plus className="w-3 h-3 mr-1" /> {t("add_item")}
            </Button>
          </div>

          {rows.map((r, i) => {
            const prod = products.find((p) => p.id === r.product_id);
            const brands = prod?.brands || [];
            return (
              <div key={r.key} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded" data-testid={`quick-row-${i}`}>
                <div className="col-span-5">
                  <Label className="text-[10px] uppercase text-slate-500 font-bold">{t("product_label")}</Label>
                  <Select value={r.product_id} onValueChange={(v) => updateRow(r.key, { product_id: v, brand_id: "" })}>
                    <SelectTrigger className="h-9" data-testid={`quick-product-${i}`}><SelectValue placeholder={t("select_product")} /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-[10px] uppercase text-slate-500 font-bold">{t("brand")}</Label>
                  <Select value={r.brand_id} onValueChange={(v) => updateRow(r.key, { brand_id: v })} disabled={!prod}>
                    <SelectTrigger className="h-9" data-testid={`quick-brand-${i}`}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} · {formatINR(b.price)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase text-slate-500 font-bold">{t("qty")}</Label>
                  <Input type="number" min="1" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} className="h-9" data-testid={`quick-qty-${i}`} />
                </div>
                <div className="col-span-1">
                  <button className="w-9 h-9 text-red-600 hover:bg-red-50 rounded flex items-center justify-center" onClick={() => removeRow(r.key)} data-testid={`quick-remove-${i}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {quote && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1 text-sm" data-testid="quick-breakdown">
            <Row label={t("subtotal")} value={formatINR(quote.subtotal_ex_gst)} />
            {quote.hamali_total > 0 && <Row label={t("hamali_line")} value={formatINR(quote.hamali_total)} />}
            {quote.gst_total > 0 && <Row label={t("gst_line")} value={formatINR(quote.gst_total)} />}
            <div className="pt-2 border-t"><Row label={t("total")} value={formatINR(quote.total_amount)} bold /></div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div>
            <Label>{t("full_name")}</Label>
            <Input value={details.customer_name} onChange={(e) => setDetails({ ...details, customer_name: e.target.value })} data-testid="quick-name" />
          </div>
          <div>
            <Label>{t("phone_number")}</Label>
            <Input value={details.customer_phone} onChange={(e) => setDetails({ ...details, customer_phone: e.target.value })} inputMode="tel" data-testid="quick-phone" />
          </div>
          <div>
            <Label>{t("order_notes")}</Label>
            <Textarea rows={2} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} data-testid="quick-notes" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{t("advance_label")}</div>
            <div className="flex gap-2">
              {[25, 50, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setAdvance(p)}
                  className={`flex-1 py-2 rounded font-bold text-sm border-2 transition ${advance === p ? "bg-[#D97706] border-[#B45309] text-white" : "bg-white border-slate-200 text-slate-600 hover:border-[#D97706]"}`}
                  data-testid={`quick-advance-${p}`}
                >
                  {p}%
                </button>
              ))}
            </div>
            {quote && (
              <div className="mt-3 text-sm space-y-1">
                <Row label={`${t("advance_label")} (${advance}%)`} value={formatINR(quote.advance_amount)} highlight />
                <Row label={t("balance_label")} value={formatINR(quote.balance_amount)} bold />
              </div>
            )}
          </div>
        </div>

        <Button className="btn-amber w-full h-12 font-heading font-bold uppercase tracking-wide" onClick={submit} disabled={submitting} data-testid="quick-submit-btn">
          {submitting ? t("submitting") : t("place_order_pay")}
        </Button>
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
