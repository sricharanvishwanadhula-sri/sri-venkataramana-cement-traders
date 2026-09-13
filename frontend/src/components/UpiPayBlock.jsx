import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { BACKEND_URL, formatINR } from "@/lib/api";

/**
 * UPI payment block for an order.
 *
 * One QR is all that is needed: PhonePe, Google Pay, Paytm, BHIM and every bank
 * app implement the same NPCI `upi://pay` spec, so a single QR is scannable by
 * all of them. The amount is pre-filled server-side so it cannot be tampered
 * with from the browser.
 */
export default function UpiPayBlock({ order }) {
  const [intent, setIntent] = useState(null);
  const [failed, setFailed] = useState(false);

  const paid = !!order?.payment?.verified;
  const part = paid ? "balance" : "advance";
  const amount = paid ? order?.balance_amount : order?.advance_amount;

  useEffect(() => {
    if (!order?.order_code) return;
    let alive = true;
    api
      .get(`/orders/${order.order_code}/upi-intent`, { params: { part } })
      .then((r) => alive && setIntent(r.data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [order?.order_code, part]);

  // Nothing payable, or no UPI account configured by the shop yet.
  if (!order || !amount || amount <= 0) return null;

  const qrSrc = `${BACKEND_URL}/api/orders/${order.order_code}/upi-qr.png?part=${part}`;

  const copyUpi = () => {
    const id = intent?.upi_id || order.assigned_upi_id;
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success("UPI ID copied");
  };

  return (
    <div
      className="mt-4 bg-white border-2 border-[#D97706] rounded-lg overflow-hidden"
      data-testid="upi-pay-block"
    >
      <div className="bg-[#FFFBEB] border-b border-[#FEF3C7] px-5 py-3 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[#B45309]" />
        <h2 className="font-heading font-bold text-lg text-[#0F172A]">
          {paid ? "Pay balance by UPI" : "Pay advance by UPI"}
        </h2>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        {/* QR */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="border-2 border-slate-200 rounded-lg p-2 bg-white">
            <img
              src={qrSrc}
              alt={`UPI QR to pay ${formatINR(amount)}`}
              width={168}
              height={168}
              className="w-[168px] h-[168px]"
              onError={() => setFailed(true)}
              data-testid="upi-qr-image"
            />
          </div>
          <div className="text-center mt-2 text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Scan to pay
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            {paid ? "Balance due" : `Advance (${order.advance_percent}%)`}
          </div>
          <div
            className="font-mono-price font-black text-3xl text-[#B45309] mt-1"
            data-testid="upi-amount"
          >
            {formatINR(amount)}
          </div>

          <div className="mt-3 text-sm">
            <div className="text-slate-500 text-xs uppercase font-bold tracking-wide">
              Pay to
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="font-mono-price font-bold text-[#0F172A] truncate"
                data-testid="upi-id-value"
              >
                {intent?.upi_id || order.assigned_upi_id || "—"}
              </span>
              <button
                onClick={copyUpi}
                className="text-slate-400 hover:text-[#D97706] shrink-0"
                title="Copy UPI ID"
                data-testid="copy-upi-id-btn"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tap to pay - mobile */}
          {intent?.uri && (
            <a href={intent.uri} data-testid="open-upi-app-link">
              <Button
                className="w-full mt-4 h-11 btn-amber font-heading font-bold uppercase tracking-wide"
                data-testid="open-upi-app-btn"
              >
                <Smartphone className="w-4 h-4 mr-2" /> Open UPI app to pay
              </Button>
            </a>
          )}

          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Works with{" "}
            <span className="font-semibold text-slate-700">
              PhonePe, Google Pay, Paytm
            </span>
            , BHIM and any bank UPI app. The amount is already filled in — just
            confirm.
          </p>

          <div className="mt-3 flex items-start gap-1.5 text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FEF3C7] rounded p-2">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              After paying, send us the UTR / reference number on WhatsApp so we
              can confirm your order faster.
            </span>
          </div>

          {failed && (
            <p
              className="text-xs text-slate-400 mt-2"
              data-testid="upi-qr-unavailable"
            >
              QR could not be loaded. Use the UPI ID above to pay manually.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
