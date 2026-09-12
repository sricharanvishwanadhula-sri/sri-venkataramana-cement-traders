import { Link } from "react-router-dom";
import { MessageCircle, MapPin, Phone } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-[#0F172A] text-slate-300 mt-20 border-t border-[#334155]" data-testid="app-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#D97706] flex items-center justify-center rounded-sm">
              <span className="font-heading font-black text-white">SV</span>
            </div>
            <div className="font-condensed text-white uppercase text-xl font-black leading-tight">
              Sri Venkataramana<br />
              <span className="text-xs text-slate-400 font-semibold tracking-widest">{t("cement_steel_traders")}</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t("tagline")}
          </p>
        </div>

        <div>
          <h4 className="font-heading font-bold uppercase text-white mb-4 text-sm tracking-widest">{t("quick_links")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-[#D97706]" data-testid="footer-catalog-link">{t("product_catalog_link")}</Link></li>
            <li><Link to="/track" className="hover:text-[#D97706]" data-testid="footer-track-link">{t("track_order_link")}</Link></li>
            <li><Link to="/quick-order" className="hover:text-[#D97706]" data-testid="footer-quick-order-link">{t("quick_order_link")}</Link></li>
            <li><a href="https://wa.me/919440828759" target="_blank" rel="noreferrer" className="hover:text-[#D97706]">{t("order_via_whatsapp")}</a></li>
            <li><Link to="/admin" className="hover:text-[#D97706] text-xs uppercase tracking-widest text-slate-500" data-testid="footer-admin-link">{t("admin_login")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold uppercase text-white mb-4 text-sm tracking-widest">{t("contact")}</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-[#D97706] mt-0.5" />
              <a href="tel:+919440828759" className="hover:text-[#D97706]">+91 94408 28759</a>
            </li>
            <li className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-[#D97706] mt-0.5" />
              <a href="https://wa.me/919440828759" target="_blank" rel="noreferrer" className="hover:text-[#D97706]">{t("whatsapp_chat")}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#D97706] mt-0.5" />
              <span>Andhra Pradesh, India</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#1E293B] py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Sri Venkataramana Cement Traders. {t("rights")}
      </div>
    </footer>
  );
}
