# Sri Venkataramana Cement Traders — living specification

## Approved scope
Local shop pickup only; NO delivery. Full payment in ONE transaction, never advance/balance instalments. Official WhatsApp OTP must precede website payment initiation. New Orders contains only server/provider-confirmed full payments. Automatic WhatsApp invoice delivery must not control whether a paid order is recorded.

## Current release: LOCKED GROUNDWORK
Owner authorised building with payments locked because WhatsApp credentials and PhonePe setup/fee approval are unavailable. **No OTPs, payments, refunds or WhatsApp invoices are sent. No mocked successes.** The code-level gate cannot be enabled by adding environment values. Legacy QR/order-creation/payment-override paths are closed. Catalogue, quoting, nonpayable draft saving, admin history and setup instructions work.

## Stack
Restored CRA/Craco React 19, Tailwind 3, shadcn, TanStack Query, FastAPI and Motor/Mongo. No Vite migration. New files are TypeScript checked by `yarn typecheck`; legacy JS retained with checkJs disabled. Relative /api helpers in lib/api.ts. One existing BrowserRouter and QueryClientProvider.

## Data and flows
- products/categories: existing brand prices, stock, HSN/GST, loading charges. Quotes aggregate duplicate product/brand rows, reject inactive products and invalid quantities. Draft amounts are server-derived with integer paise.
- checkout_drafts: nonpayable, 24-hour expiry, random reference, HttpOnly Secure SameSite=Strict session cookie hashed in DB, server price snapshot, name/normalized +91 number/consent/notes, revision and actual activity history. Saving does not decrement/reserve stock or create orders. Changed checkout invalidates verification; identical saves return same draft.
- checkout_limits: persistent hashed rate counters with TTL. Draft, OTP-send, OTP-verify and login limits. Actual OTP challenge generation/expiry/one-use delivery remains gated until official adapter exists.
- orders: existing records preserved. Paid filter requires PhonePe COMPLETED, provider reference, verified=true, 100%, zero balance and matching integer amount. Manually verified earlier records never become provider-confirmed.
- Admin: Paid Orders, Checkout Drafts and Earlier Orders. Details show materials, contact, tax/charges, recorded references, payment/pickup/invoice/refund states and genuine history. Refresh every 15 seconds. No manual payment/refund override or order deletion.
- Public order/phone/PDF lookup requires admin auth in this locked release; UI explains private tracking awaits WhatsApp activation. Deliberately prevents phone enumeration and unauthenticated invoice access. Earlier records remain in admin.

## Auth
Existing admin JWT bearer login preserved; credentials in test_credentials.md. Login rate limiting added. Customer cookies separate from admin tokens and contain no PII. Passwords unchanged. Admin MFA is NOT connected and is a required activation task. No security-audit certification claimed.

## Activation outstanding
See PAYMENT_SETUP.md. Need Meta registration/billing/templates/token and PhonePe KYC/bank/fees/UAT. Need tested adapters, OTP hashing/expiry/one-time consume, authenticated callbacks, amount matching, stock consistency, pending reconciliation, duplicate protection, refunds, invoice retries, valid tax setup and stronger admin access before real money. No permanent zero-charge promise.

## Deferred
Admin gallery/notices and ChatGPT are not included in this payment-groundwork change.