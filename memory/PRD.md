# Sri Venkataramana Cement Traders — PRD

## Original Problem Statement
> "can i build a complete web app for my cement and steel business and which handles payments and book meetings and orders at one place and very easy to use"

User elaborated (in Telugu): no customer login, orders via WhatsApp direct, only admin has login. Payments via UPI with rotation across multiple UPIs after ₹3 lakh / 2 days limit per UPI. Admin can add products with photos, multiple brands per product with editable prices and stock.

## Architecture
- **Backend**: FastAPI + MongoDB (motor), JWT admin auth via bcrypt, UPI rotation logic based on 2-day order aggregation.
- **Frontend**: React (Craco) + shadcn/ui + Tailwind. Industrial design system (Outfit/Barlow Condensed/Plus Jakarta Sans/JetBrains Mono), amber gold `#D97706` + gunmetal slate `#0F172A` palette.
- **Storage**: Product images stored as data URLs / URLs in MongoDB.
- **Auth**: Admin-only. JWT bearer token in localStorage.

## User Personas
1. **Guest customer** – browses catalog, adds items to cart, submits order → gets active UPI QR + WhatsApp deeplink to confirm.
2. **Meeting requester** – submits site-visit form, backend saves + user forwards to WhatsApp.
3. **Admin (owner)** – logs in, manages products (with brand-wise pricing/stock/photos), UPI accounts, views orders & meetings, updates statuses.

## Core Requirements (static)
- Guest browsing, no signup for customers.
- WhatsApp deeplink for order confirmation and meeting requests.
- Multi-brand pricing per product (each with editable price + stock).
- UPI rotation: pick first enabled UPI whose 2-day usage < limit; manual override supported.
- Admin JWT login, protected admin routes.

## What's Implemented (2026-02)
- Backend: /api/auth/login, /me, products CRUD (public GET, admin CUD), UPI CRUD + usage aggregation, active-UPI picker, orders create + admin list/status update, meetings create + admin list/status update, admin stats.
- Seeding: admin from .env, 2 default UPIs, 7 default products (cement, TMT steel, aggregates, binding wire) with brand variants.
- Frontend: Home hero, Catalog with search + category chips, Product cards with brand selector + qty + add to cart + Quick WhatsApp Quote, Cart drawer with 3-step checkout (items → details → UPI QR + WhatsApp button), Book Meeting page, Admin login, Admin dashboard tabs (Overview, Products with image upload + brand rows, UPI accounts with usage bars + force-active, Orders with status control + WhatsApp reply, Meetings).

## Admin Credentials
- Email: `sricharanvishwanadhula@gmail.com`
- Password: `Admin@12345`
- Route: `/admin`

## Backlog (P1/P2)
- P1: Order edit (change items/qty by admin)
- P1: Print/download order invoice PDF
- P1: Bulk product import CSV
- P2: Delivery tracking timeline for customers
- P2: Multi-language toggle (Telugu / English)
- P2: WhatsApp Business API automation (auto-reply)

## Next Tasks
- Testing agent verification of full flow.
- User can replace seeded product images from admin dashboard.
