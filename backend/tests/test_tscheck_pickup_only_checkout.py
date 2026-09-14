"""tscheck: pickup-only checkout requires 100% payment in a single transaction.

Criterion: catalogue/cart quotes only the full amount (no advance/balance
instalments), and the server rejects any attempt to tamper with the advance
percent or introduce a delivery address/fulfillment.
"""


def test_quote_full_amount_only(checkout_client, stocked_item):
    r = checkout_client.post("/api/cart/quote", json={"items": [stocked_item], "advance_percent": 100})
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert body["advance_percent"] == 100
    assert body["advance_amount"] == body["total_amount"]
    assert body["balance_amount"] == 0


def test_quote_rejects_partial_advance(checkout_client, stocked_item):
    r = checkout_client.post("/api/cart/quote", json={"items": [stocked_item], "advance_percent": 50})
    assert r.status_code == 422, r.text[:300]


def test_quote_rejects_invalid_quantity(checkout_client, stocked_item):
    bad_item = {**stocked_item, "quantity": -1}
    r = checkout_client.post("/api/cart/quote", json={"items": [bad_item]})
    assert r.status_code == 422, r.text[:300]


def test_quote_aggregates_duplicate_lines(checkout_client, stocked_item):
    r = checkout_client.post("/api/cart/quote", json={"items": [stocked_item, stocked_item]})
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert len(body["lines"]) == 1
    assert body["lines"][0]["quantity"] == 2


def test_draft_rejects_advance_tampering(checkout_client, stocked_item):
    from conftest import draft_payload
    payload = draft_payload(stocked_item)
    r = checkout_client.post("/api/checkout/drafts", json={**payload, "whatsapp_verified": True, "total_amount": 1})
    assert r.status_code == 422, r.text[:300]


def test_draft_rejects_delivery_fulfillment(checkout_client, stocked_item):
    from conftest import draft_payload
    payload = draft_payload(stocked_item)
    r = checkout_client.post("/api/checkout/drafts", json={**payload, "fulfillment": "delivery"})
    assert r.status_code == 422, r.text[:300]


def test_checkout_status_reports_pickup_only_locked(checkout_client):
    r = checkout_client.get("/api/checkout/status")
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert body["status"] == "locked"
    assert body["payments_available"] is False
    assert body["fulfillment"] == "shop_pickup"
    assert body["payment_percent"] == 100
