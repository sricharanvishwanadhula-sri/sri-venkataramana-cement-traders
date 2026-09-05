import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

const WHATSAPP = "919440828759";

export default function BookMeeting() {
  const { t } = useLang();
  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    site_location: "",
    materials_required: "",
    preferred_datetime: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.mobile || !form.site_location) {
      toast.error("Please fill name, mobile, and location");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/meetings", form);
      setSubmitted(true);
      toast.success("Meeting booked!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    const text = [
      `*Meeting Request — Sri Venkataramana Cement Traders*`,
      ``,
      `*Name:* ${form.full_name}`,
      `*Mobile:* ${form.mobile}`,
      `*Site:* ${form.site_location}`,
      form.materials_required ? `*Materials:* ${form.materials_required}` : null,
      form.preferred_datetime ? `*Preferred Date:* ${form.preferred_datetime}` : null,
      form.notes ? `*Notes:* ${form.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="book-meeting-page">
      <Header />

      <section className="bg-[#0F172A] py-12 relative overflow-hidden">
        <div className="absolute inset-0 industrial-stripe opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-xs font-bold uppercase tracking-widest text-[#D97706]">{t("consultation")}</div>
          <h1 className="font-condensed uppercase font-black text-white text-4xl sm:text-5xl mt-2" data-testid="meeting-title">
            {t("book_site_visit")}
          </h1>
          <p className="text-slate-300 mt-2 max-w-2xl text-sm sm:text-base">
            {t("meeting_desc")}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {submitted ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center" data-testid="meeting-success">
            <CheckCircle className="w-14 h-14 text-[#15803D] mx-auto" />
            <h2 className="font-heading font-bold text-2xl mt-4 text-[#0F172A]">{t("meeting_booked")}</h2>
            <p className="text-slate-500 mt-2 text-sm">
              {t("meeting_booked_desc")}
            </p>
            <Button
              onClick={sendWhatsApp}
              className="mt-6 h-12 bg-[#15803D] hover:bg-[#166534] text-white font-heading font-bold uppercase tracking-wide px-8"
              data-testid="meeting-whatsapp-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> {t("send_to_whatsapp")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-4" data-testid="meeting-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("full_name")}</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="meeting-name" />
              </div>
              <div>
                <Label>{t("phone_number")}</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} data-testid="meeting-mobile" />
              </div>
            </div>
            <div>
              <Label>{t("project_site_location")}</Label>
              <Input value={form.site_location} onChange={(e) => setForm({ ...form, site_location: e.target.value })} placeholder={t("village_placeholder")} data-testid="meeting-location" />
            </div>
            <div>
              <Label>{t("materials_required")}</Label>
              <Textarea value={form.materials_required} onChange={(e) => setForm({ ...form, materials_required: e.target.value })} placeholder={t("materials_placeholder")} rows={3} data-testid="meeting-materials" />
            </div>
            <div>
              <Label>{t("preferred_datetime")}</Label>
              <Input type="datetime-local" value={form.preferred_datetime} onChange={(e) => setForm({ ...form, preferred_datetime: e.target.value })} data-testid="meeting-datetime" />
            </div>
            <div>
              <Label>{t("additional_notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} data-testid="meeting-notes" />
            </div>

            <Button
              type="submit"
              className="btn-amber w-full h-12 font-heading font-bold uppercase tracking-wider"
              disabled={submitting}
              data-testid="meeting-submit-btn"
            >
              {submitting ? t("booking") : t("book_meeting_btn")}
            </Button>
          </form>
        )}
      </section>

      <Footer />
    </div>
  );
}
