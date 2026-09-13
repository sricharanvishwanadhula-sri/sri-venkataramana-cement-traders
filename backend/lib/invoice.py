"""GST tax invoice PDF + UPI payment QR generation.

Pure helpers — no FastAPI imports here so this stays unit-testable.
Both functions return raw bytes for the route layer to stream.
"""

import io
from datetime import datetime, timezone
from urllib.parse import quote

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

# Brand palette (matches the frontend: amber + gunmetal)
AMBER = colors.HexColor("#D97706")
GUNMETAL = colors.HexColor("#0F172A")
SLATE = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F1F5F9")


# -----------------------------------------------------------------------------
# UPI QR
# -----------------------------------------------------------------------------
def build_upi_uri(upi_id: str, payee_name: str, amount: float, note: str) -> str:
    """Build a NPCI-standard UPI deep link.

    The resulting QR is readable by every UPI app — PhonePe, Google Pay, Paytm,
    BHIM, and any bank app — because they all implement the same `upi://pay`
    spec. One QR is all that is needed; there is no per-app QR.
    """
    params = [
        f"pa={quote(upi_id)}",
        f"pn={quote(payee_name)}",
        f"am={amount:.2f}",
        "cu=INR",
        f"tn={quote(note)}",
    ]
    return "upi://pay?" + "&".join(params)


def upi_qr_png(upi_id: str, payee_name: str, amount: float, note: str) -> bytes:
    """Render the UPI deep link as a PNG QR code."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(build_upi_uri(upi_id, payee_name, amount, note))
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# Invoice PDF
# -----------------------------------------------------------------------------
def _fmt_inr(n: float) -> str:
    """Indian digit grouping, e.g. 1234567.5 -> '12,34,567.50'."""
    neg = n < 0
    n = abs(float(n))
    whole = int(n)
    dec = round((n - whole) * 100)
    if dec == 100:
        whole += 1
        dec = 0
    s = str(whole)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    out = f"{s}.{dec:02d}"
    return f"-{out}" if neg else out


def _fmt_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return iso or "-"


def invoice_pdf(order: dict, shop: dict) -> bytes:
    """Render a GST tax invoice for one order. Returns PDF bytes."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    M = 15 * mm  # margin
    y = H - M

    shop_name = shop.get("shop_name") or "Sri Venkataramana Cement Traders"
    gstin = (shop.get("gstin") or "").strip()
    paid = bool(order.get("payment", {}).get("verified"))

    # ---------------- Header band ----------------
    c.setFillColor(GUNMETAL)
    c.rect(0, y - 26 * mm, W, 26 * mm, stroke=0, fill=1)

    c.setFillColor(AMBER)
    # Auto-fit the shop name so a long name never collides with "TAX INVOICE".
    name_txt = shop_name.upper()
    avail = W - 2 * M - 44 * mm  # reserve the right-hand invoice block
    font_size = 20
    while font_size > 10 and c.stringWidth(name_txt, "Helvetica-Bold", font_size) > avail:
        font_size -= 0.5
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(M, y - 11 * mm, name_txt)

    c.setFillColor(colors.white)
    c.setFont("Helvetica", 8.5)
    c.drawString(M, y - 16 * mm, shop.get("address") or "Andhra Pradesh, India")
    contact = f"Phone / WhatsApp: +{shop.get('whatsapp', '')}"
    c.drawString(M, y - 20 * mm, contact)
    if gstin:
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(M, y - 24 * mm, f"GSTIN: {gstin}")

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawRightString(W - M, y - 11 * mm, "TAX INVOICE")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - M, y - 17 * mm, f"Invoice No: {order.get('order_code', '-')}")
    c.drawRightString(W - M, y - 21.5 * mm, _fmt_date(order.get("created_at", "")))

    y -= 34 * mm

    # ---------------- Bill-to / payment summary ----------------
    box_h = 24 * mm
    half = (W - 2 * M) / 2

    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setFillColor(LIGHT)
    c.rect(M, y - box_h, half - 2 * mm, box_h, stroke=1, fill=1)
    c.rect(M + half + 2 * mm, y - box_h, half - 2 * mm, box_h, stroke=1, fill=1)

    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(M + 3 * mm, y - 5 * mm, "BILL TO")
    c.setFillColor(GUNMETAL)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M + 3 * mm, y - 11 * mm, order.get("customer_name", "-"))
    c.setFont("Helvetica", 9)
    c.drawString(M + 3 * mm, y - 16 * mm, f"Phone: {order.get('customer_phone', '-')}")
    c.setFont("Helvetica-Oblique", 7.5)
    c.setFillColor(SLATE)
    c.drawString(M + 3 * mm, y - 20.5 * mm, "Supply: local shop pickup")

    x2 = M + half + 5 * mm
    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x2, y - 5 * mm, "PAYMENT STATUS")
    c.setFillColor(colors.HexColor("#15803D") if paid else colors.HexColor("#B45309"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x2, y - 11 * mm, "ADVANCE RECEIVED" if paid else "ADVANCE PENDING")
    c.setFillColor(GUNMETAL)
    c.setFont("Helvetica", 8.5)
    c.drawString(x2, y - 16 * mm, f"Order status: {order.get('status', '-')}")
    utr = order.get("payment", {}).get("utr_ref") or ""
    if utr:
        c.drawString(x2, y - 20.5 * mm, f"UTR / Ref: {utr}")
    elif order.get("assigned_upi_id"):
        c.drawString(x2, y - 20.5 * mm, f"UPI: {order['assigned_upi_id']}")

    y -= box_h + 8 * mm

    # ---------------- Items table ----------------
    cols = [M, M + 74 * mm, M + 96 * mm, M + 112 * mm, M + 133 * mm, M + 152 * mm, W - M]
    c.setFillColor(GUNMETAL)
    c.rect(M, y - 7 * mm, W - 2 * M, 7 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(cols[0] + 2 * mm, y - 4.8 * mm, "ITEM / BRAND")
    c.drawString(cols[1] + 1 * mm, y - 4.8 * mm, "HSN")
    c.drawRightString(cols[3] - 2 * mm, y - 4.8 * mm, "QTY")
    c.drawRightString(cols[4] - 2 * mm, y - 4.8 * mm, "RATE")
    c.drawRightString(cols[5] - 2 * mm, y - 4.8 * mm, "GST%")
    c.drawRightString(cols[6] - 2 * mm, y - 4.8 * mm, "TAXABLE")
    y -= 7 * mm

    c.setFont("Helvetica", 8)
    for idx, it in enumerate(order.get("items", [])):
        row_h = 11 * mm
        if y - row_h < 60 * mm:  # page break guard
            c.showPage()
            y = H - M
            c.setFont("Helvetica", 8)
        if idx % 2 == 0:
            c.setFillColor(colors.HexColor("#F8FAFC"))
            c.rect(M, y - row_h, W - 2 * M, row_h, stroke=0, fill=1)

        c.setFillColor(GUNMETAL)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(cols[0] + 2 * mm, y - 4.5 * mm, str(it.get("product_title", ""))[:44])
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 7)
        sub = f"{it.get('brand_name', '')}"
        if it.get("hamali_amount", 0) > 0:
            sub += f"  |  Hamali Rs {_fmt_inr(it['hamali_amount'])}"
        c.drawString(cols[0] + 2 * mm, y - 8.6 * mm, sub[:58])

        c.setFillColor(GUNMETAL)
        c.setFont("Helvetica", 8)
        c.drawString(cols[1] + 1 * mm, y - 4.5 * mm, str(it.get("hsn_code") or "-"))
        c.drawRightString(cols[3] - 2 * mm, y - 4.5 * mm,
                          f"{it.get('quantity', 0):g} {it.get('unit', '')}")
        c.drawRightString(cols[4] - 2 * mm, y - 4.5 * mm, _fmt_inr(it.get("unit_price", 0)))
        c.drawRightString(cols[5] - 2 * mm, y - 4.5 * mm, f"{it.get('gst_rate', 0):g}%")
        c.setFont("Helvetica-Bold", 8.5)
        c.drawRightString(cols[6] - 2 * mm, y - 4.5 * mm, _fmt_inr(it.get("subtotal_ex_gst", 0)))
        y -= row_h

    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.line(M, y, W - M, y)
    y -= 7 * mm

    # ---------------- Totals ----------------
    def total_row(label, value, bold=False, color=GUNMETAL, size=9):
        nonlocal y
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawRightString(W - M - 34 * mm, y, label)
        c.drawRightString(W - M, y, f"Rs {_fmt_inr(value)}")
        y -= 5.5 * mm

    total_row("Taxable value", order.get("subtotal_ex_gst", 0))
    if order.get("hamali_total", 0) > 0:
        total_row("Hamali (loading/unloading)", order["hamali_total"])
    total_row("GST", order.get("gst_total", 0))
    y -= 1 * mm
    c.setStrokeColor(GUNMETAL)
    c.line(W - M - 70 * mm, y + 3 * mm, W - M, y + 3 * mm)
    y -= 1 * mm
    total_row("GRAND TOTAL", order.get("total_amount", 0), bold=True, size=11)
    y -= 2 * mm
    total_row(f"Advance ({order.get('advance_percent', 0)}%)",
              order.get("advance_amount", 0), bold=True, color=AMBER, size=10)
    total_row("Balance payable at pickup", order.get("balance_amount", 0), bold=True, size=10)

    y -= 8 * mm

    # ---------------- UPI QR for the balance/advance ----------------
    upi_id = order.get("assigned_upi_id") or ""
    qr_amount = order.get("balance_amount", 0) if paid else order.get("advance_amount", 0)
    qr_label = "SCAN TO PAY BALANCE" if paid else "SCAN TO PAY ADVANCE"
    if upi_id and qr_amount > 0:
        png = upi_qr_png(upi_id, shop_name, qr_amount,
                         f"{order.get('order_code', '')} {'balance' if paid else 'advance'}")
        c.drawImage(ImageReader(io.BytesIO(png)), M, y - 32 * mm,
                    width=30 * mm, height=30 * mm)
        c.setFillColor(GUNMETAL)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(M + 34 * mm, y - 6 * mm, qr_label)
        c.setFont("Helvetica", 8)
        c.setFillColor(SLATE)
        c.drawString(M + 34 * mm, y - 11 * mm, f"Rs {_fmt_inr(qr_amount)} to {upi_id}")
        c.drawString(M + 34 * mm, y - 15.5 * mm, "Works with PhonePe, Google Pay, Paytm,")
        c.drawString(M + 34 * mm, y - 19.5 * mm, "BHIM and any bank UPI app.")
        y -= 36 * mm

    # ---------------- Footer ----------------
    if not gstin:
        c.setFillColor(colors.HexColor("#B45309"))
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(M, y, "GSTIN not configured - add it in Admin > Settings to issue a compliant tax invoice.")
        y -= 5 * mm

    c.setFillColor(SLATE)
    c.setFont("Helvetica", 7)
    c.drawString(M, 16 * mm, f"{shop_name} - local shop pickup only. Goods once sold are subject to shop policy.")
    c.drawString(M, 12 * mm, "This is a computer-generated tax invoice.")
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(W - M, 12 * mm, "Authorised Signatory")

    c.showPage()
    c.save()
    return buf.getvalue()
