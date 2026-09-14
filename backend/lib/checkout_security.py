"""Fail-closed checkout safeguards. No provider credentials or network calls."""
import hashlib
import hmac
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit
from fastapi import HTTPException, Request
from pymongo import ReturnDocument

SESSION_COOKIE = "svct_checkout"
SESSION_SECONDS = 24 * 60 * 60
LOCK_MESSAGE = "Online payments and WhatsApp OTPs are not connected. No payment has been started."


def now():
    return datetime.now(timezone.utc)


def normalize_phone(value: str) -> str:
    value = re.sub(r"[\s()\-]", "", value)
    if not re.fullmatch(r"(?:\+?91)?[6-9]\d{9}", value):
        raise ValueError("Enter a valid Indian WhatsApp mobile number (10 digits, optionally +91).")
    return "+91" + value[-10:]


def digest(secret: str, value: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def protect_mutation(request: Request):
    if request.headers.get("x-checkout-intent") != "pickup":
        raise HTTPException(403, "This request must originate from the secure checkout.")
    origin = request.headers.get("origin")
    if origin and urlsplit(origin).netloc != request.headers.get("host"):
        raise HTTPException(403, "Cross-origin checkout requests are not allowed.")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Cross-site checkout requests are not allowed.")


async def rate_limit(db, secret: str, scope: str, identifier: str, limit: int, seconds: int):
    timestamp = now()
    bucket = int(timestamp.timestamp()) // seconds
    key = digest(secret, f"{scope}:{identifier}:{bucket}")
    row = await db.checkout_limits.find_one_and_update(
        {"_id": key}, {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": timestamp + timedelta(seconds=seconds * 2)}},
        upsert=True, return_document=ReturnDocument.AFTER)
    if row["count"] > limit:
        raise HTTPException(429, "Too many attempts. Please wait before trying again.", headers={"Retry-After": str(seconds)})


def require_provider_activation():
    # NOT an environment-only toggle: no live adapters have been approved.
    raise HTTPException(503, LOCK_MESSAGE)


def paid_order_filter():
    return {"payment.provider": "phonepe", "payment.verified": True,
            "payment.status": "COMPLETED", "payment.provider_payment_id": {"$type": "string", "$ne": ""},
            "advance_percent": 100, "balance_amount": 0,
            "$expr": {"$eq": ["$payment.amount_minor", {"$round": [{"$multiply": ["$total_amount", 100]}, 0]}]}}