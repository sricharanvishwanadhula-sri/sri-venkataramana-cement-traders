"""tscheck: admin receives only provider-confirmed full payments as paid orders.

Criterion: /api/admin/commerce separates paid_orders / checkout_drafts /
earlier_orders; a freshly-saved nonpayable draft never appears in paid
orders, and drilldown into a draft shows customer/materials/price with
whatsapp_verified false and no payment recorded.
"""
from conftest import draft_payload, unique_phone


def test_commerce_overview_has_three_separate_buckets(admin_client):
    r = admin_client.get("/api/admin/commerce")
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert "paid_orders" in body and "checkout_drafts" in body and "earlier_orders" in body


def test_fresh_draft_never_counted_as_paid(checkout_client, stocked_item, admin_client):
    before = admin_client.get("/api/admin/commerce").json()
    before_paid_ids = {o["id"] for o in before["paid_orders"]}

    phone = unique_phone()
    payload = draft_payload(stocked_item, phone=phone, name="tscheck-commerce-draft")
    created = checkout_client.post("/api/checkout/drafts", json=payload)
    assert created.status_code == 200, created.text[:300]
    draft = created.json()

    after = admin_client.get("/api/admin/commerce").json()
    after_paid_ids = {o["id"] for o in after["paid_orders"]}
    assert after_paid_ids == before_paid_ids, "a nonpayable draft must never appear in paid_orders"

    draft_ids = {d["id"] for d in after["checkout_drafts"]}
    assert draft["id"] in draft_ids

    matching = next(d for d in after["checkout_drafts"] if d["id"] == draft["id"])
    assert matching["customer_phone"] == phone
    assert matching["items"][0]["product_id"] == stocked_item["product_id"]
    assert matching["whatsapp_verified"] is False
    assert matching["payment_status"] == "not_started"


def test_commerce_requires_admin_auth(checkout_client):
    r = checkout_client.get("/api/admin/commerce")
    assert r.status_code == 401, r.text[:300]
