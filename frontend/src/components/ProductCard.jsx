import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, MessageCircle, Phone, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { formatINR } from "@/lib/api";

const WHATSAPP = "919440828759";

function hamaliText(h, unit, t) {
  if (!h || !h.enabled) return null;
  if (h.calc_type === "fixed") return `${t("hamali_extra")}: ${formatINR(h.rate)} / order`;
  if (h.calc_type === "per_bag") return `${t("hamali_extra")}: ${formatINR(h.rate)} / bag`;
  if (h.calc_type === "per_ton") return `${t("hamali_extra")}: ${formatINR(h.rate)} / ton`;
  if (h.calc_type === "per_piece") return `${t("hamali_extra")}: ${formatINR(h.rate)} / ${unit || "piece"}`;
  return null;
}

export default function ProductCard({ product }) {
  const { t } = useLang();
  const brands = product.brands || [];
  const [brandId, setBrandId] = useState(brands[0]?.id || "");
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const brand = brands.find((b) => b.id === brandId) || brands[0];

  if (!brand) {
    return null;
  }

  const stockLabel =
    brand.stock === 0
      ? { text: t("out_of_stock"), cls: "badge-out-stock" }
      : brand.stock < 20
        ? { text: `${t("low_stock")}: ${brand.stock}`, cls: "badge-low-stock" }
        : { text: `${t("in_stock")}: ${brand.stock}`, cls: "badge-in-stock" };

  const hamaliLine = hamaliText(product.hamali, product.unit, t);

  const handleAdd = () => {
    if (brand.stock === 0) {
      toast.error(t("out_of_stock"));
      return;
    }
    if (qty > brand.stock) {
      toast.error(`${t("insufficient_stock")}. ${t("max_available")}: ${brand.stock}`);
      return;
    }
    addItem(product, brand, qty);
    toast.success(`${qty} ${product.unit} · ${product.title}`);
  };

  const quickWhatsApp = () => {
    const text = `Hi, I want to check price / stock for:\n*${product.title}* — ${brand.name}\nQuantity: ${qty} ${product.unit}\nListed rate: ${formatINR(brand.price * qty)}\nPlease share your best rate.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="product-card flex flex-col" data-testid={`product-card-${product.id}`}>
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 font-heading font-bold">
            No Image
          </div>
        )}
        <div className="absolute top-3 left-3 bg-[#0F172A] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
          {product.category}
        </div>
        {hamaliLine && (
          <div className="absolute top-3 right-3 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1" data-testid={`product-hamali-${product.id}`}>
            <Truck className="w-3 h-3" /> {t("hamali_extra")}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading font-bold text-lg text-[#0F172A] leading-tight">
          {product.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>

        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {t("brand")}
            </label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger
                className="mt-1 h-9"
                data-testid={`product-brand-select-${product.id}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id} data-testid={`brand-option-${b.id}`}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold leading-none">{t("listed_price")}</div>
              <div className="font-mono-price font-bold text-[#B45309] text-xl mt-0.5" data-testid={`product-price-${product.id}`}>
                {formatINR(brand.price)}
              </div>
              <div className="text-[10px] text-slate-500 uppercase">{t("per")} {product.unit}</div>
            </div>
            <span className={`badge-stock ${stockLabel.cls}`} data-testid={`product-stock-${product.id}`}>
              {stockLabel.text}
            </span>
          </div>

          {hamaliLine && (
            <div className="text-[10px] text-[#92400E] bg-[#FFFBEB] border border-[#FEF3C7] rounded px-2 py-1 font-semibold" data-testid={`product-hamali-line-${product.id}`}>
              {hamaliLine}
            </div>
          )}

          <div className="text-[10px] text-slate-400 italic">
            {t("price_may_vary")}
          </div>

          {brand.stock === 0 ? (
            <div className="flex gap-2 pt-2 border-t">
              <a href={`tel:+${WHATSAPP}`} className="flex-1">
                <Button className="w-full h-9 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider" data-testid={`product-call-btn-${product.id}`}>
                  <Phone className="w-3.5 h-3.5 mr-1" /> {t("call_shop")}
                </Button>
              </a>
              <Button
                onClick={quickWhatsApp}
                className="flex-1 h-9 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold uppercase tracking-wider"
                data-testid={`product-whatsapp-btn-${product.id}`}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> {t("whatsapp_short")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 pt-2 border-t">
                <div className="flex items-center border rounded overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-8 h-9 hover:bg-slate-100"
                    data-testid={`product-qty-dec-${product.id}`}
                  >
                    <Minus className="w-3 h-3 mx-auto" />
                  </button>
                  <span className="w-10 text-center font-mono-price font-bold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-8 h-9 hover:bg-slate-100"
                    data-testid={`product-qty-inc-${product.id}`}
                  >
                    <Plus className="w-3 h-3 mx-auto" />
                  </button>
                </div>
                <Button
                  onClick={handleAdd}
                  className="btn-amber flex-1 h-9 text-xs font-bold uppercase tracking-wider"
                  data-testid={`product-add-btn-${product.id}`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" /> {t("add")}
                </Button>
              </div>
              <Button
                onClick={quickWhatsApp}
                variant="outline"
                className="w-full h-8 text-xs font-bold uppercase tracking-wider border-[#15803D] text-[#15803D] hover:bg-[#DCFCE7]"
                data-testid={`product-whatsapp-btn-${product.id}`}
              >
                <MessageCircle className="w-3 h-3 mr-1" /> {t("call_for_best_price")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
