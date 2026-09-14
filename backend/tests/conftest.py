"""Shared fixtures for locked-checkout payment safeguard tests.

All tests hit the RUNNING server over HTTP - never import the app object,
never mock the DB. Draft/cookie flows require the real ingress (HTTPS) since
the session cookie is Secure and browsers/http-clients will not echo a
Secure cookie back over plain HTTP - so BASE_URL defaults to the public
ingress URL (APP_URL) rather than localhost for anything cookie-dependent.
Pure stateless JSON checks are fine on localhost:8001 too.
"""
import os
import re
import uuid
from pathlib import Path

import httpx
import pytest

PUBLIC_BASE_URL = os.environ.get("APP_URL", "https://open-business-sri.preview.emergentagent.com").rstrip("/")
LOCAL_BASE_URL = "http://localhost:8001"


@pytest.fixture(scope="session")
def base_url():
    """Public HTTPS ingress - required for Secure/HttpOnly cookie round-trips."""
    return PUBLIC_BASE_URL


@pytest.fixture(scope="session")
def local_base_url():
    """Plain localhost API - fine for stateless / no-cookie assertions."""
    return LOCAL_BASE_URL


@pytest.fixture
def checkout_client(base_url):
    client = httpx.Client(base_url=base_url, timeout=30, headers={"X-Checkout-Intent": "pickup"})
    yield client
    client.close()


@pytest.fixture
def plain_client(local_base_url):
    client = httpx.Client(base_url=local_base_url, timeout=30)
    yield client
    client.close()


@pytest.fixture(scope="session")
def admin_credentials():
    text = Path("/app/memory/test_credentials.md").read_text()
    email = re.search(r"Email: `([^`]+)`", text)[1]
    password = re.search(r"Password: `([^`]+)`", text)[1]
    return email, password


@pytest.fixture
def admin_client(base_url, admin_credentials):
    email, password = admin_credentials
    client = httpx.Client(base_url=base_url, timeout=30)
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text[:300]
    token = r.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    client.close()


def unique_phone():
    """Valid Indian mobile number, unique per call, for isolated fixtures."""
    suffix = uuid.uuid4().int % 10 ** 8
    return f"+919{str(suffix).zfill(8)}"


@pytest.fixture
def stocked_item(checkout_client):
    products = checkout_client.get("/api/products").json()
    product = next(p for p in products if any(b["stock"] > 2 for b in p["brands"]))
    brand = next(b for b in product["brands"] if b["stock"] > 2)
    return {"product_id": product["id"], "brand_id": brand["id"], "quantity": 1}


def draft_payload(item, phone=None, name="tscheck-buyer"):
    return {
        "customer_name": name,
        "customer_phone": phone or unique_phone(),
        "notes": "tscheck automated verification draft only; no order or payment.",
        "whatsapp_consent": True,
        "items": [item],
        "advance_percent": 100,
        "fulfillment": "shop_pickup",
    }
