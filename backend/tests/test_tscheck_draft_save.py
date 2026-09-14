"""tscheck: nonpayable checkout drafts save safely.

Criterion: valid Indian WhatsApp number + name + consent + server-priced
materials save a 24h draft behind a HttpOnly/Secure/SameSite=Strict cookie.
Invalid phone / missing consent / forged amount+verified fail validation.
Identical saves return the same draft; a changed phone starts a fresh
(unverified) draft. Saving never creates an order or moves stock.
"""
import httpx

from conftest import draft_payload, unique_phone


def test_invalid_phone_rejected(checkout_client, stocked_item):
    payload = draft_payload(stocked_item)
    r = checkout_client.post("/api/checkout/drafts", json={**payload, "customer_phone": "123"})
    assert r.status_code == 422, r.text[:300]


def test_missing_consent_rejected(checkout_client, stocked_item):
    payload = draft_payload(stocked_item)
    r = checkout_client.post("/api/checkout/drafts", json={**payload, "whatsapp_consent": False})
    assert r.status_code == 422, r.text[:300]


def test_forged_verified_and_amount_rejected(checkout_client, stocked_item):
    payload = draft_payload(stocked_item)
    r = checkout_client.post(
        "/api/checkout/drafts",
        json={**payload, "whatsapp_verified": True, "total_amount": 1},
    )
    assert r.status_code == 422, r.text[:300]


def test_valid_draft_saves_with_secure_cookie_and_no_order(checkout_client, stocked_item, admin_client):
    phone = unique_phone()
    payload = draft_payload(stocked_item, phone=phone, name="tscheck-draft-save")

    before = admin_client.get("/api/admin/commerce").json()

    created = checkout_client.post("/api/checkout/drafts", json=payload)
    assert created.status_code == 200, created.text[:300]
    cookie_header = created.headers.get("set-cookie", "").lower()
    assert "httponly" in cookie_header and "secure" in cookie_header and "samesite=strict" in cookie_header

    draft = created.json()
    assert draft["whatsapp_verified"] is False
    assert draft["payment_status"] == "not_started"
    assert draft["invoice_status"] == "not_issued"
    assert "session_hash" not in draft and "fingerprint" not in draft

    after = admin_client.get("/api/admin/commerce").json()
    assert len(after["paid_orders"]) == len(before["paid_orders"])
    assert len(after["earlier_orders"]) == len(before["earlier_orders"])


def test_identical_save_returns_same_draft_over_ingress(checkout_client, stocked_item):
    phone = unique_phone()
    payload = draft_payload(stocked_item, phone=phone, name="tscheck-identical-save")
    first = checkout_client.post("/api/checkout/drafts", json=payload)
    assert first.status_code == 200, first.text[:300]
    second = checkout_client.post("/api/checkout/drafts", json=payload)
    assert second.status_code == 200, second.text[:300]
    assert first.json()["id"] == second.json()["id"]

    current = checkout_client.get("/api/checkout/drafts/current")
    assert current.status_code == 200
    assert current.json()["draft"]["id"] == first.json()["id"]


def test_changed_phone_starts_unverified_fresh_draft(checkout_client, stocked_item):
    phone_a = unique_phone()
    payload_a = draft_payload(stocked_item, phone=phone_a, name="tscheck-phone-a")
    r1 = checkout_client.post("/api/checkout/drafts", json=payload_a)
    assert r1.status_code == 200, r1.text[:300]

    phone_b = unique_phone()
    payload_b = draft_payload(stocked_item, phone=phone_b, name="tscheck-phone-b")
    r2 = checkout_client.post("/api/checkout/drafts", json=payload_b)
    assert r2.status_code == 200, r2.text[:300]

    assert r2.json()["customer_phone"] == phone_b
    assert r2.json()["whatsapp_verified"] is False


def test_other_session_cannot_see_current_draft(checkout_client, stocked_item, base_url):
    payload = draft_payload(stocked_item, name="tscheck-isolated-session")
    r = checkout_client.post("/api/checkout/drafts", json=payload)
    assert r.status_code == 200, r.text[:300]

    other = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
    try:
        current = other.get("/api/checkout/drafts/current")
        assert current.status_code == 200
        assert current.json()["draft"] is None
    finally:
        other.close()


def test_draft_save_requires_checkout_intent_and_same_origin(base_url, stocked_item):
    payload = draft_payload(stocked_item)
    no_intent = httpx.Client(base_url=base_url, timeout=30)
    try:
        r = no_intent.post("/api/checkout/drafts", json=payload)
        assert r.status_code == 403, r.text[:300]
    finally:
        no_intent.close()

    cross_origin = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
    try:
        r = cross_origin.post("/api/checkout/drafts", json=payload, headers={"Origin": "https://unrelated.example"})
        assert r.status_code == 403, r.text[:300]
    finally:
        cross_origin.close()
