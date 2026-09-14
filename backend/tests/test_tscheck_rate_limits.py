"""tscheck: persisted rate limits protect authentication/attempt endpoints.

Criterion: draft/OTP/login attempts are rate limited via persisted hashed
counters, and hitting a limit never changes locked service state (still
locked, no payment/OTP leak). This test drives the draft-phone limiter
(30/hour) with a disposable phone number - it deliberately avoids the real
admin login limiter so it never risks locking the owner's account.
"""
import httpx

from conftest import draft_payload, unique_phone


def test_draft_phone_rate_limit_persists_and_blocks(base_url, stocked_item):
    phone = unique_phone()
    statuses = []
    for _ in range(31):
        client = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
        try:
            payload = draft_payload(stocked_item, phone=phone, name="tscheck-ratelimit")
            r = client.post("/api/checkout/drafts", json=payload)
            statuses.append(r.status_code)
        finally:
            client.close()

    assert 429 in statuses, f"expected the 31st+ draft save for one phone to be rate limited: {statuses}"
    blocked_index = statuses.index(429)
    assert blocked_index >= 29, f"limiter tripped too early ({blocked_index}); expected around the 30-request mark: {statuses}"

    # A rate-limited attempt must not have unlocked payments/OTP as a side effect.
    status_client = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
    try:
        status = status_client.get("/api/checkout/status").json()
        assert status["payments_available"] is False
        assert status["otp_available"] is False
    finally:
        status_client.close()


def test_login_rejects_wrong_password_without_state_change(base_url, admin_credentials):
    email, _ = admin_credentials
    client = httpx.Client(base_url=base_url, timeout=30)
    try:
        r = client.post("/api/auth/login", json={"email": email, "password": "definitely-wrong-password"})
        assert r.status_code == 401, r.text[:300]
        # A correct login must still work right after a single bad attempt.
        good_email, good_password = admin_credentials
        r2 = client.post("/api/auth/login", json={"email": good_email, "password": good_password})
        assert r2.status_code == 200, r2.text[:300]
    finally:
        client.close()
