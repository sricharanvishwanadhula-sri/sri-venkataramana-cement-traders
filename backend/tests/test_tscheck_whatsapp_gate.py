"""tscheck: mandatory WhatsApp verification gates all payment initiation.

Criterion: OTP send/verify and payment stay locked with honest 503s, direct
payment-start rejects unverified or foreign sessions, and legacy
order/UPI/order-QR endpoints reject rather than fake a success.
"""
import uuid

import httpx

from conftest import draft_payload


def _make_draft(checkout_client, stocked_item):
    payload = draft_payload(stocked_item)
    r = checkout_client.post("/api/checkout/drafts", json=payload)
    assert r.status_code == 200, r.text[:300]
    return r.json()


def test_otp_send_and_verify_are_not_connected(checkout_client, stocked_item):
    draft = _make_draft(checkout_client, stocked_item)
    r_send = checkout_client.post(f"/api/checkout/drafts/{draft['id']}/otp/send")
    assert r_send.status_code == 503, r_send.text[:300]
    r_verify = checkout_client.post(f"/api/checkout/drafts/{draft['id']}/otp/verify", json={"code": "123456"})
    assert r_verify.status_code == 503, r_verify.text[:300]


def test_payment_start_rejects_own_unverified_draft(checkout_client, stocked_item):
    draft = _make_draft(checkout_client, stocked_item)
    r = checkout_client.post(
        f"/api/checkout/drafts/{draft['id']}/payment",
        json={"idempotency_key": str(uuid.uuid4())},
    )
    assert r.status_code == 403, r.text[:300]


def test_payment_start_rejects_foreign_session(checkout_client, stocked_item, base_url):
    draft = _make_draft(checkout_client, stocked_item)
    foreign = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
    try:
        r = foreign.post(
            f"/api/checkout/drafts/{draft['id']}/payment",
            json={"idempotency_key": str(uuid.uuid4())},
        )
        assert r.status_code == 403, r.text[:300]
    finally:
        foreign.close()


def test_legacy_order_and_upi_endpoints_are_locked(checkout_client, stocked_item):
    payload = draft_payload(stocked_item)
    r_order = checkout_client.post("/api/orders", json=payload)
    assert r_order.status_code == 503, r_order.text[:300]
    r_upi = checkout_client.get("/api/upi/active")
    assert r_upi.status_code == 503, r_upi.text[:300]
    r_qr = checkout_client.get("/api/orders/UNKNOWN/upi-qr.png")
    assert r_qr.status_code == 503, r_qr.text[:300]
    r_intent = checkout_client.get("/api/orders/UNKNOWN/upi-intent")
    assert r_intent.status_code == 503, r_intent.text[:300]


def test_forged_provider_callbacks_are_rejected(checkout_client):
    r_phonepe = checkout_client.post("/api/payments/phonepe/webhook", json={"status": "COMPLETED", "amount": 1})
    assert r_phonepe.status_code == 503, r_phonepe.text[:300]
    r_meta = checkout_client.post("/api/whatsapp/webhook", json={"verified": True})
    assert r_meta.status_code == 503, r_meta.text[:300]
