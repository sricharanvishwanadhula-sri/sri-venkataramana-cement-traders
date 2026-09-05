import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, Phone, Languages } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const WHATSAPP = "919440828759";

export default function Header() {
  const { totalItems, setOpen } = useCart();
  const { lang, toggle, t } = useLang();
  const nav = useNavigate();

  const navLinks = [
    { to: "/", label: t("home"), key: "home" },
    { to: "/catalog", label: t("catalog"), key: "catalog" },
    { to: "/book-meeting", label: t("book_meeting"), key: "book-meeting" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0F172A] border-b border-[#334155]" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#D97706] flex items-center justify-center rounded-sm rotate-3">
            <span className="font-heading font-black text-white text-lg">SV</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-condensed text-white text-xl leading-none uppercase font-black tracking-wide">
              Sri Venkataramana
            </div>
            <div className="text-[10px] text-[#94A3B8] uppercase tracking-widest mt-0.5">
              {t("cement_steel_traders")}
            </div>
          </div>
          <div className="sm:hidden font-condensed text-white text-lg uppercase font-black">SVCT</div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-slate-300 hover:text-[#D97706] font-semibold text-sm uppercase tracking-wide transition"
              data-testid={`nav-${l.key}`}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-slate-300 hover:text-[#D97706] font-semibold text-sm"
            data-testid="header-whatsapp"
          >
            <Phone className="w-4 h-4" /> +91 94408 28759
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex items-center gap-1 px-3 h-10 bg-[#1E293B] hover:bg-[#334155] rounded-md text-white text-xs font-bold uppercase tracking-wider transition"
            data-testid="lang-toggle"
            title="Switch language"
          >
            <Languages className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === "en" ? "తెలుగు" : "English"}</span>
            <span className="sm:hidden">{lang === "en" ? "తె" : "EN"}</span>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="relative p-2.5 bg-[#1E293B] hover:bg-[#334155] rounded-md text-white transition"
            data-testid="header-cart-btn"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 bg-[#D97706] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                data-testid="cart-count"
              >
                {totalItems}
              </span>
            )}
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2.5 bg-[#1E293B] rounded-md text-white" data-testid="menu-btn">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0F172A] border-l-[#334155] w-72">
              <div className="mt-8 space-y-1">
                {navLinks.map((l) => (
                  <button
                    key={l.to}
                    onClick={() => nav(l.to)}
                    className="w-full text-left py-3 px-3 text-white hover:bg-[#1E293B] rounded-md font-semibold uppercase text-sm"
                    data-testid={`mobile-nav-${l.key}`}
                  >
                    {l.label}
                  </button>
                ))}
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-3 px-3 text-[#D97706] hover:bg-[#1E293B] rounded-md font-semibold text-sm"
                >
                  {t("whatsapp_us")}
                </a>
                <button
                  onClick={() => nav("/admin")}
                  className="w-full text-left py-3 px-3 text-slate-400 hover:bg-[#1E293B] rounded-md text-xs uppercase tracking-widest"
                  data-testid="mobile-nav-admin"
                >
                  {t("admin")}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
