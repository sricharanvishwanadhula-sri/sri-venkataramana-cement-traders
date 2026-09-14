import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Store } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CheckoutForm from "../components/CheckoutForm";
import CartDrawer from "../components/CartDrawer";
import { Button, Input, Label } from "../components/checkout-ui";
import { apiGet, formatApiError, formatINR } from "../lib/api";
interface ProductOption { id: string; title: string; brands: { id: string; name: string; price: number; stock: number }[] }
interface Row { key: string; product_id: string; brand_id: string; quantity: number }
const newRow = (): Row => ({ key: crypto.randomUUID(), product_id: "", brand_id: "", quantity: 1 });
export default function QuickOrder() {
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const products = useQuery({ queryKey: ["quick-products"], queryFn: () => apiGet<ProductOption[]>("/api/products"), retry: false });
  const update = (key: string, values: Partial<Row>) => setRows(previous => previous.map(row => row.key === key ? { ...row, ...values } : row));
  const items = rows.filter(row => row.product_id && row.brand_id && row.quantity > 0).map(({ product_id, brand_id, quantity }) => ({ product_id, brand_id, quantity }));
  return <div className="min-h-screen bg-slate-50" data-testid="quick-order-page"><Header /><main className="max-w-4xl mx-auto px-4 py-10">
    <div className="mb-7" data-testid="quick-order-heading"><p className="uppercase tracking-widest text-xs font-bold text-amber-700">Local shop pickup</p><h1 className="font-heading font-black text-3xl mt-2">Choose your materials</h1><p className="text-sm text-slate-600 mt-2">Review your quote and save a draft. Online payments remain locked while official services are connected.</p></div>
    <div className="bg-white border rounded-lg p-5 mb-5" data-testid="quick-materials"><div className="flex justify-between items-center mb-4"><h2 className="font-bold" data-testid="quick-materials-title">Materials</h2><Button size="sm" variant="outline" onClick={() => setRows(previous => [...previous, newRow()])} data-testid="quick-add-row"><Plus size={15} className="mr-1" />Add material</Button></div>
      {products.isError && <p className="text-red-700 text-sm" data-testid="quick-products-error">{formatApiError(products.error)}</p>}
      {rows.map((row, index) => { const product = products.data?.find(item => item.id === row.product_id); return <div className="grid grid-cols-12 gap-2 mb-4" key={row.key} data-testid={`quick-row-${index}`}>
        <div className="col-span-12 sm:col-span-5"><Label htmlFor={`quick-product-${index}`} data-testid={`quick-product-label-${index}`}>Product</Label><select id={`quick-product-${index}`} className="w-full border rounded-md h-10 px-2 text-sm bg-white" value={row.product_id} onChange={event => update(row.key, { product_id: event.target.value, brand_id: "" })} data-testid={`quick-product-${index}`}><option value="">Choose product</option>{products.data?.map(item => <option key={item.id} value={item.id} data-testid={`quick-product-option-${index}-${item.id}`}>{item.title}</option>)}</select></div>
        <div className="col-span-7 sm:col-span-4"><Label htmlFor={`quick-brand-${index}`} data-testid={`quick-brand-label-${index}`}>Brand</Label><select id={`quick-brand-${index}`} disabled={!product} className="w-full border rounded-md h-10 px-2 text-sm bg-white" value={row.brand_id} onChange={event => update(row.key, { brand_id: event.target.value })} data-testid={`quick-brand-${index}`}><option value="">Choose brand</option>{product?.brands.map(brand => <option key={brand.id} value={brand.id} disabled={brand.stock <= 0} data-testid={`quick-brand-option-${index}-${brand.id}`}>{brand.name} · {formatINR(brand.price)}</option>)}</select></div>
        <div className="col-span-3 sm:col-span-2"><Label htmlFor={`quick-qty-${index}`} data-testid={`quick-qty-label-${index}`}>Quantity</Label><Input id={`quick-qty-${index}`} type="number" min={0.001} step="any" value={row.quantity} onChange={event => update(row.key, { quantity: Number(event.target.value) })} data-testid={`quick-qty-${index}`} /></div>
        <div className="col-span-2 sm:col-span-1 flex items-end"><Button variant="ghost" onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))} aria-label={`Remove material ${index + 1}`} data-testid={`quick-remove-${index}`}><Trash2 size={17} /></Button></div>
      </div>; })}
    </div>
    <div className="bg-white border rounded-lg p-5 sm:p-7"><div className="flex gap-2 items-center font-heading font-bold text-xl mb-5" data-testid="quick-checkout-title"><Store size={20} />Pickup checkout</div><CheckoutForm items={items} prefix="quick-checkout" /></div>
  </main><Footer /><CartDrawer /></div>;
}