import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Store, ShieldCheck, MessageCircle, Zap, ArrowRight, MapPin, Clock, Phone, Package } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

const WHATSAPP = "919440828759";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [shop, setShop] = useState(null);
  const { t } = useLang();

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data.slice(0, 4))).catch(() => {});
    api.get("/settings/public").then((r) => setShop(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="home-page">
      <Header />

      <section className="relative overflow-hidden bg-[#0F172A]">
        <img
          src="https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
          alt="Construction Site"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 hero-vignette"></div>
        <div className="absolute inset-0 industrial-stripe"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#D97706]/20 border border-[#D97706] px-3 py-1.5 rounded-sm mb-6" data-testid="hero-badge">
              <Zap className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#FEF3C7]">
                {t("hero_badge")}
              </span>
            </div>
            <h1 className="font-condensed uppercase text-white text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight" data-testid="hero-heading">
              {t("hero_h1_a")}<br />
              <span className="text-[#D97706]">{t("hero_h1_b")}</span>
            </h1>
            <p className="mt-6 text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              {t("hero_desc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalog">
                <Button className="btn-amber h-12 px-6 font-heading font-bold uppercase tracking-wider" data-testid="hero-browse-btn">
                  {t("browse_catalog")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/track">
                <Button className="h-12 px-6 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#0F172A] font-heading font-bold uppercase tracking-wider" data-testid="hero-track-btn">
                  <Package className="w-4 h-4 mr-2" /> {t("track_order")}
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg">
              <div>
                <div className="font-mono-price font-bold text-[#D97706] text-2xl sm:text-3xl">15+</div>
                <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">{t("stat_years")}</div>
              </div>
              <div>
                <div className="font-mono-price font-bold text-[#D97706] text-2xl sm:text-3xl">7+</div>
                <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">{t("stat_brands")}</div>
              </div>
              <div>
                <div className="font-mono-price font-bold text-[#D97706] text-2xl sm:text-3xl">2000+</div>
                <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">{t("stat_customers")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: t("usp1_title"), desc: t("usp1_desc") },
            { icon: ShieldCheck, title: t("usp2_title"), desc: t("usp2_desc") },
            { icon: Store, title: t("usp3_title"), desc: t("usp3_desc") },
          ].map((u, i) => (
            <div key={i} className="p-6 bg-white border border-slate-200 rounded-lg flex gap-4" data-testid={`usp-card-${i}`}>
              <div className="w-12 h-12 bg-[#0F172A] rounded flex items-center justify-center shrink-0">
                <u.icon className="w-6 h-6 text-[#D97706]" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-lg text-[#0F172A]">{u.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#D97706]">
              {t("featured_eyebrow")}
            </div>
            <h2 className="font-condensed uppercase font-black text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] mt-2">
              {t("featured_title")}
            </h2>
          </div>
          <Link to="/catalog" className="text-sm font-bold uppercase tracking-wider text-[#D97706] hover:underline" data-testid="featured-view-all">
            {t("view_all")}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Shop location / pickup info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" data-testid="shop-info-section">
        <div className="bg-[#0F172A] rounded-lg p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 industrial-stripe opacity-40"></div>
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#D97706]/20 border border-[#D97706] px-3 py-1 rounded-sm mb-4">
                <Store className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#FEF3C7]">
                  {shop?.is_open ? t("shop_open") : t("shop_closed")}
                </span>
              </div>
              <h3 className="font-condensed uppercase font-black text-white text-3xl sm:text-4xl leading-tight">
                {t("cta_h_a")}<br />
                <span className="text-[#D97706]">{t("cta_h_b")}</span>
              </h3>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[#D97706] mt-0.5" /><span>{shop?.address || "Andhra Pradesh, India"}</span></div>
                <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-[#D97706] mt-0.5" /><span>{shop?.opening_hours || "Mon–Sat 8:00 AM – 8:00 PM"}</span></div>
                <div className="flex items-start gap-2"><Phone className="w-4 h-4 text-[#D97706] mt-0.5" /><a href={`tel:+${WHATSAPP}`} className="hover:text-[#D97706]">+91 94408 28759</a></div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
                <Button className="btn-amber h-12 px-6 font-heading font-bold uppercase tracking-wider w-full sm:w-auto" data-testid="cta-whatsapp-btn">
                  <MessageCircle className="w-4 h-4 mr-2" /> {t("chat_whatsapp")}
                </Button>
              </a>
              <a href={`tel:+${WHATSAPP}`}>
                <Button className="h-12 px-6 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#0F172A] font-heading font-bold uppercase tracking-wider w-full sm:w-auto" data-testid="cta-call-btn">
                  <Phone className="w-4 h-4 mr-2" /> {t("call_shop")}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}
