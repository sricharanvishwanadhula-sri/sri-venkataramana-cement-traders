# Approved: locked, pickup-only checkout
Preserve CRA and catalogue. No live provider calls, fake OTPs/payments or zero-fee promises. Full payment in one transaction; no delivery. Historical records remain admin-only, separate from provider-confirmed orders.

## Files
- backend/models/checkout.py, lib/checkout_security.py, routers/checkout.py: contracts, safeguards, drafts and admin setup/details
- backend/server.py: legacy bypass closure, 100% pricing, protected records, router registration
- frontend/src/lib/api.ts (migrate api.js), checkout-types.ts: relative typed API
- frontend/src/components/CheckoutForm.tsx, CartDrawer.tsx (replace JSX): guarded checkout
- frontend/src/pages/QuickOrder.tsx, PrivateOrderAccess.tsx: shared checkout/private tracking
- frontend/src/components/AdminCommerce.tsx, PaymentSetup.tsx: paid/draft/history and setup guide
- frontend/src/App.js, App.css, pages/AdminDashboard.jsx, components/Header.jsx, context/LanguageContext.jsx: wiring and accurate copy
- frontend/package.json, tsconfig.json, jsconfig.json, public/index.html: TS support and metadata
- memory/SPEC.md, PRD.md, PAYMENT_SETUP.md: scope and activation requirements

## Verification
Public-URL API smoke, bypass rejection and stock/order invariants; yarn typecheck; one public browser flow saving a nonpayable draft and inspecting it in admin. Escalate on any gate failure. Credentials unchanged.