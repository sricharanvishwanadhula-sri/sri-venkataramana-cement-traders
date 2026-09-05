import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

export default function Catalog() {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const CATEGORIES = [
    { value: "All", label: t("cat_all") },
    { value: "Cement Bags", label: t("cat_cement") },
    { value: "TMT Steel Rods", label: t("cat_steel") },
    { value: "Sand & Aggregates", label: t("cat_aggregates") },
    { value: "Binding Wire & Accessories", label: t("cat_wire") },
  ];

  useEffect(() => {
    setLoading(true);
    api.get("/products").then((r) => setProducts(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (q && !`${p.title} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, category, q]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="catalog-page">
      <Header />

      <section className="bg-[#0F172A] py-12 relative overflow-hidden">
        <div className="absolute inset-0 industrial-stripe opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-xs font-bold uppercase tracking-widest text-[#D97706]">{t("full_range")}</div>
          <h1 className="font-condensed uppercase font-black text-white text-4xl sm:text-5xl mt-2" data-testid="catalog-title">
            {t("product_catalog")}
          </h1>
          <p className="text-slate-300 mt-2 max-w-2xl text-sm sm:text-base">
            {t("catalog_desc")}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder={t("search_placeholder")}
              className="pl-10 h-11"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="catalog-search"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0" data-testid="category-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`chip ${category === c.value ? "chip-active" : ""}`}
              data-testid={`category-${c.value.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">{t("loading_products")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="font-heading text-xl font-bold">{t("no_products")}</p>
            <p className="text-sm mt-1">{t("try_different")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}
