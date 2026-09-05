import { createContext, useContext, useEffect, useState } from "react";

const dict = {
  en: {
    // Header
    home: "Home",
    catalog: "Catalog",
    book_meeting: "Book Meeting",
    admin: "Admin",
    whatsapp_us: "WhatsApp Us",
    admin_login: "Admin Login",

    // Home / Hero
    hero_badge: "Direct factory prices · Same-day delivery",
    hero_h1_a: "Cement, Steel",
    hero_h1_b: "Delivered Right.",
    hero_desc: "Trusted supplier of UltraTech, Tata Tiscon, JSW & more. Order in 60 seconds — pay via UPI, confirm on WhatsApp, and we deliver to your site.",
    browse_catalog: "Browse Catalog",
    whatsapp_order: "WhatsApp Order",
    stat_years: "Years",
    stat_brands: "Brands",
    stat_sites: "Sites Served",

    usp1_title: "Same-Day Site Delivery",
    usp1_desc: "Trucks dispatched within hours across AP",
    usp2_title: "100% Authentic Brands",
    usp2_desc: "UltraTech, Tata Tiscon, JSW & more",
    usp3_title: "WhatsApp Ordering",
    usp3_desc: "Chat, negotiate, confirm — instantly",

    featured_eyebrow: "Bestsellers",
    featured_title: "Featured Products",
    view_all: "View All →",

    cta_h_a: "Bulk Project?",
    cta_h_b: "Book a site visit.",
    cta_desc: "Get customized bulk pricing, delivery scheduling, and on-site consultation.",
    book_free_meeting: "Book Free Meeting",
    chat_whatsapp: "Chat on WhatsApp",

    // Catalog
    full_range: "Full Range",
    product_catalog: "Product Catalog",
    catalog_desc: "Browse cement, TMT steel rods, sand, aggregates and site accessories. Compare brands, check stock, and place your order in minutes.",
    search_placeholder: "Search products...",
    no_products: "No products found",
    try_different: "Try a different category or search term.",
    loading_products: "Loading products...",
    cat_all: "All",
    cat_cement: "Cement Bags",
    cat_steel: "TMT Steel Rods",
    cat_aggregates: "Sand & Aggregates",
    cat_wire: "Binding Wire & Accessories",

    // Product card
    brand: "Brand",
    per: "per",
    in_stock: "In Stock",
    low_stock: "Low",
    out_of_stock: "Out of Stock",
    add: "Add",
    quick_quote: "Quick Quote",

    // Cart
    your_cart: "Your Cart",
    delivery_details: "Delivery Details",
    complete_payment: "Complete Payment",
    cart_empty: "Your cart is empty",
    cart_empty_desc: "Add products from the catalog",
    total: "Total",
    proceed_checkout: "Proceed to Checkout",
    back: "Back",
    place_order: "Place Order",
    submitting: "Submitting...",
    confirm_whatsapp: "Confirm via WhatsApp",

    // Checkout form
    full_name: "Full Name *",
    phone_number: "Phone Number *",
    delivery_address: "Delivery Address *",
    site_contact: "Site Contact Person",
    delivery_date: "Delivery Date",
    notes: "Notes",

    // Payment
    payment_via_upi: "Payment via UPI",
    pay_to: "Pay to",
    copy_upi: "Copy UPI ID",
    active_upi_usage: "Active UPI (2-day usage:",
    payment_steps: "Steps:",
    step1: "Scan QR / pay to the UPI above",
    step2: "Take payment screenshot",
    step3: "Tap the WhatsApp button below to confirm your order with us",

    // Book meeting
    consultation: "Consultation",
    book_site_visit: "Book a Site Visit",
    meeting_desc: "Planning a bulk project? Let us come to your site with samples & bulk pricing.",
    meeting_booked: "Meeting Booked!",
    meeting_booked_desc: "We've received your request. Send it to WhatsApp for faster response.",
    send_to_whatsapp: "Send to WhatsApp",
    project_site_location: "Project Site Location *",
    materials_required: "Materials Required (approx.)",
    preferred_datetime: "Preferred Date & Time",
    additional_notes: "Additional Notes",
    book_meeting_btn: "Book Meeting",
    booking: "Booking...",
    village_placeholder: "Village / Town / District",
    materials_placeholder: "e.g. 500 bags OPC + 5 tons TMT Fe500D",

    // Footer
    quick_links: "Quick Links",
    product_catalog_link: "Product Catalog",
    book_meeting_link: "Book a Meeting",
    order_via_whatsapp: "Order via WhatsApp",
    contact: "Contact",
    whatsapp_chat: "WhatsApp Chat",
    tagline: "Trusted supplier of premium cement, TMT steel rods, and construction materials across Andhra Pradesh.",
    rights: "All rights reserved.",
    cement_steel_traders: "CEMENT & STEEL TRADERS",
  },
  te: {
    home: "హోమ్",
    catalog: "కేటలాగ్",
    book_meeting: "మీటింగ్ బుక్ చేయండి",
    admin: "అడ్మిన్",
    whatsapp_us: "వాట్సాప్ లో సంప్రదించండి",
    admin_login: "అడ్మిన్ లాగిన్",

    hero_badge: "నేరుగా ఫ్యాక్టరీ ధరలు · అదే రోజు డెలివరీ",
    hero_h1_a: "సిమెంట్, స్టీల్",
    hero_h1_b: "మీ సైట్ కి డైరెక్ట్.",
    hero_desc: "UltraTech, Tata Tiscon, JSW వంటి నమ్మకమైన బ్రాండ్ లకు అధీకృత సప్లయర్. 60 సెకన్లలో ఆర్డర్ చేయండి — UPI ద్వారా చెల్లించండి, WhatsApp లో confirm చేయండి, మేము మీ సైట్ కి డెలివరీ చేస్తాం.",
    browse_catalog: "కేటలాగ్ చూడండి",
    whatsapp_order: "వాట్సాప్ ఆర్డర్",
    stat_years: "సంవత్సరాలు",
    stat_brands: "బ్రాండ్లు",
    stat_sites: "సైట్లు సర్వ్ చేసాము",

    usp1_title: "అదే రోజు డెలివరీ",
    usp1_desc: "AP అంతటా గంటల్లో ట్రక్కులు పంపుతాము",
    usp2_title: "100% ఒరిజినల్ బ్రాండ్లు",
    usp2_desc: "UltraTech, Tata Tiscon, JSW ఇంకా చాలా",
    usp3_title: "వాట్సాప్ ఆర్డరింగ్",
    usp3_desc: "చాట్, రేటు మాట్లాడండి — తక్షణమే",

    featured_eyebrow: "బెస్ట్ సెల్లర్స్",
    featured_title: "ఫీచర్డ్ ప్రొడక్ట్స్",
    view_all: "అన్నీ చూడండి →",

    cta_h_a: "పెద్ద ప్రాజెక్ట్?",
    cta_h_b: "సైట్ విజిట్ బుక్ చేయండి.",
    cta_desc: "కస్టమైజ్డ్ బల్క్ ధరలు, డెలివరీ షెడ్యూలింగ్, సైట్ కి వచ్చి కన్సల్టేషన్ ఇస్తాము.",
    book_free_meeting: "ఉచిత మీటింగ్ బుక్ చేయండి",
    chat_whatsapp: "వాట్సాప్ లో చాట్",

    full_range: "పూర్తి రేంజ్",
    product_catalog: "ప్రొడక్ట్ కేటలాగ్",
    catalog_desc: "సిమెంట్, TMT స్టీల్ రాడ్స్, ఇసుక, కంకర, సైట్ యాక్సెసరీలు చూడండి. బ్రాండ్లను పోల్చండి, స్టాక్ చెక్ చేయండి, నిమిషాల్లో ఆర్డర్ చేయండి.",
    search_placeholder: "ప్రొడక్ట్స్ వెతకండి...",
    no_products: "ప్రొడక్ట్స్ దొరకలేదు",
    try_different: "వేరే కేటగిరీ లేదా సెర్చ్ ప్రయత్నించండి.",
    loading_products: "లోడ్ అవుతోంది...",
    cat_all: "అన్నీ",
    cat_cement: "సిమెంట్ బ్యాగ్స్",
    cat_steel: "TMT స్టీల్ రాడ్స్",
    cat_aggregates: "ఇసుక & కంకర",
    cat_wire: "బైండింగ్ వైర్ & యాక్సెసరీస్",

    brand: "బ్రాండ్",
    per: "ఒక",
    in_stock: "స్టాక్ లో ఉంది",
    low_stock: "తక్కువ",
    out_of_stock: "స్టాక్ లేదు",
    add: "యాడ్",
    quick_quote: "త్వరిత కోట్",

    your_cart: "మీ కార్ట్",
    delivery_details: "డెలివరీ వివరాలు",
    complete_payment: "పేమెంట్ పూర్తి చేయండి",
    cart_empty: "మీ కార్ట్ ఖాళీగా ఉంది",
    cart_empty_desc: "కేటలాగ్ నుండి ప్రొడక్ట్స్ యాడ్ చేయండి",
    total: "మొత్తం",
    proceed_checkout: "చెక్‌ఔట్ కి వెళ్ళండి",
    back: "వెనుకకు",
    place_order: "ఆర్డర్ చేయండి",
    submitting: "సబ్మిట్ చేస్తోంది...",
    confirm_whatsapp: "వాట్సాప్ లో కన్ఫర్మ్ చేయండి",

    full_name: "పూర్తి పేరు *",
    phone_number: "ఫోన్ నంబర్ *",
    delivery_address: "డెలివరీ చిరునామా *",
    site_contact: "సైట్ కాంటాక్ట్ వ్యక్తి",
    delivery_date: "డెలివరీ తేదీ",
    notes: "నోట్స్",

    payment_via_upi: "UPI ద్వారా పేమెంట్",
    pay_to: "ఎవరికి చెల్లించాలి",
    copy_upi: "UPI ID కాపీ",
    active_upi_usage: "యాక్టివ్ UPI (2 రోజుల వాడకం:",
    payment_steps: "దశలు:",
    step1: "పైన ఉన్న UPI QR స్కాన్ చేసి చెల్లించండి",
    step2: "పేమెంట్ స్క్రీన్‌షాట్ తీసుకోండి",
    step3: "క్రింది వాట్సాప్ బటన్ నొక్కి మీ ఆర్డర్ కన్ఫర్మ్ చేయండి",

    consultation: "కన్సల్టేషన్",
    book_site_visit: "సైట్ విజిట్ బుక్ చేయండి",
    meeting_desc: "పెద్ద ప్రాజెక్ట్ ప్లాన్ చేస్తున్నారా? మేము శాంపిల్స్ & బల్క్ ధరలతో మీ సైట్ కి వస్తాము.",
    meeting_booked: "మీటింగ్ బుక్ అయింది!",
    meeting_booked_desc: "మీ అభ్యర్థన అందుకున్నాము. త్వరిత స్పందన కోసం వాట్సాప్ కి పంపండి.",
    send_to_whatsapp: "వాట్సాప్ కి పంపండి",
    project_site_location: "ప్రాజెక్ట్ సైట్ లొకేషన్ *",
    materials_required: "అవసరమైన మెటీరియల్స్ (సుమారుగా)",
    preferred_datetime: "ప్రాధాన్య తేదీ & సమయం",
    additional_notes: "అదనపు నోట్స్",
    book_meeting_btn: "మీటింగ్ బుక్ చేయండి",
    booking: "బుక్ చేస్తోంది...",
    village_placeholder: "గ్రామం / పట్టణం / జిల్లా",
    materials_placeholder: "ఉదా. 500 బ్యాగ్స్ OPC + 5 టన్నుల TMT Fe500D",

    quick_links: "త్వరిత లింక్స్",
    product_catalog_link: "ప్రొడక్ట్ కేటలాగ్",
    book_meeting_link: "మీటింగ్ బుక్ చేయండి",
    order_via_whatsapp: "వాట్సాప్ ద్వారా ఆర్డర్",
    contact: "సంప్రదింపు",
    whatsapp_chat: "వాట్సాప్ చాట్",
    tagline: "ఆంధ్రప్రదేశ్ అంతటా ప్రీమియం సిమెంట్, TMT స్టీల్ రాడ్స్, నిర్మాణ సామగ్రి యొక్క నమ్మకమైన సప్లయర్.",
    rights: "అన్ని హక్కులు రక్షితం.",
    cement_steel_traders: "సిమెంట్ & స్టీల్ ట్రేడర్స్",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
  }, [lang]);

  const t = (key) => dict[lang]?.[key] || dict.en[key] || key;
  const toggle = () => setLang((l) => (l === "en" ? "te" : "en"));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
