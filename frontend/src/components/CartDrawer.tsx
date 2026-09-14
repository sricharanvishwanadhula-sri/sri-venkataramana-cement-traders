import { useState } from "react";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Sheet, SheetContent, SheetTitle, SheetDescription, Button } from "./checkout-ui";
import CheckoutForm from "./CheckoutForm";
import { formatINR } from "../lib/api";
import type { CheckoutItem } from "../lib/checkout-types";

interface CartLine extends CheckoutItem { product_title: string; brand_name: string; unit: string; unit_price: number; image_url: string }
interface CartValue { items: CartLine[]; open: boolean; setOpen: (value: boolean) => void; updateQty: (index: number, quantity: number) => void; removeItem: (index: number) => void }
export default function CartDrawer() {
  const { items, open, setOpen, updateQty, removeItem } = useCart() as unknown as CartValue;
  const [checkout, setCheckout] = useState(false);
  return <Sheet open={open} onOpenChange={value => { setOpen(value); if (!value) setCheckout(false); }}>
    <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white" data-testid="cart-drawer">
      <div className="bg-slate-900 text-white p-5 pr-12"><SheetTitle className="text-white font-heading text-xl" data-testid="cart-title">{checkout ? "Pickup checkout" : "Your materials"}</SheetTitle><SheetDescription className="text-slate-300 text-xs mt-1" data-testid="cart-description">Shop pickup only. Full payment after WhatsApp verification.</SheetDescription></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {checkout && items.length > 0 ? <><Button variant="outline" size="sm" onClick={() => setCheckout(false)} data-testid="cart-back-materials"><ArrowLeft size={15} className="mr-2" /> Edit materials</Button><CheckoutForm items={items.map(({ product_id, brand_id, quantity }) => ({ product_id, brand_id, quantity }))} prefix="cart-checkout" /></> : <>
          {items.length === 0 && <div className="py-12 text-center text-slate-500" data-testid="cart-empty"><ShoppingBag className="mx-auto mb-3" />Your cart is empty. Add materials from the catalogue.</div>}
          {items.map((item, index) => <div className="border-b pb-4" key={`${item.product_id}-${item.brand_id}`} data-testid={`cart-item-${index}`}>
            <h3 className="font-semibold text-sm" data-testid={`cart-item-title-${index}`}>{item.product_title}</h3><p className="text-xs text-slate-500 mt-1" data-testid={`cart-item-brand-${index}`}>{item.brand_name} · {item.unit}</p>
            <div className="flex items-center gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => updateQty(index, item.quantity - 1)} aria-label={`Decrease ${item.product_title}`} data-testid={`cart-dec-${index}`}><Minus size={14} /></Button><span className="font-mono w-10 text-center" data-testid={`cart-qty-${index}`}>{item.quantity}</span><Button size="sm" variant="outline" onClick={() => updateQty(index, item.quantity + 1)} aria-label={`Increase ${item.product_title}`} data-testid={`cart-inc-${index}`}><Plus size={14} /></Button><strong className="text-sm text-amber-700 ml-auto" data-testid={`cart-price-${index}`}>{formatINR(item.unit_price * item.quantity)}</strong><Button variant="ghost" size="sm" onClick={() => removeItem(index)} aria-label={`Remove ${item.product_title}`} data-testid={`cart-remove-${index}`}><Trash2 size={15} /></Button></div>
          </div>)}
          {items.length > 0 && <><p className="text-xs text-slate-500" data-testid="cart-price-note">Taxes and loading charges are calculated at checkout. Online payments are currently paused.</p><Button className="btn-amber w-full h-12" onClick={() => setCheckout(true)} data-testid="cart-checkout-button">Continue to pickup checkout</Button></>}
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}