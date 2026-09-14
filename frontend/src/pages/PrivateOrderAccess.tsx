import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LockKeyhole, Phone } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";
import { Button, Input, Label } from "../components/checkout-ui";
import { apiGet } from "../lib/api";
interface ShopContact { whatsapp: string; shop_name: string }
export default function PrivateOrderAccess() {
  const shop = useQuery({ queryKey: ["public-shop-contact"], queryFn: () => apiGet<ShopContact>("/api/settings/public") });
  return <div className="min-h-screen bg-slate-50" data-testid="private-order-page"><Header /><main className="max-w-2xl mx-auto px-4 py-14"><div className="bg-white border rounded-xl p-7 space-y-5"><LockKeyhole className="text-amber-700" size={30} aria-hidden="true" /><h1 className="font-heading font-bold text-2xl" data-testid="private-order-title">Your order details are private</h1><p className="text-sm text-slate-600 leading-relaxed" data-testid="private-order-notice">Order lookup requires WhatsApp verification. This service is awaiting activation, so we will not display customer information using only a phone number or an order code.</p><div><Label htmlFor="tracking-phone" data-testid="tracking-phone-label">Verified WhatsApp number required</Label><Input id="tracking-phone" type="tel" disabled placeholder="WhatsApp verification is not connected" data-testid="tracking-phone" /></div><Button disabled className="w-full" data-testid="tracking-verify-button">Verify WhatsApp · setup pending</Button><p className="text-xs text-slate-500" data-testid="tracking-help">For an earlier order or a payment concern, contact the shop. Keep your transaction reference; do not pay again while a payment is being checked.</p>{shop.data && <a href={`tel:+${shop.data.whatsapp.replace(/\D/g, "")}`} className="flex items-center gap-2 text-amber-700 font-semibold" data-testid="tracking-contact-shop"><Phone size={16} />Contact the shop</a>}<Link to="/catalog" className="block text-sm underline" data-testid="tracking-back-catalog">Back to materials</Link></div></main><Footer /><CartDrawer /></div>;
}