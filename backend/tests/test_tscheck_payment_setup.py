"""tscheck: owner sees an honest integration setup checklist.

Criterion: /api/admin/payment-setup reports payments/otp as not available and
lists outstanding official-adapter tasks (Meta WhatsApp, PhonePe KYC/fees,
GST review, admin MFA) rather than exposing a credentials form or a fake
on-switch.
"""


def test_payment_setup_requires_admin_auth(checkout_client):
    r = checkout_client.get("/api/admin/payment-setup")
    assert r.status_code == 401, r.text[:300]


def test_payment_setup_lists_outstanding_tasks_honestly(admin_client):
    r = admin_client.get("/api/admin/payment-setup")
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    caps = body["capabilities"]
    assert caps["payments_available"] is False
    assert caps["otp_available"] is False
    assert caps["whatsapp_invoices_available"] is False

    tasks = body["tasks"]
    assert len(tasks) >= 6
    for task in tasks:
        assert task["state"] in ("required", "ready", "not_connected")
    # No task should claim to be a live activation toggle; every task must
    # carry explanatory text rather than a bare on/off credential form.
    assert all(task["description"] for task in tasks)


def test_admin_settings_cannot_reintroduce_advance_percent(admin_client):
    r = admin_client.patch("/api/admin/settings", json={"default_advance_percent": 25})
    assert r.status_code == 422, r.text[:300]
