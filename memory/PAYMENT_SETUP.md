# Owner setup guide — keep secrets out of chat, screenshots and source control

## PhonePe Payment Gateway (not the normal UPI app)
1. Register at https://business.phonepe.com/payment-gateway.
2. Complete KYC and settlement-bank verification. Confirm written platform, transaction, refund, settlement and tax terms; introductory free offers are not permanently free.
3. Developer Settings: obtain UAT client ID, client secret and client version; arrange provider-supported webhook authentication.
4. Future private settings: PHONEPE_ENV, PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_CLIENT_VERSION, PHONEPE_WEBHOOK_USERNAME, PHONEPE_WEBHOOK_PASSWORD. Verify exact current contract against your merchant account.
5. Implement UAT, obtain PhonePe sign-off, then production credentials. Credentials alone cannot unlock this release.

## Official Meta WhatsApp Cloud API
1. https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/ — create/select Meta Business Portfolio and app, add WhatsApp.
2. Register a business number; complete required business verification and billing. Test numbers/allowlisted recipients are not production OTP service.
3. WhatsApp Manager: approve an Authentication OTP template (copy-code for web) and Utility invoice template with PDF header.
4. Create a system-user access token with appropriate messaging/management permissions and assigned WABA/app. Follow Meta's lifetime/rotation rules; do not assume tokens never expire.
5. Future settings: WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_AUTH_TEMPLATE_NAME, WHATSAPP_INVOICE_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANGUAGE, WHATSAPP_GRAPH_API_VERSION.
6. Direct Meta avoids reseller subscription but applicable delivered-message fees remain: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing

## Before live payments
- Unique private admin password and two-factor authentication.
- Accountant-reviewed GSTIN where applicable, HSN/rates, business details, invoice numbering and pickup/refund policy.
- Approved adapters: protected short-lived single-use OTPs, phone/session/order binding, atomic attempts, resend/abuse/spend caps.
- Hosted checkout from server amount; authenticated callbacks/status queries; amount/reference checks; duplicate and replay protection; persistent pending reconciliation and stock consistency.
- Test closed browser, poor network, debited-but-pending, retries, duplicate payments, refunds and WhatsApp delivery failures. Message failure must never hide paid orders.
- Confirm actual merchant fees separately from zero customer surcharge.

Current state: no provider calls, OTP delivery, payment collection, automatic WhatsApp invoices or refunds. Saved drafts are not orders.