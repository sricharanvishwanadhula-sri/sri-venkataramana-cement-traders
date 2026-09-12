import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";
import api, { formatINR } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

const STATUS_LABELS = {
  PendingVerification: { key: "status_pending", cls: "badge-low-stock" },
  AdvanceReceived: { key: "status_advance_received", cls: "badge-in-stock" },
  ReadyForPickup: { key: "status_ready_pickup", cls: "badge-in-stock" },
  Completed: { key: "status_completed", cls: "badge-in-stock" },
  Cancelled: { key: "status_cancelled", cls: "badge-out-stock" },
};

export default function TrackOrder() {
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault?.();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/track`, { params: { phone: phone.trim() } });
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="track-page">
      <Header />

      <section className="bg-[#0F172A] py-12 relative overflow-hidden">
        <div className="absolute inset-0 industrial-stripe opacity-30" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-xs font-bold uppercase tracking-widest text-[#D97706]">Pickup Lookup</div>
          <h1 className="font-condensed uppercase font-black text-white text-4xl sm:text-5xl mt-2" data-testid="track-title">
            {t("track_title")}
          </h1>
          <p className="text-slate-300 mt-2 text-sm sm:text-base">{t("track_desc")}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={search} className="flex gap-2" data-testid="track-form">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("track_phone_placeholder")}
              className="pl-10 h-11"
              data-testid="track-phone-input"
            />
          </div>
          <Button type="submit" className="btn-amber h-11 px-5 font-heading font-bold uppercase" disabled={loading} data-testid="track-submit-btn">
            {loading ? t("track_searching") : t("track_btn")}
          </Button>
        </form>

        {orders !== null && (
          <div className="mt-6 space-y-3" data-testid="track-results">
            {orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-3">{t("track_no_orders")}</p>
              </div>
            ) : (
              orders.map((o) => {
                const st = STATUS_LABELS[o.status] || STATUS_LABELS.PendingVerification;
                return (
                  <Link key={o.id} to={`/order/${o.order_code}`} className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-[#D97706] transition" data-testid={`track-order-${o.order_code}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-mono-price font-bold text-[#0F172A]">{o.order_code}</div>
                        <div className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                      </div>
                      <span className={`badge-stock ${st.cls}`}>{t(st.key)}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-sm text-slate-600">
                        {o.items.length} item{o.items.length > 1 ? "s" : ""} · Advance {o.advance_percent}%
                      </div>
                      <div className="font-mono-price font-bold text-[#B45309]">{formatINR(o.total_amount)}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
