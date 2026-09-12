import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const dict = {
  en: {
    // Header / nav
    home: "Home",
    catalog: "Catalog",
    track_order: "Track Order",
    admin: "Admin",
    whatsapp_us: "WhatsApp Us",
    admin_login: "Admin Login",
    quick_order_link: "Quick Order",

    // Home / Hero
    hero_badge: "Local shop pickup · Live prices · Pay advance online",
    hero_h1_a: "Cement, Steel",
    hero_h1_b: "at Live Shop Prices.",
    hero_desc: "See today's prices and stock. Pay advance online via UPI, pick up materials from our shop. Simple, fast, transparent.",
    browse_catalog: "Browse Catalog",
    call_shop: "Call the Shop",
    stat_years: "Years",
    stat_brands: "Brands",
    stat_customers: "Regulars",
    shop_open: "Shop Open Now",
    shop_closed: "Shop Closed",
    view_on_maps: "View on Maps",
    chat_whatsapp: "Chat on WhatsApp",
    cta_h_a: "Pickup made",
    cta_h_b: "easy.",

    usp1_title: "Live Prices & Stock",
    usp1_desc: "Prices update daily. Stock is real-time.",
    usp2_title: "100% Authentic Brands",
    usp2_desc: "UltraTech, Tata Tiscon, JSW & more",
    usp3_title: "Advance Online, Pickup Later",
    usp3_desc: "Pay a small advance via UPI. Collect from shop.",

    featured_eyebrow: "Bestsellers",
    featured_title: "Featured Products",
    view_all: "View All →",

    // Catalog
    full_range: "Full Range",
    product_catalog: "Product Catalog",
    catalog_desc: "See live prices and stock. Prices are the company listed rate. For best rate, call or WhatsApp.",
    search_placeholder: "Search products...",
    no_products: "No products found",
    try_different: "Try a different category or search term.",
    loading_products: "Loading products...",
    cat_all: "All",

    // Product card
    brand: "Brand",
    per: "per",
    in_stock: "In Stock",
    low_stock: "Low",
    out_of_stock: "Out of Stock",
    add: "Add",
    listed_price: "Listed price",
    price_may_vary: "Final price may vary — call for best rate",
    call_for_best_price: "Call for Best Price",
    whatsapp_short: "WhatsApp",
    hamali_extra: "Hamali extra",

    // Cart
    your_cart: "Your Cart",
    your_info: "Your Info",
    complete_payment: "Advance Payment",
    cart_empty: "Your cart is empty",
    cart_empty_desc: "Add products from the catalog",
    subtotal: "Subtotal",
    hamali_line: "Hamali",
    gst_line: "GST",
    total: "Total",
    proceed_checkout: "Proceed to Checkout",
    back: "Back",
    submitting: "Placing order...",
    confirm_whatsapp: "Confirm on WhatsApp",
    price_disclaimer: "Prices are company listed rates. For a better price on bulk, call us before checkout.",
    upi_copied: "UPI ID copied",
    order_placed_toast: "Order placed! Pay advance & confirm via WhatsApp.",
    order_placed_success: "Order placed successfully",
    balance_at_pickup: "Balance at pickup",
    name_phone_required: "Name and phone required",

    // Cart form
    full_name: "Full Name *",
    phone_number: "Phone Number *",
    order_notes: "Notes (optional)",
    pickup_info_title: "Pickup at our shop",
    pickup_info_desc: "Enter your name and phone. Balance will be paid at the counter when you collect.",

    // Advance payment
    advance_label: "Advance to pay now",
    balance_label: "Balance on pickup",
    place_order_pay: "Place Order & Show QR",
    payment_via_upi: "Pay Advance via UPI",
    pay_to: "Pay to",
    copy_upi: "Copy UPI ID",
    payment_steps: "Steps:",
    step1: "Scan the QR / pay to the UPI above",
    step2: "Take payment screenshot",
    step3: "Tap Confirm on WhatsApp — we verify and confirm your order",

    // Order confirmation
    order_confirmed: "Order Placed",
    order_code_label: "Order Code",
    pickup_slip: "Pickup Slip",
    pickup_instructions: "Show this slip at the shop counter when you collect",
    shop_address: "Shop Address",
    opening_hours_label: "Opening Hours",
    advance_paid: "Advance to Pay",
    balance_due: "Balance at Pickup",
    order_status: "Status",
    contact_shop: "Contact Shop",
    send_order_whatsapp: "Send Order Slip to Shop WhatsApp",
    view_on_map: "View on Map",
    call_for_future_bulk: "You paid the listed rate. For future bulk orders, call us for a better price.",

    // Status labels
    status_pending: "Pending Verification",
    status_advance_received: "Advance Received",
    status_ready_pickup: "Ready for Pickup",
    status_completed: "Completed",
    status_cancelled: "Cancelled",

    // Track order page
    track_title: "Track My Order",
    track_desc: "Enter the phone number used at checkout. See all orders from the last 90 days.",
    track_phone_placeholder: "Enter your phone number",
    track_btn: "Find My Orders",
    track_no_orders: "No orders found for this phone number.",
    track_searching: "Searching...",

    // Quick order
    quick_order_eyebrow: "Fast Checkout",
    quick_order_title: "Quick Order",
    quick_order_desc: "Pick items on a single page, pay advance, and collect from the shop.",
    items_label: "Items",
    add_item: "Add Item",
    product_label: "Product",
    select_product: "Select product",
    qty: "Qty",
    add_at_least_one: "Add at least one item",

    // Footer
    quick_links: "Quick Links",
    product_catalog_link: "Product Catalog",
    track_order_link: "Track Order",
    order_via_whatsapp: "Order via WhatsApp",
    contact: "Contact",
    whatsapp_chat: "WhatsApp Chat",
    tagline: "Live prices and stock. Pay advance online, pickup from our local shop.",
    rights: "All rights reserved.",
    cement_steel_traders: "CEMENT & STEEL TRADERS",

    // Stock validation
    insufficient_stock: "Not enough stock",
    max_available: "Max available",
  },

  te: {
    home: "హోమ్",
    catalog: "కేటలాగ్",
    track_order: "ఆర్డర్ ట్రాక్",
    admin: "అడ్మిన్",
    whatsapp_us: "వాట్సాప్ లో సంప్రదించండి",
    admin_login: "అడ్మిన్ లాగిన్",
    quick_order_link: "త్వరిత ఆర్డర్",

    hero_badge: "షాప్ పికప్ · లైవ్ ధరలు · ఆన్‌లైన్ అడ్వాన్స్",
    hero_h1_a: "సిమెంట్, స్టీల్",
    hero_h1_b: "లైవ్ షాప్ ధరలలో.",
    hero_desc: "నేటి ధరలు & స్టాక్ చూడండి. UPI ద్వారా అడ్వాన్స్ చెల్లించండి, మా షాప్ నుండి తీసుకోండి. సులభం, వేగవంతం, పారదర్శకం.",
    browse_catalog: "కేటలాగ్ చూడండి",
    call_shop: "షాప్ కి కాల్",
    stat_years: "సంవత్సరాలు",
    stat_brands: "బ్రాండ్లు",
    stat_customers: "నిత్య వినియోగదారులు",
    shop_open: "షాప్ ఇప్పుడు ఓపెన్",
    shop_closed: "షాప్ మూసివేయబడింది",
    view_on_maps: "మ్యాప్‌లో చూడండి",
    chat_whatsapp: "వాట్సాప్ చాట్",
    cta_h_a: "పికప్",
    cta_h_b: "సులభం.",

    usp1_title: "లైవ్ ధరలు & స్టాక్",
    usp1_desc: "ధరలు రోజువారీగా అప్‌డేట్. స్టాక్ రియల్-టైమ్.",
    usp2_title: "100% ఒరిజినల్ బ్రాండ్లు",
    usp2_desc: "UltraTech, Tata Tiscon, JSW ఇంకా చాలా",
    usp3_title: "ఆన్‌లైన్ అడ్వాన్స్, తర్వాత పికప్",
    usp3_desc: "UPI ద్వారా చిన్న అడ్వాన్స్. షాప్ నుండి తీసుకోండి.",

    featured_eyebrow: "బెస్ట్ సెల్లర్స్",
    featured_title: "ఫీచర్డ్ ప్రొడక్ట్స్",
    view_all: "అన్నీ చూడండి →",

    full_range: "పూర్తి రేంజ్",
    product_catalog: "ప్రొడక్ట్ కేటలాగ్",
    catalog_desc: "లైవ్ ధరలు & స్టాక్ చూడండి. ఇవి కంపెనీ లిస్టెడ్ ధరలు. మంచి ధర కోసం కాల్ లేదా WhatsApp చేయండి.",
    search_placeholder: "ప్రొడక్ట్స్ వెతకండి...",
    no_products: "ప్రొడక్ట్స్ దొరకలేదు",
    try_different: "వేరే కేటగిరీ లేదా సెర్చ్ ప్రయత్నించండి.",
    loading_products: "లోడ్ అవుతోంది...",
    cat_all: "అన్నీ",

    brand: "బ్రాండ్",
    per: "ఒక",
    in_stock: "స్టాక్ లో ఉంది",
    low_stock: "తక్కువ",
    out_of_stock: "స్టాక్ లేదు",
    add: "యాడ్",
    listed_price: "లిస్టెడ్ ధర",
    price_may_vary: "చివరి ధర మారవచ్చు — మంచి ధర కోసం కాల్ చేయండి",
    call_for_best_price: "మంచి ధర కోసం కాల్",
    whatsapp_short: "WhatsApp",
    hamali_extra: "హమాలీ అదనంగా",

    your_cart: "మీ కార్ట్",
    your_info: "మీ వివరాలు",
    complete_payment: "అడ్వాన్స్ చెల్లింపు",
    cart_empty: "మీ కార్ట్ ఖాళీగా ఉంది",
    cart_empty_desc: "కేటలాగ్ నుండి ప్రొడక్ట్స్ యాడ్ చేయండి",
    subtotal: "సబ్‌టోటల్",
    hamali_line: "హమాలీ",
    gst_line: "GST",
    total: "మొత్తం",
    proceed_checkout: "చెక్‌ఔట్ కి వెళ్ళండి",
    back: "వెనుకకు",
    submitting: "ఆర్డర్ ఇస్తున్నాము...",
    confirm_whatsapp: "వాట్సాప్ లో కన్ఫర్మ్",
    price_disclaimer: "ఇవి కంపెనీ లిస్టెడ్ ధరలు. బల్క్ ఆర్డర్ కి మంచి ధర కావాలంటే చెక్‌ఔట్ ముందు కాల్ చేయండి.",
    upi_copied: "UPI ID కాపీ అయింది",
    order_placed_toast: "ఆర్డర్ ఇచ్చారు! అడ్వాన్స్ చెల్లించి వాట్సాప్ లో కన్ఫర్మ్ చేయండి.",
    order_placed_success: "ఆర్డర్ విజయవంతంగా ఇచ్చారు",
    balance_at_pickup: "పికప్ దగ్గర బ్యాలెన్స్",
    name_phone_required: "పేరు మరియు ఫోన్ అవసరం",

    full_name: "పూర్తి పేరు *",
    phone_number: "ఫోన్ నంబర్ *",
    order_notes: "గమనికలు (ఆప్షనల్)",
    pickup_info_title: "మా షాప్ లో పికప్",
    pickup_info_desc: "పేరు మరియు ఫోన్ ఇవ్వండి. తీసుకునేటప్పుడు షాప్ దగ్గర బ్యాలెన్స్ చెల్లించండి.",

    advance_label: "ఇప్పుడు చెల్లించే అడ్వాన్స్",
    balance_label: "పికప్ దగ్గర బ్యాలెన్స్",
    place_order_pay: "ఆర్డర్ ఇచ్చి QR చూడండి",
    payment_via_upi: "UPI ద్వారా అడ్వాన్స్ చెల్లించండి",
    pay_to: "ఎవరికి చెల్లించాలి",
    copy_upi: "UPI ID కాపీ",
    payment_steps: "దశలు:",
    step1: "పైన ఉన్న QR స్కాన్ చేసి చెల్లించండి",
    step2: "పేమెంట్ స్క్రీన్‌షాట్ తీసుకోండి",
    step3: "వాట్సాప్ లో కన్ఫర్మ్ నొక్కండి — మేము వెరిఫై చేసి ఆర్డర్ కన్ఫర్మ్ చేస్తాము",

    order_confirmed: "ఆర్డర్ ఇచ్చారు",
    order_code_label: "ఆర్డర్ కోడ్",
    pickup_slip: "పికప్ స్లిప్",
    pickup_instructions: "మెటీరియల్స్ తీసుకునేటప్పుడు షాప్ కౌంటర్ దగ్గర ఈ స్లిప్ చూపించండి",
    shop_address: "షాప్ చిరునామా",
    opening_hours_label: "ఓపెనింగ్ అవర్స్",
    advance_paid: "చెల్లించాల్సిన అడ్వాన్స్",
    balance_due: "పికప్ దగ్గర బ్యాలెన్స్",
    order_status: "స్థితి",
    contact_shop: "షాప్ ని సంప్రదించండి",
    send_order_whatsapp: "ఆర్డర్ స్లిప్ ని షాప్ వాట్సాప్ కి పంపండి",
    view_on_map: "మ్యాప్ లో చూడండి",
    call_for_future_bulk: "మీరు లిస్టెడ్ ధర చెల్లించారు. తరువాత బల్క్ ఆర్డర్ కి మంచి ధర కావాలంటే కాల్ చేయండి.",

    status_pending: "వెరిఫికేషన్ పెండింగ్",
    status_advance_received: "అడ్వాన్స్ అందింది",
    status_ready_pickup: "పికప్ కి రెడీ",
    status_completed: "పూర్తయింది",
    status_cancelled: "రద్దు చేయబడింది",

    track_title: "నా ఆర్డర్ ట్రాక్",
    track_desc: "చెక్‌ఔట్ లో ఇచ్చిన ఫోన్ నంబర్ ఇవ్వండి. చివరి 90 రోజుల ఆర్డర్లు చూపిస్తాము.",
    track_phone_placeholder: "మీ ఫోన్ నంబర్ ఇవ్వండి",
    track_btn: "నా ఆర్డర్లు వెతకండి",
    track_no_orders: "ఈ ఫోన్ కి ఆర్డర్లు లేవు.",
    track_searching: "వెతుకుతోంది...",

    quick_order_eyebrow: "వేగవంతమైన చెక్‌ఔట్",
    quick_order_title: "త్వరిత ఆర్డర్",
    quick_order_desc: "ఒకే పేజీలో అన్నీ ఎంచుకోండి, అడ్వాన్స్ చెల్లించి షాప్ నుండి తీసుకోండి.",
    items_label: "వస్తువులు",
    add_item: "వస్తువు జోడించండి",
    product_label: "ప్రొడక్ట్",
    select_product: "ప్రొడక్ట్ ఎంచుకోండి",
    qty: "పరిమాణం",
    add_at_least_one: "కనీసం ఒక వస్తువు జోడించండి",

    quick_links: "త్వరిత లింక్స్",
    product_catalog_link: "ప్రొడక్ట్ కేటలాగ్",
    track_order_link: "ఆర్డర్ ట్రాక్",
    order_via_whatsapp: "వాట్సాప్ ద్వారా ఆర్డర్",
    contact: "సంప్రదింపు",
    whatsapp_chat: "వాట్సాప్ చాట్",
    tagline: "లైవ్ ధరలు మరియు స్టాక్. ఆన్‌లైన్ అడ్వాన్స్ చెల్లించి, మా లోకల్ షాప్ నుండి తీసుకోండి.",
    rights: "అన్ని హక్కులు రక్షితం.",
    cement_steel_traders: "సిమెంట్ & స్టీల్ ట్రేడర్స్",

    insufficient_stock: "తగినంత స్టాక్ లేదు",
    max_available: "గరిష్ఠ లభ్యత",
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

  const t = useCallback((key) => dict[lang]?.[key] || dict.en[key] || key, [lang]);
  const toggle = useCallback(() => setLang((l) => (l === "en" ? "te" : "en")), []);

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, toggle, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
