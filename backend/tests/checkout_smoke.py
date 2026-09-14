"""Re-runnable locked-checkout API acceptance checks. No provider calls or real payments."""
import re
import sys
import uuid
from pathlib import Path
import requests

base = sys.argv[1].rstrip("/")
s = requests.Session()
s.headers["X-Checkout-Intent"] = "pickup"


def check(method, path, status=200, session=s, **kwargs):
    r = session.request(method, base + "/api" + path, timeout=30, **kwargs)
    assert r.status_code == status, (method, path, r.status_code, r.text[:400])
    print(f"PASS {method} {path}: {status}")
    return r


cap = check("GET", "/checkout/status").json()
assert cap["status"] == "locked" and cap["payments_available"] is False and cap["otp_available"] is False
products = check("GET", "/products").json()
product = next(p for p in products if any(b["stock"] > 2 for b in p["brands"]))
brand = next(b for b in product["brands"] if b["stock"] > 2)
item = {"product_id": product["id"], "brand_id": brand["id"], "quantity": 1}
quote = check("POST", "/cart/quote", json={"items": [item], "advance_percent": 100}).json()
assert quote["advance_percent"] == 100 and quote["advance_amount"] == quote["total_amount"] and quote["balance_amount"] == 0
check("POST", "/cart/quote", 422, json={"items": [item], "advance_percent": 50})
check("POST", "/cart/quote", 422, json={"items": [{**item, "quantity": -1}]})
double = check("POST", "/cart/quote", json={"items": [item, item]}).json()
assert len(double["lines"]) == 1 and double["lines"][0]["quantity"] == 2
credentials = Path("/app/memory/test_credentials.md").read_text()
email = re.search(r"Email: `([^`]+)`", credentials)[1]
password = re.search(r"Password: `([^`]+)`", credentials)[1]
admin = requests.Session()
auth = check("POST", "/auth/login", session=admin, json={"email": email, "password": password}).json()
admin.headers["Authorization"] = "Bearer " + auth["token"]
before = check("GET", "/admin/commerce", session=admin).json()
payload = {"customer_name": "API Safety Check", "customer_phone": "+919876543211", "notes": "Automated verification draft only; no order or payment.", "whatsapp_consent": True, "items": [item], "advance_percent": 100, "fulfillment": "shop_pickup"}
check("POST", "/checkout/drafts", 422, json={**payload, "customer_phone": "123"})
check("POST", "/checkout/drafts", 422, json={**payload, "whatsapp_consent": False})
check("POST", "/checkout/drafts", 422, json={**payload, "fulfillment": "delivery"})
check("POST", "/checkout/drafts", 422, json={**payload, "whatsapp_verified": True, "total_amount": 1})
check("POST", "/checkout/drafts", 403, session=requests.Session(), json=payload)
check("POST", "/checkout/drafts", 403, json=payload, headers={"Origin": "https://unrelated.example"})
created = check("POST", "/checkout/drafts", json=payload)
cookie = created.headers.get("set-cookie", "").lower()
assert "httponly" in cookie and "secure" in cookie and "samesite=strict" in cookie
draft = created.json()
assert draft["whatsapp_verified"] is False and draft["payment_status"] == "not_started"
assert draft["invoice_status"] == "not_issued" and draft["total_minor"] == round(quote["total_amount"] * 100)
assert "session_hash" not in draft and "fingerprint" not in draft
assert check("POST", "/checkout/drafts", json=payload).json()["id"] == draft["id"]
assert check("GET", "/checkout/drafts/current").json()["draft"]["id"] == draft["id"]
other = requests.Session()
other.headers["X-Checkout-Intent"] = "pickup"
assert check("GET", "/checkout/drafts/current", session=other).json()["draft"] is None
payment_body = {"idempotency_key": str(uuid.uuid4())}
path = f"/checkout/drafts/{draft['id']}"
check("POST", path + "/payment", 403, session=other, json=payment_body)
check("POST", path + "/payment", 403, json=payment_body)
check("POST", path + "/otp/send", 503)
check("POST", path + "/otp/verify", 503, json={"code": "123456"})
check("POST", "/orders", 503, json=payload)
for endpoint in ["/upi/active", "/orders/UNKNOWN/upi-qr.png", "/orders/UNKNOWN/upi-intent"]:
    check("GET", endpoint, 503)
for endpoint in ["/orders/track?phone=9876543211", "/orders/UNKNOWN", "/orders/UNKNOWN/invoice.pdf", "/admin/commerce", "/admin/payment-setup"]:
    check("GET", endpoint, 401)
check("POST", "/payments/phonepe/webhook", 503, json={"status": "COMPLETED", "amount": 1})
check("POST", "/whatsapp/webhook", 503, json={"verified": True})
order_id = before["earlier_orders"][0]["id"] if before["earlier_orders"] else "not-a-real-order"
check("PATCH", f"/admin/orders/{order_id}", 403, session=admin, json={"verified": True, "utr_ref": "not-proof"})
check("PATCH", f"/admin/orders/{order_id}", 422, session=admin, json={"payment": {"verified": True}})
check("DELETE", f"/admin/orders/{order_id}", 403, session=admin)
check("PATCH", "/admin/settings", 422, session=admin, json={"default_advance_percent": 25})
setup = check("GET", "/admin/payment-setup", session=admin).json()
assert setup["capabilities"]["payments_available"] is False and len(setup["tasks"]) >= 6
after = check("GET", "/admin/commerce", session=admin).json()
assert len(after["paid_orders"]) == len(before["paid_orders"])
assert len(after["earlier_orders"]) == len(before["earlier_orders"])
assert any(d["id"] == draft["id"] for d in after["checkout_drafts"])
stock = check("GET", f"/products/{product['id']}").json()
assert next(b["stock"] for b in stock["brands"] if b["id"] == brand["id"]) == brand["stock"]
if before["earlier_orders"]:
    detail = check("GET", f"/admin/commerce/orders/{order_id}", session=admin).json()
    assert detail["provider_confirmed"] is False and "customer_phone" in detail
print("PASS: all locked-checkout assertions; no stock changes, orders, provider calls or paid state created.")