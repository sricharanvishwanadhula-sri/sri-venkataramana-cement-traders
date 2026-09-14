// Mirrors backend/models/checkout.py. Legacy JS is retained outside strict checking.
export interface CheckoutItem { product_id: string; brand_id: string; quantity: number }
export interface CartItemIn extends CheckoutItem {}
export interface CartQuoteIn { items: CartItemIn[]; advance_percent: 100 }
export interface OrderCreate { customer_name: string; customer_phone: string; notes?: string; items: CartItemIn[]; advance_percent: 100 }
export interface OrderStatusUpdate { status?: string | null; verified?: boolean | null; utr_ref?: string | null; screenshot_url?: string | null }
export interface ShopSettingsUpdate { shop_name?: string | null; address?: string | null; gstin?: string | null; maps_url?: string | null; opening_hours?: string | null; is_open?: boolean | null; default_advance_percent?: 100 | null }
export interface DraftInput { customer_name: string; customer_phone: string; notes: string; whatsapp_consent: true; items: CheckoutItem[]; advance_percent: 100; fulfillment: "shop_pickup" }
export interface HamaliLine { enabled: boolean; calc_type: string; rate: number; label: string }
export interface QuoteLine { product_id: string; product_title: string; brand_id: string; brand_name: string; hsn_code: string; gst_rate: number; unit: string; quantity: number; unit_price: number; subtotal_ex_gst: number; gst_amount: number; hamali: HamaliLine; hamali_amount: number }
export interface StockShortage { product_id: string; product_title: string; brand_name: string; requested: number; available: number }
export interface CartQuoteResponse { lines: QuoteLine[]; subtotal_ex_gst: number; hamali_total: number; gst_total: number; total_amount: number; advance_percent: 100; advance_amount: number; balance_amount: 0; insufficient: StockShortage[] }
export interface CheckoutCapabilities { status: "locked"; otp_available: false; payments_available: false; whatsapp_invoices_available: false; provider: "PhonePe Payment Gateway"; fulfillment: "shop_pickup"; payment_percent: 100; message: string; otp_ttl_seconds: number; otp_max_attempts: number; otp_resend_cooldown_seconds: number }
export interface TimelineEntry { at: string; description: string }
export interface DraftResponse { id: string; reference: string; customer_name: string; customer_phone: string; notes: string; whatsapp_consent: boolean; items: QuoteLine[]; subtotal_ex_gst: number; hamali_total: number; gst_total: number; total_amount: number; total_minor: number; advance_percent: 100; balance_amount: 0; fulfillment: "shop_pickup"; whatsapp_verified: false; payment_status: "not_started"; invoice_status: "not_issued"; created_at: string; updated_at: string; expires_at: string; timeline: TimelineEntry[] }
export interface CurrentDraftResponse { draft: DraftResponse | null }
export interface OtpVerifyInput { code: string }
export interface PaymentStartInput { idempotency_key: string }
export interface OrderPaymentView { verified: boolean; verified_at: string; utr_ref: string; provider: string; provider_payment_id: string; amount_minor: number; status: string; method: string }
export interface CommerceOrder { id: string; order_code: string; customer_name: string; customer_phone: string; notes: string; items: QuoteLine[]; subtotal_ex_gst: number; hamali_total: number; gst_total: number; total_amount: number; advance_percent: number; advance_amount: number; balance_amount: number; payment: OrderPaymentView; status: string; created_at: string; updated_at: string; provider_confirmed: boolean; invoice_status: string; refund_status: string; timeline: TimelineEntry[] }
export interface CommerceOverview { paid_orders: CommerceOrder[]; checkout_drafts: DraftResponse[]; earlier_orders: CommerceOrder[]; checked_at: string; limit: number }
export interface SetupTask { id: string; title: string; state: "required" | "ready" | "not_connected"; description: string; url: string }
export interface SetupResponse { capabilities: CheckoutCapabilities; tasks: SetupTask[]; charges_notice: string }