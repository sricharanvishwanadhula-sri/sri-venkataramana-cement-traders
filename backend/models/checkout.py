from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from lib.checkout_security import normalize_phone


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CheckoutItem(StrictModel):
    product_id: str = Field(min_length=1, max_length=100)
    brand_id: str = Field(min_length=1, max_length=100)
    quantity: float = Field(gt=0, le=100000, allow_inf_nan=False)


class DraftInput(StrictModel):
    customer_name: str = Field(min_length=2, max_length=100)
    customer_phone: str
    notes: str = Field(default="", max_length=1000)
    whatsapp_consent: Literal[True]
    items: list[CheckoutItem] = Field(min_length=1, max_length=100)
    advance_percent: Literal[100] = 100
    fulfillment: Literal["shop_pickup"] = "shop_pickup"

    @field_validator("customer_phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        return normalize_phone(value)


class HamaliLine(BaseModel):
    enabled: bool = False
    calc_type: str = "disabled"
    rate: float = 0
    label: str = ""


class QuoteLine(BaseModel):
    product_id: str
    product_title: str
    brand_id: str
    brand_name: str
    hsn_code: str = ""
    gst_rate: float = 0
    unit: str
    quantity: float
    unit_price: float
    subtotal_ex_gst: float
    gst_amount: float
    hamali: HamaliLine
    hamali_amount: float


class StockShortage(BaseModel):
    product_id: str
    product_title: str
    brand_name: str
    requested: float
    available: float


class CartQuoteResponse(BaseModel):
    lines: list[QuoteLine]
    subtotal_ex_gst: float
    hamali_total: float
    gst_total: float
    total_amount: float
    advance_percent: Literal[100] = 100
    advance_amount: float
    balance_amount: Literal[0] = 0
    insufficient: list[StockShortage]


class CheckoutCapabilities(BaseModel):
    status: Literal["locked"] = "locked"
    otp_available: Literal[False] = False
    payments_available: Literal[False] = False
    whatsapp_invoices_available: Literal[False] = False
    provider: Literal["PhonePe Payment Gateway"] = "PhonePe Payment Gateway"
    fulfillment: Literal["shop_pickup"] = "shop_pickup"
    payment_percent: Literal[100] = 100
    message: str = "Online payments are paused while official WhatsApp verification and PhonePe setup are completed. No money can be collected through this checkout."
    otp_ttl_seconds: int = 300
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 60


class TimelineEntry(BaseModel):
    at: str
    description: str


class DraftResponse(BaseModel):
    id: str
    reference: str
    customer_name: str
    customer_phone: str
    notes: str
    whatsapp_consent: bool
    items: list[QuoteLine]
    subtotal_ex_gst: float
    hamali_total: float
    gst_total: float
    total_amount: float
    total_minor: int
    advance_percent: Literal[100] = 100
    balance_amount: Literal[0] = 0
    fulfillment: Literal["shop_pickup"] = "shop_pickup"
    whatsapp_verified: Literal[False] = False
    payment_status: Literal["not_started"] = "not_started"
    invoice_status: Literal["not_issued"] = "not_issued"
    created_at: str
    updated_at: str
    expires_at: str
    timeline: list[TimelineEntry]


class CurrentDraftResponse(BaseModel):
    draft: DraftResponse | None = None


class OtpVerifyInput(StrictModel):
    code: str = Field(pattern=r"^\d{6}$")


class PaymentStartInput(StrictModel):
    idempotency_key: str = Field(min_length=16, max_length=100)


class OrderPaymentView(BaseModel):
    verified: bool = False
    verified_at: str = ""
    utr_ref: str = ""
    provider: str = ""
    provider_payment_id: str = ""
    amount_minor: int = 0
    status: str = "not_verified"
    method: str = ""


class CommerceOrder(BaseModel):
    id: str
    order_code: str
    customer_name: str
    customer_phone: str
    notes: str = ""
    items: list[QuoteLine]
    subtotal_ex_gst: float
    hamali_total: float
    gst_total: float
    total_amount: float
    advance_percent: int
    advance_amount: float
    balance_amount: float
    payment: OrderPaymentView
    status: str
    created_at: str
    updated_at: str
    provider_confirmed: bool = False
    invoice_status: str = "not_sent"
    refund_status: str = "none_recorded"
    timeline: list[TimelineEntry] = Field(default_factory=list)


class CommerceOverview(BaseModel):
    paid_orders: list[CommerceOrder]
    checkout_drafts: list[DraftResponse]
    earlier_orders: list[CommerceOrder]
    checked_at: str
    limit: int = 100


class SetupTask(BaseModel):
    id: str
    title: str
    state: Literal["required", "ready", "not_connected"]
    description: str
    url: str = ""


class SetupResponse(BaseModel):
    capabilities: CheckoutCapabilities
    tasks: list[SetupTask]
    charges_notice: str