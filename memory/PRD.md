# Sri Venkataramana Cement Traders — PRD

## Original Problem Statement
> "can i build a complete web app for my cement and steel business and which handles payments and book meetings and orders at one place and very easy to use"

Business model has since been frozen (v1.2): **strictly local shop pickup**. Customers browse live stock/prices, select items, pay an advance % online via UPI, and pay the balance at the shop. No customer login; tracking by phone number. Configurable Hamali (loading/unloading) charges. Public prices are the company listed MRP with a CTA to call/WhatsApp for negotiation. **No delivery, no transport management, no site-visit bookings.**

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT admin auth via bcrypt. UPI rotation based on 2-day *verified advance* aggregation.
- **Frontend**: React (Craco) + shadcn/ui + Tailwind. Industrial design (Outfit / Barlow Condensed / Plus Jakarta Sans / JetBrains Mono), amber `#D97706` + gunmetal `#0F172A`.
- **Storage**: Product images as data URLs / URLs in MongoDB. Object storage migration is on Sprint 4 backlog.
- **Auth**: Admin-only. JWT bearer in localStorage.

## User Personas
1. **Guest customer** — browses catalog, adds to cart, places pickup order, pays advance via UPI, tracks by phone or order code, collects at shop.
2. **Admin (owner)** — logs in, manages categories (with default Hamali), products (with brand-wise pricing/stock/HSN/GST/photos, optional Hamali override), UPI accounts, orders (status + payment verification with UTR).

## Core Requirements (frozen v1.2)
- Guest browsing, no signup for customers.
- Company listed price shown publicly with "Final price may vary — call for best rate" note.
- Multi-brand pricing per product (each with editable price + stock).
- Configurable Hamali per category (default) and per product (override); always shown as separate line item; never mixed into item price.
- Advance-percent selector at checkout: 25 / 50 / 100.
- UPI rotation: pick first enabled UPI whose 2-day *verified advance* usage < limit; manual override supported.
- Order tracking by phone number (last 90 days) or by order code.
- Admin JWT login, protected admin routes.

## What's Implemented (2026-02)
### Sprint 0 — MVP
- Admin JWT login, product CRUD, UPI CRUD, order + meeting create + admin status flows.
- Guest catalog, cart, WhatsApp order deeplinks, admin dashboard with UPI usage bars.
- Bulk product CSV import, Telugu language toggle.

### Sprint 1 — Pickup Alignment (2026-02, complete)
- Backend rewritten: pickup-only order model, `advance_percent` (25/50/100), `advance_amount`/`balance_amount`, per-item `hamali_amount`, HSN/GST fields, order status enum `PendingVerification → AdvanceReceived → ReadyForPickup → Completed | Cancelled`, order-code generator (`SVCT-XXXXXXXX`), UPI rotation now sums only VERIFIED advance receipts, dropped meetings collection.
- New endpoints: `GET /api/categories`, `POST /api/cart/quote`, `GET /api/orders/track?phone=`, `GET /api/orders/{code}`, `GET /api/settings/public`, admin categories CRUD, `PATCH /api/admin/orders/{id}` (status + verified + utr_ref).
- Frontend rewritten to pickup model:
  - Routes: `/`, `/catalog`, `/track`, `/order/:code`, `/quick-order`, `/admin`, `/admin/dashboard`. Removed `/book-meeting`.
  - `Header` — Track Order nav, tel: link, no meeting.
  - `Home` — pickup messaging, shop address block with hours + call/WhatsApp CTAs.
  - `ProductCard` — Hamali chip + hamali line, listed-price label, price-may-vary note, OOS shows Call + WhatsApp CTAs.
  - `Catalog` — categories fetched from `/api/categories`.
  - `CartDrawer` — live `/api/cart/quote` breakdown (subtotal / hamali / GST / total), advance-% radio (25/50/100), advance & balance rows, pickup-only fields (name + phone + notes), redirect to `/order/:code` after order.
  - `OrderConfirmation` — pickup slip with items + hamali per line, totals, advance/balance, shop address, WhatsApp order-slip button.
  - `TrackOrder` — phone lookup lists last 90 days of orders with status badges.
  - `QuickOrder` — single-page order form (product+brand rows, advance %, contact) for repeat buyers.
  - `AdminDashboard` — Overview + Products (HSN/GST + Hamali override) + **Categories tab** (Hamali defaults) + UPI + Orders (status enum, filter, UTR + Verify button). Meetings tab removed.

## Admin Credentials
- Email: `sricharanvishwanadhula@gmail.com`
- Password: `Admin@12345`
- Route: `/admin`

## Backlog
### Sprint 2 — Legal + Speed (P1)
- GST Tax Invoice PDF download from order confirmation & admin.
- Quick Price Grid on Admin Products (edit all prices at once).
- Admin orders search + pagination.
- Rate limiting on login.
- Payment screenshot upload for customer (with UTR).

### Sprint 3 — Everyday Ops (P2)
- Low-stock WhatsApp alert to owner (cron on `.emergent/crons.yml`).
- Purchase / inward stock entry log.
- Wholesale price + MOQ threshold (admin-only, never exposed publicly).
- Admin **Settings** tab (shop_name, address, maps_url, opening_hours, is_open, default_advance_percent, default_low_stock, apply_gst_on_hamali).

### Sprint 4 — Growth & Polish (P3)
- Quotations module (send price quote via WhatsApp).
- Analytics tab (top brands, category revenue, UPI utilization).
- Object-storage migration for product images.
- Telugu voice ordering.

## Next Tasks
- User verification of Sprint 1 pickup flow end-to-end (browse → cart → advance → order → track → admin verify).
- Kick off Sprint 2 planning after acceptance.
