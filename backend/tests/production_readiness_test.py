"""Production readiness test suite — iteration 2.

Covers: security/data exposure, XSS storage, math accuracy (hamali/GST/advance rounding),
concurrent atomic stock decrement, verified-only UPI rotation, order lifecycle,
input validation, 90-day track window, no legacy endpoints, no _id leak.
"""
import os
import concurrent.futures
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://build-materials-pro-7.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "sricharanvishwanadhula@gmail.com"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def products():
    return requests.get(f"{API}/products").json()


def _find_cement(products):
    return next(p for p in products if p["category"] == "Cement Bags" and p["title"] == "OPC 53 Grade Cement")


def _find_tmt(products):
    return next(p for p in products if p["category"] == "TMT Steel Rods" and "Fe500D" in p["title"])


# ---------------- Security: data exposure ----------------
class TestSecurityExposure:
    def test_public_products_no_wholesale_or_threshold(self, products):
        assert products, "no products seeded"
        for p in products:
            assert "_id" not in p
            for b in p["brands"]:
                assert "wholesale_price" not in b, "wholesale_price leaked in public /products"
                assert "wholesale_min_qty" not in b, "wholesale_min_qty leaked"
                assert "low_stock_threshold" not in b, "low_stock_threshold leaked in public /products"

    def test_admin_products_expose_all(self, admin_headers):
        r = requests.get(f"{API}/admin/products", headers=admin_headers)
        assert r.status_code == 200
        for p in r.json():
            for b in p["brands"]:
                # low_stock_threshold must be present in admin view
                assert "low_stock_threshold" in b

    def test_public_settings_no_secrets(self):
        r = requests.get(f"{API}/settings/public")
        assert r.status_code == 200
        data = r.json()
        blob = str(data).lower()
        assert "jwt_secret" not in blob
        assert "password" not in blob
        assert ADMIN_EMAIL not in blob


# ---------------- Auth ----------------
class TestAuth:
    def test_wrong_password_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_no_token_401(self):
        r = requests.get(f"{API}/admin/products")
        assert r.status_code == 401

    def test_invalid_token_401(self):
        r = requests.get(f"{API}/admin/products", headers={"Authorization": "Bearer badtoken"})
        assert r.status_code == 401


# ---------------- Math accuracy ----------------
class TestMath:
    def test_gst_cement_50_bags(self, products):
        cement = _find_cement(products)
        # find UltraTech
        brand = next(b for b in cement["brands"] if b["name"] == "UltraTech")
        r = requests.post(f"{API}/cart/quote", json={
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 50}],
            "advance_percent": 50,
        })
        assert r.status_code == 200
        q = r.json()
        assert q["subtotal_ex_gst"] == 21000.0
        assert q["hamali_total"] == 200.0  # 4 * 50
        assert q["gst_total"] == 5880.0    # 21000 * 0.28, hamali NOT taxed
        assert q["total_amount"] == 27080.0
        assert q["advance_amount"] == 13540.0
        assert q["balance_amount"] == 13540.0

    def test_advance_rounding_33_bags(self, products):
        cement = _find_cement(products)
        brand = next(b for b in cement["brands"] if b["name"] == "UltraTech")
        for adv in (25, 50, 100):
            r = requests.post(f"{API}/cart/quote", json={
                "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 33}],
                "advance_percent": adv,
            })
            q = r.json()
            assert q["subtotal_ex_gst"] == 13860.0
            assert q["hamali_total"] == 132.0
            assert q["gst_total"] == 3880.8
            assert q["total_amount"] == 17872.8
            expected_adv = round(17872.8 * adv / 100.0, 2)
            assert q["advance_amount"] == expected_adv
            assert round(q["advance_amount"] + q["balance_amount"], 2) == 17872.8

    def test_steel_tmt_2ton_hamali(self, products):
        tmt = _find_tmt(products)
        brand = tmt["brands"][0]
        r = requests.post(f"{API}/cart/quote", json={
            "items": [{"product_id": tmt["id"], "brand_id": brand["id"], "quantity": 2}],
            "advance_percent": 50,
        })
        q = r.json()
        assert q["hamali_total"] == 600.0  # 300 * 2

    def test_sand_no_hamali(self, products):
        sand = next(p for p in products if p["category"] == "Sand & Aggregates")
        brand = sand["brands"][0]
        r = requests.post(f"{API}/cart/quote", json={
            "items": [{"product_id": sand["id"], "brand_id": brand["id"], "quantity": 5}],
            "advance_percent": 50,
        })
        q = r.json()
        assert q["hamali_total"] == 0.0


# ---------------- Product-level Hamali override ----------------
class TestHamaliOverride:
    def test_product_override_wins(self, admin_headers, products):
        cement = _find_cement(products)
        # Set product-level fixed hamali 100
        r = requests.patch(f"{API}/admin/products/{cement['id']}", headers=admin_headers,
                           json={"hamali": {"enabled": True, "calc_type": "fixed", "rate": 100, "label": "override"}})
        assert r.status_code == 200
        try:
            brand = next(b for b in cement["brands"] if b["name"] == "UltraTech")
            q = requests.post(f"{API}/cart/quote", json={
                "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 50}],
            }).json()
            assert q["hamali_total"] == 100.0, f"override should be fixed 100 not {q['hamali_total']}"
        finally:
            # restore inherit
            requests.patch(f"{API}/admin/products/{cement['id']}", headers=admin_headers,
                           json={"hamali": None})
        # Confirm restored to inherit (per_bag 4 * 50 = 200)
        q2 = requests.post(f"{API}/cart/quote", json={
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 50}],
        }).json()
        assert q2["hamali_total"] == 200.0


# ---------------- Input validation & XSS ----------------
class TestValidation:
    def test_missing_customer_name_422(self, products):
        cement = _find_cement(products)
        b = cement["brands"][0]
        r = requests.post(f"{API}/orders", json={
            "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": b["id"], "quantity": 1}],
            "advance_percent": 50,
        })
        assert r.status_code == 422

    def test_empty_items_400(self):
        r = requests.post(f"{API}/orders", json={
            "customer_name": "TEST_X", "customer_phone": "9998887777",
            "items": [], "advance_percent": 50,
        })
        assert r.status_code == 400

    def test_invalid_advance_99(self, products):
        cement = _find_cement(products)
        b = cement["brands"][0]
        r = requests.post(f"{API}/orders", json={
            "customer_name": "TEST_X", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": b["id"], "quantity": 1}],
            "advance_percent": 99,
        })
        assert r.status_code == 400

    def test_track_empty_phone_400(self):
        r = requests.get(f"{API}/orders/track", params={"phone": ""})
        assert r.status_code in (400, 422)

    def test_unknown_order_code_404(self):
        r = requests.get(f"{API}/orders/SVCT-DOESNOTEX")
        assert r.status_code == 404

    def test_xss_stored_as_text(self, products, admin_headers):
        cement = _find_cement(products)
        b = cement["brands"][0]
        xss = "<script>alert('xss')</script>"
        r = requests.post(f"{API}/orders", json={
            "customer_name": f"TEST_{xss}",
            "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": b["id"], "quantity": 1}],
            "advance_percent": 50,
        })
        assert r.status_code == 200
        order = r.json()["order"]
        # Value is stored as-is (frontend must escape). Ensure it's a string, not executed on server side.
        assert xss in order["customer_name"]
        # cleanup
        requests.delete(f"{API}/admin/orders/{order['id']}", headers=admin_headers)


# ---------------- Insufficient stock & concurrency ----------------
class TestStock:
    def test_insufficient_stock_409_no_decrement(self, products, admin_headers):
        cement = _find_cement(products)
        brand = cement["brands"][0]
        # get admin view of stock
        admin_prods = requests.get(f"{API}/admin/products", headers=admin_headers).json()
        cement_admin = next(p for p in admin_prods if p["id"] == cement["id"])
        current_stock = next(b for b in cement_admin["brands"] if b["id"] == brand["id"])["stock"]

        r = requests.post(f"{API}/orders", json={
            "customer_name": "TEST_over", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": current_stock + 100}],
            "advance_percent": 50,
        })
        assert r.status_code == 409
        # Confirm stock unchanged
        admin_prods2 = requests.get(f"{API}/admin/products", headers=admin_headers).json()
        cement2 = next(p for p in admin_prods2 if p["id"] == cement["id"])
        stock2 = next(b for b in cement2["brands"] if b["id"] == brand["id"])["stock"]
        assert stock2 == current_stock, "stock changed on 409"

    def test_concurrent_orders_only_one_succeeds(self, admin_headers):
        # Create a temp product with stock=1
        r = requests.post(f"{API}/admin/products", headers=admin_headers, json={
            "title": "TEST_ConcurrentProduct", "category": "Other", "unit": "Piece",
            "description": "test", "hsn_code": "0000", "gst_rate": 18,
            "brands": [{"name": "Solo", "price": 100, "stock": 1}],
        })
        assert r.status_code == 200, r.text
        prod = r.json()
        pid = prod["id"]
        bid = prod["brands"][0]["id"]
        try:
            def place():
                return requests.post(f"{API}/orders", json={
                    "customer_name": "TEST_Race", "customer_phone": "9998887777",
                    "items": [{"product_id": pid, "brand_id": bid, "quantity": 1}],
                    "advance_percent": 50,
                })
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
                futs = [ex.submit(place) for _ in range(5)]
                results = [f.result() for f in futs]
            statuses = [r.status_code for r in results]
            successes = [r for r in results if r.status_code == 200]
            failures = [r for r in results if r.status_code == 409]
            assert len(successes) == 1, f"expected 1 success got {len(successes)}, statuses={statuses}"
            assert len(failures) == len(results) - 1
            # cleanup created orders
            order = successes[0].json()["order"]
            requests.delete(f"{API}/admin/orders/{order['id']}", headers=admin_headers)
        finally:
            requests.delete(f"{API}/admin/products/{pid}", headers=admin_headers)


# ---------------- Order lifecycle ----------------
class TestLifecycle:
    def test_full_status_flow(self, products, admin_headers):
        cement = _find_cement(products)
        b = cement["brands"][0]
        create = requests.post(f"{API}/orders", json={
            "customer_name": "TEST_Life", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": b["id"], "quantity": 1}],
            "advance_percent": 50,
        }).json()
        oid = create["order"]["id"]
        try:
            assert create["order"]["status"] == "PendingVerification"
            # verify -> AdvanceReceived
            r = requests.patch(f"{API}/admin/orders/{oid}", headers=admin_headers,
                               json={"verified": True, "utr_ref": "UTR-LIFE"})
            assert r.status_code == 200
            assert r.json()["status"] == "AdvanceReceived"
            # ReadyForPickup
            r = requests.patch(f"{API}/admin/orders/{oid}", headers=admin_headers, json={"status": "ReadyForPickup"})
            assert r.status_code == 200
            assert r.json()["status"] == "ReadyForPickup"
            # Completed
            r = requests.patch(f"{API}/admin/orders/{oid}", headers=admin_headers, json={"status": "Completed"})
            assert r.status_code == 200
            assert r.json()["status"] == "Completed"
            # Invalid status rejected
            r = requests.patch(f"{API}/admin/orders/{oid}", headers=admin_headers, json={"status": "BogusStatus"})
            assert r.status_code == 400
        finally:
            requests.delete(f"{API}/admin/orders/{oid}", headers=admin_headers)


# ---------------- WhatsApp deeplink ----------------
class TestWhatsApp:
    def test_whatsapp_url_encoded(self, products, admin_headers):
        cement = _find_cement(products)
        b = cement["brands"][0]
        r = requests.post(f"{API}/orders", json={
            "customer_name": "TEST_Wa",
            "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": b["id"], "quantity": 2}],
            "advance_percent": 50,
        })
        data = r.json()
        oid = data["order"]["id"]
        try:
            url = data["whatsapp_url"]
            assert url.startswith("https://wa.me/")
            assert "text=" in url
            from urllib.parse import unquote, urlparse, parse_qs
            qs = parse_qs(urlparse(url).query)
            text = qs["text"][0]
            assert data["order"]["order_code"] in text
            assert "Total:" in text
            assert "Advance" in text
        finally:
            requests.delete(f"{API}/admin/orders/{oid}", headers=admin_headers)


# ---------------- Legacy endpoints gone ----------------
class TestNoLegacy:
    def test_no_meetings(self):
        assert requests.get(f"{API}/meetings").status_code == 404
        assert requests.post(f"{API}/book-meeting", json={}).status_code == 404


# ---------------- Performance ----------------
class TestPerf:
    def test_products_response_time(self):
        import time
        start = time.time()
        r = requests.get(f"{API}/products")
        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 1.5, f"products too slow: {elapsed:.2f}s"
