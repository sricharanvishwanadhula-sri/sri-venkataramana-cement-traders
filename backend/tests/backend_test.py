"""Backend tests for Sri Venkataramana Cement Traders — Sprint 1 pickup alignment."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://build-materials-pro-7.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "sricharanvishwanadhula@gmail.com"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- Categories ----------------
class TestCategories:
    def test_public_categories_seeded(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        names = {c["name"] for c in cats}
        expected = {"Cement Bags", "TMT Steel Rods", "Sand & Aggregates", "Binding Wire & Accessories", "Other"}
        assert expected.issubset(names), f"missing categories: {expected-names}"
        # cement bags has per_bag hamali of 4
        cb = next(c for c in cats if c["name"] == "Cement Bags")
        assert cb["hamali_default"]["enabled"] is True
        assert cb["hamali_default"]["calc_type"] == "per_bag"
        assert cb["hamali_default"]["rate"] == 4.0


# ---------------- Products ----------------
class TestProducts:
    def test_products_list_has_hamali_resolved(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) > 0
        # cement product must have hamali per_bag 4 (from category default)
        cement = [p for p in prods if p["category"] == "Cement Bags"]
        assert cement, "no Cement Bags products"
        for p in cement:
            assert p["hamali"]["enabled"] is True
            assert p["hamali"]["calc_type"] == "per_bag"
            assert p["hamali"]["rate"] == 4.0
            assert p["hsn_code"]
            assert p["gst_rate"] > 0
            assert isinstance(p["brands"], list) and len(p["brands"]) > 0


# ---------------- Cart Quote ----------------
class TestCartQuote:
    def test_50_cement_bags(self, s):
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        payload = {"items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 50}], "advance_percent": 50}
        r = s.post(f"{API}/cart/quote", json=payload)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["hamali_total"] == 200.0
        assert q["subtotal_ex_gst"] == round(brand["price"] * 50, 2)
        expected_gst = round(q["subtotal_ex_gst"] * cement["gst_rate"] / 100.0, 2)
        assert abs(q["gst_total"] - expected_gst) < 0.5
        assert q["advance_percent"] == 50
        assert abs(q["advance_amount"] - round(q["total_amount"] * 0.5, 2)) < 0.01

    def test_insufficient_stock(self, s):
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        payload = {"items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": brand["stock"] + 9999}]}
        r = s.post(f"{API}/cart/quote", json=payload)
        assert r.status_code == 200
        assert len(r.json()["insufficient"]) == 1


# ---------------- Orders ----------------
class TestOrders:
    _created_order = {}

    @pytest.mark.parametrize("adv", [25, 50, 100])
    def test_create_order_advance(self, s, adv):
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        payload = {
            "customer_name": "TEST_Buyer",
            "customer_phone": "9998887777",
            "notes": "test",
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 2}],
            "advance_percent": adv,
        }
        r = s.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        order = data["order"]
        assert order["order_code"].startswith("SVCT-")
        assert order["advance_percent"] == adv
        assert order["assigned_upi_id"]
        assert "whatsapp_url" in data
        assert data["whatsapp_url"].startswith("https://wa.me/")
        TestOrders._created_order[adv] = order

    def test_reject_invalid_advance(self, s):
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        r = s.post(f"{API}/orders", json={
            "customer_name": "TEST_x", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 1}],
            "advance_percent": 30,
        })
        assert r.status_code == 400

    def test_reject_delivery_address(self, s):
        # OrderCreate doesn't include delivery_address; Pydantic by default allows extra=ignore
        # Ensure the field isn't accepted / stored. Test by creating an order with it and checking response.
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        r = s.post(f"{API}/orders", json={
            "customer_name": "TEST_addr", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 1}],
            "advance_percent": 50,
            "delivery_address": "should not be accepted",
        })
        # Accept either 422 (strict rejection) or 200 with no address stored
        if r.status_code == 200:
            order = r.json()["order"]
            assert "delivery_address" not in order

    def test_track_by_phone(self, s):
        r = s.get(f"{API}/orders/track", params={"phone": "9998887777"})
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        # sorted desc
        codes = [d["created_at"] for d in docs]
        assert codes == sorted(codes, reverse=True)

    def test_get_by_order_code_uppercase(self, s):
        order = list(TestOrders._created_order.values())[0]
        code = order["order_code"]
        r = s.get(f"{API}/orders/{code.lower()}")
        assert r.status_code == 200
        assert r.json()["order_code"] == code


# ---------------- Admin: orders verify ----------------
class TestAdminOrderVerify:
    def test_admin_verify_flips_status(self, s, admin_headers):
        prods = s.get(f"{API}/products").json()
        cement = next(p for p in prods if p["category"] == "Cement Bags")
        brand = cement["brands"][0]
        create = s.post(f"{API}/orders", json={
            "customer_name": "TEST_Verify", "customer_phone": "9998887777",
            "items": [{"product_id": cement["id"], "brand_id": brand["id"], "quantity": 1}],
            "advance_percent": 25,
        }).json()
        order = create["order"]
        assert order["status"] == "PendingVerification"
        r = requests.patch(f"{API}/admin/orders/{order['id']}",
                           headers=admin_headers, json={"verified": True, "utr_ref": "UTR123"})
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["payment"]["verified"] is True
        assert updated["payment"]["utr_ref"] == "UTR123"
        assert updated["status"] == "AdvanceReceived"


# ---------------- UPI ----------------
class TestUpi:
    def test_upi_active_returns_enabled(self, s):
        r = s.get(f"{API}/upi/active")
        assert r.status_code == 200
        data = r.json()
        assert data["active"] is not None
        assert data["active"]["enabled"] is True
        assert data["limit_2day"] > 0

    def test_manual_active_override(self, s, admin_headers):
        upis = requests.get(f"{API}/admin/upi", headers=admin_headers).json()
        assert len(upis) >= 2
        target = upis[1]  # second one; not first-in-sort
        r = requests.patch(f"{API}/admin/upi/{target['id']}", headers=admin_headers, json={"manual_active": True})
        assert r.status_code == 200
        active = requests.get(f"{API}/upi/active").json()["active"]
        assert active["id"] == target["id"]
        # clear override
        requests.patch(f"{API}/admin/upi/{target['id']}", headers=admin_headers, json={"manual_active": False})


# ---------------- Admin: categories CRUD ----------------
class TestAdminCategories:
    def test_crud_and_soft_delete(self, s, admin_headers):
        # create
        r = requests.post(f"{API}/admin/categories", headers=admin_headers,
                          json={"name": "TEST_Cat", "sort_order": 50,
                                "hamali_default": {"enabled": True, "calc_type": "per_piece", "rate": 5, "label": "L+U"}})
        assert r.status_code == 200
        cat = r.json()
        # patch
        r = requests.patch(f"{API}/admin/categories/{cat['id']}", headers=admin_headers,
                           json={"hamali_default": {"enabled": True, "calc_type": "fixed", "rate": 99, "label": "flat"}})
        assert r.status_code == 200
        assert r.json()["hamali_default"]["rate"] == 99
        # delete (no products, hard delete)
        r = requests.delete(f"{API}/admin/categories/{cat['id']}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("soft_deleted") is not True

    def test_soft_delete_when_products_exist(self, s, admin_headers):
        # Cement Bags has active products
        cats = requests.get(f"{API}/admin/categories", headers=admin_headers).json()
        cb = next(c for c in cats if c["name"] == "Cement Bags")
        r = requests.delete(f"{API}/admin/categories/{cb['id']}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("soft_deleted") is True
        # restore
        requests.patch(f"{API}/admin/categories/{cb['id']}", headers=admin_headers, json={"is_active": True})


# ---------------- Admin: products CRUD + hamali override ----------------
class TestAdminProducts:
    def test_product_hamali_override(self, s, admin_headers):
        prods = requests.get(f"{API}/admin/products", headers=admin_headers).json()
        tmt = next(p for p in prods if p["category"] == "TMT Steel Rods")
        # override at product level: per_ton with rate 500 (differ from default 300)
        r = requests.patch(f"{API}/admin/products/{tmt['id']}", headers=admin_headers,
                           json={"hamali": {"enabled": True, "calc_type": "per_ton", "rate": 500, "label": "override"}})
        assert r.status_code == 200
        # quote with 2 tons -> hamali_total = 1000
        brand = tmt["brands"][0]
        q = s.post(f"{API}/cart/quote", json={
            "items": [{"product_id": tmt["id"], "brand_id": brand["id"], "quantity": 2}]
        }).json()
        assert q["hamali_total"] == 1000.0
        # restore
        requests.patch(f"{API}/admin/products/{tmt['id']}", headers=admin_headers, json={"hamali": None})


# ---------------- CSV ----------------
class TestCSV:
    def test_template(self, s, admin_headers):
        r = requests.get(f"{API}/admin/products/csv-template", headers=admin_headers)
        assert r.status_code == 200
        csv_text = r.json()["csv"]
        assert "hamali_calc_type" in csv_text and "hamali_rate" in csv_text

    def test_bulk_import(self, s, admin_headers):
        csv_data = (
            "title,category,unit,description,image_url,hsn_code,gst_rate,brand_name,brand_price,brand_stock,hamali_calc_type,hamali_rate,hamali_label\n"
            "TEST_Bulk Item,Other,Piece,test,,00000000,18,BrandA,100,10,fixed,25,LU\n"
        )
        files = {"file": ("test.csv", csv_data, "text/csv")}
        headers = {k: v for k, v in admin_headers.items() if k != "Content-Type"}
        r = requests.post(f"{API}/admin/products/bulk-csv", headers=headers, files=files)
        assert r.status_code == 200, r.text
        assert r.json()["created"] + r.json()["updated"] >= 1


# ---------------- Stats & settings ----------------
class TestStatsSettings:
    def test_admin_stats(self, s, admin_headers):
        r = requests.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ("products", "orders", "pending_orders", "upi_accounts", "revenue_30day", "advance_30day"):
            assert k in data
        assert "meetings" not in data

    def test_public_settings(self, s):
        r = s.get(f"{API}/settings/public")
        assert r.status_code == 200
        data = r.json()
        for k in ("shop_name", "address", "whatsapp", "opening_hours", "is_open", "default_advance_percent"):
            assert k in data


# ---------------- No meetings ----------------
class TestNoMeetings:
    def test_no_meetings_endpoint(self, s):
        assert s.get(f"{API}/meetings").status_code == 404
        assert s.post(f"{API}/book-meeting", json={}).status_code == 404


# ---------------- Cleanup ----------------
class TestCleanup:
    def test_cleanup_test_orders(self, s, admin_headers):
        orders = requests.get(f"{API}/admin/orders", headers=admin_headers).json()
        for o in orders:
            if o.get("customer_name", "").startswith("TEST_"):
                requests.delete(f"{API}/admin/orders/{o['id']}", headers=admin_headers)

    def test_cleanup_test_products(self, s, admin_headers):
        prods = requests.get(f"{API}/admin/products", headers=admin_headers).json()
        for p in prods:
            if p.get("title", "").startswith("TEST_"):
                requests.delete(f"{API}/admin/products/{p['id']}", headers=admin_headers)
