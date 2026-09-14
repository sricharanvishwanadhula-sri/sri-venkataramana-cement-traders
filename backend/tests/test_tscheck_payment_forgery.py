"""tscheck: payment records cannot be forged by admins or callbacks.

Criterion: authenticated admin writes that try to mark verified/UTR/manual
paid, nested payment writes, and order deletion are all rejected; forged
provider callbacks cannot mark orders paid; admin data and legacy public
lookups require auth.
"""
from conftest import unique_phone


def _any_order_id(admin_client):
    overview = admin_client.get("/api/admin/commerce").json()
    if overview["earlier_orders"]:
        return overview["earlier_orders"][0]["id"]
    if overview["paid_orders"]:
        return overview["paid_orders"][0]["id"]
    return "not-a-real-order"


def test_admin_cannot_force_verified_or_utr(admin_client):
    order_id = _any_order_id(admin_client)
    r = admin_client.patch(
        f"/api/admin/orders/{order_id}",
        json={"verified": True, "utr_ref": "not-proof"},
    )
    assert r.status_code == 403, r.text[:300]


def test_admin_cannot_write_nested_payment_object(admin_client):
    order_id = _any_order_id(admin_client)
    r = admin_client.patch(
        f"/api/admin/orders/{order_id}",
        json={"payment": {"verified": True}},
    )
    assert r.status_code == 422, r.text[:300]


def test_admin_cannot_delete_orders(admin_client):
    order_id = _any_order_id(admin_client)
    r = admin_client.delete(f"/api/admin/orders/{order_id}")
    assert r.status_code == 403, r.text[:300]


def test_forged_phonepe_callback_rejected(checkout_client):
    r = checkout_client.post(
        "/api/payments/phonepe/webhook",
        json={"status": "COMPLETED", "amount": 1, "orderId": "SVCT-FAKE"},
    )
    assert r.status_code == 503, r.text[:300]


def test_forged_meta_whatsapp_callback_rejected(checkout_client):
    r = checkout_client.post("/api/whatsapp/webhook", json={"verified": True, "phone": unique_phone()})
    assert r.status_code == 503, r.text[:300]


def test_public_order_and_pdf_lookup_require_admin_auth(checkout_client):
    r_track = checkout_client.get("/api/orders/track?phone=9876543211")
    assert r_track.status_code == 401, r_track.text[:300]
    r_order = checkout_client.get("/api/orders/UNKNOWN")
    assert r_order.status_code == 401, r_order.text[:300]
    r_pdf = checkout_client.get("/api/orders/UNKNOWN/invoice.pdf")
    assert r_pdf.status_code == 401, r_pdf.text[:300]
