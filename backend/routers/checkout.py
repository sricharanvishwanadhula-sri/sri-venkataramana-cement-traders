import json
import secrets
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pymongo import ReturnDocument
from lib.checkout_security import (SESSION_COOKIE, SESSION_SECONDS, digest, now,
    paid_order_filter, protect_mutation, rate_limit, require_provider_activation)
from models.checkout import (CheckoutCapabilities, CommerceOrder, CommerceOverview,
    CurrentDraftResponse, DraftInput, DraftResponse, OtpVerifyInput, PaymentStartInput, SetupResponse)


def create_checkout_router(db, compute_quote, get_admin, get_settings, secret):
    router = APIRouter()

    async def owned_draft(request, draft_id):
        token = request.cookies.get(SESSION_COOKIE, "")
        if not token or len(token) > 200:
            raise HTTPException(403, "Open checkout in the same browser to continue.")
        draft = await db.checkout_drafts.find_one({"id": draft_id, "session_hash": digest(secret, token), "expiry": {"$gt": now()}})
        if not draft:
            raise HTTPException(404, "Checkout draft not found or expired.")
        return draft

    @router.get("/checkout/status", response_model=CheckoutCapabilities)
    async def capabilities():
        return CheckoutCapabilities()

    @router.get("/checkout/drafts/current", response_model=CurrentDraftResponse)
    async def current_draft(request: Request, response: Response):
        response.headers["Cache-Control"] = "no-store"
        token = request.cookies.get(SESSION_COOKIE, "")
        if not token or len(token) > 200:
            return {"draft": None}
        draft = await db.checkout_drafts.find_one({"session_hash": digest(secret, token), "expiry": {"$gt": now()}})
        return {"draft": draft}

    @router.post("/checkout/drafts", response_model=DraftResponse)
    async def save_draft(payload: DraftInput, request: Request, response: Response):
        protect_mutation(request)
        token = request.cookies.get(SESSION_COOKIE, "")
        if not token or len(token) > 200:
            token = secrets.token_urlsafe(32)
        session_hash = digest(secret, token)
        await rate_limit(db, secret, "draft-session", session_hash, 30, 3600)
        await rate_limit(db, secret, "draft-phone", payload.customer_phone, 30, 3600)
        await rate_limit(db, secret, "draft-global", "all", 1000, 3600)
        lines, subtotal, hamali, gst, total, insufficient = await compute_quote([item.model_dump() for item in payload.items])
        if insufficient:
            raise HTTPException(409, "Some materials exceed available stock. Please update your cart.")
        if total <= 0:
            raise HTTPException(409, "This cart has no payable amount. Please contact the shop.")
        timestamp = now()
        expires = timestamp + timedelta(seconds=SESSION_SECONDS)
        body = {**payload.model_dump(exclude={"items"}), "items": lines,
                "subtotal_ex_gst": subtotal, "hamali_total": hamali, "gst_total": gst,
                "total_amount": total, "total_minor": int((Decimal(str(total)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
                "balance_amount": 0, "whatsapp_verified": False, "payment_status": "not_started", "invoice_status": "not_issued"}
        fingerprint = digest(secret, json.dumps(body, sort_keys=True))
        existing = await db.checkout_drafts.find_one({"session_hash": session_hash, "expiry": {"$gt": timestamp}})
        if existing and existing.get("fingerprint") == fingerprint:
            response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_SECONDS, httponly=True, secure=True, samesite="strict", path="/api")
            response.headers["Cache-Control"] = "no-store"
            return existing
        entry = {"at": timestamp.isoformat(), "description": "Nonpayable checkout draft saved. WhatsApp unverified; no payment or order created."}
        draft = await db.checkout_drafts.find_one_and_update(
            {"session_hash": session_hash},
            {"$set": {**body, "fingerprint": fingerprint, "updated_at": timestamp.isoformat(), "expires_at": expires.isoformat(), "expiry": expires},
             "$setOnInsert": {"id": str(uuid.uuid4()), "reference": "DRAFT-" + secrets.token_hex(4).upper(), "created_at": timestamp.isoformat()},
             "$push": {"timeline": {"$each": [entry], "$slice": -30}}, "$inc": {"revision": 1}},
            upsert=True, return_document=ReturnDocument.AFTER)
        await db.otp_challenges.delete_many({"draft_id": draft["id"]})
        response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_SECONDS, httponly=True, secure=True, samesite="strict", path="/api")
        response.headers["Cache-Control"] = "no-store"
        return draft

    @router.post("/checkout/drafts/{draft_id}/otp/send")
    async def send_otp(draft_id: str, request: Request):
        protect_mutation(request)
        draft = await owned_draft(request, draft_id)
        await rate_limit(db, secret, "otp-resend", draft["customer_phone"], 1, 60)
        await rate_limit(db, secret, "otp-daily", draft["customer_phone"], 20, 86400)
        require_provider_activation()

    @router.post("/checkout/drafts/{draft_id}/otp/verify")
    async def verify_otp(draft_id: str, payload: OtpVerifyInput, request: Request):
        protect_mutation(request)
        draft = await owned_draft(request, draft_id)
        await rate_limit(db, secret, "otp-verify", draft["session_hash"], 5, 300)
        require_provider_activation()

    @router.post("/checkout/drafts/{draft_id}/payment")
    async def start_payment(draft_id: str, payload: PaymentStartInput, request: Request):
        protect_mutation(request)
        draft = await owned_draft(request, draft_id)
        if not draft.get("whatsapp_verified"):
            raise HTTPException(403, "Verify your WhatsApp number before payment. No payment has been started.")
        require_provider_activation()

    @router.post("/payments/phonepe/webhook")
    async def phonepe_webhook():
        require_provider_activation()

    @router.post("/whatsapp/webhook")
    async def whatsapp_webhook():
        require_provider_activation()

    @router.get("/admin/payment-setup", response_model=SetupResponse)
    async def setup(admin=Depends(get_admin)):
        settings = await get_settings()
        return {"capabilities": CheckoutCapabilities(), "charges_notice": "PhonePe zero-fee offers depend on your merchant agreement. Meta authentication and invoice messages may incur delivery charges. No permanent zero-cost promise.", "tasks": [
            {"id": "checkout", "title": "Full-payment, pickup-only checkout", "state": "ready", "description": "No advance selector or delivery. Server-validated drafts do not take money, reserve stock, or create confirmed orders."},
            {"id": "phonepe", "title": "Activate PhonePe merchant account", "state": "not_connected", "description": "Complete KYC, settlement-bank verification and fee agreement. Then obtain UAT client ID, client secret and client version from Developer Settings.", "url": "https://business.phonepe.com/payment-gateway"},
            {"id": "whatsapp", "title": "Set up official WhatsApp Cloud API", "state": "not_connected", "description": "Create a Meta Business Portfolio and app, add WhatsApp, register your business number, configure billing, and create a system-user access token. Do not paste tokens into customer pages.", "url": "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/"},
            {"id": "templates", "title": "Approve OTP and invoice templates", "state": "required", "description": "Approve an Authentication template for OTP and a Utility template with PDF document header for invoices. Obtain customer messaging consent."},
            {"id": "invoice", "title": "Review GST and invoice details", "state": "required", "description": "Have your accountant validate GSTIN, shop address, HSN, tax rates and invoice numbering before issuing tax invoices. GSTIN entered." if settings.get("gstin") else "Your real GSTIN is not configured. Review GSTIN, shop address, HSN, tax rates and invoice numbering before issuing tax invoices."},
            {"id": "admin", "title": "Strengthen owner access before activation", "state": "required", "description": "Use a unique private admin password and enable two-factor authentication before live payments. Login rate limiting is in place; admin two-factor is not yet connected."},
            {"id": "testing", "title": "Connect, test and approve live payments", "state": "required", "description": "Provider adapters, OTP delivery, authenticated callbacks, amount matching, reconciliation, duplicate protection, refund tracking and invoice retries must pass UAT. Adding credentials alone will NOT unlock this release."},
        ]}

    def order_view(doc):
        p = doc.get("payment", {})
        expected = int((Decimal(str(doc.get("total_amount", 0))) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        confirmed = p.get("provider") == "phonepe" and p.get("status") == "COMPLETED" and p.get("verified") is True and bool(p.get("provider_payment_id")) and doc.get("advance_percent") == 100 and doc.get("balance_amount") == 0 and p.get("amount_minor") == expected
        return {**doc, "provider_confirmed": confirmed, "invoice_status": doc.get("invoice_status", "not_sent"), "refund_status": doc.get("refund_status", "none_recorded"), "timeline": doc.get("timeline", [])}

    @router.get("/admin/commerce", response_model=CommerceOverview)
    async def overview(admin=Depends(get_admin)):
        paid = await db.orders.find(paid_order_filter(), {"_id": 0}).sort("created_at", -1).to_list(100)
        earlier = await db.orders.find({"$nor": [paid_order_filter()]}, {"_id": 0}).sort("created_at", -1).to_list(100)
        drafts = await db.checkout_drafts.find({"expiry": {"$gt": now()}}, {"_id": 0}).sort("updated_at", -1).to_list(100)
        return {"paid_orders": [order_view(o) for o in paid], "earlier_orders": [order_view(o) for o in earlier], "checkout_drafts": drafts, "checked_at": now().isoformat()}

    @router.get("/admin/commerce/orders/{order_id}", response_model=CommerceOrder)
    async def detail(order_id: str, admin=Depends(get_admin)):
        doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Order not found")
        return order_view(doc)

    return router