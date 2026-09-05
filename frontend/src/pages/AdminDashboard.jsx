import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Wallet,
  ShoppingBag,
  CalendarDays,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  X,
  MessageCircle,
  IndianRupee,
  Upload,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api, { formatINR, formatApiError } from "@/lib/api";

const CATEGORIES = ["Cement Bags", "TMT Steel Rods", "Sand & Aggregates", "Binding Wire & Accessories", "Other"];
const UNITS = ["Bag (50 Kg)", "Ton", "KG", "Bundle", "Piece"];

const TABS = [
  { key: "overview", label: "Overview", icon: Wallet },
  { key: "products", label: "Products", icon: Package },
  { key: "upi", label: "UPI Accounts", icon: IndianRupee },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "meetings", label: "Meetings", icon: CalendarDays },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      nav("/admin");
      return;
    }
    loadStats();
  }, [nav]);

  const loadStats = () => api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => nav("/admin"));

  const logout = () => {
    localStorage.removeItem("admin_token");
    nav("/admin");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="admin-dashboard">
      <header className="bg-[#0F172A] border-b border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <div className="font-heading font-black text-white text-lg">Admin Dashboard</div>
            <div className="text-xs text-slate-400 uppercase tracking-widest">Sri Venkataramana Cement Traders</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:bg-[#1E293B]" data-testid="admin-logout">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" data-testid="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-heading font-bold text-sm uppercase tracking-wider whitespace-nowrap transition ${
                tab === t.key ? "bg-[#0F172A] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-[#D97706]"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview stats={stats} />}
        {tab === "products" && <ProductsTab onChange={loadStats} />}
        {tab === "upi" && <UpiTab />}
        {tab === "orders" && <OrdersTab onChange={loadStats} />}
        {tab === "meetings" && <MeetingsTab onChange={loadStats} />}
      </div>
    </div>
  );
}

function Overview({ stats }) {
  if (!stats) return <div className="text-slate-500">Loading...</div>;
  const cards = [
    { label: "Total Products", value: stats.products, sub: "Active in catalog" },
    { label: "Revenue (30d)", value: formatINR(stats.revenue_30day), sub: "Last 30 days" },
    { label: "Total Orders", value: stats.orders, sub: `${stats.pending_orders} pending` },
    { label: "Meeting Requests", value: stats.meetings, sub: `${stats.new_meetings} new` },
    { label: "UPI Accounts", value: stats.upi_accounts, sub: "Enabled" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="overview-cards">
      {cards.map((c) => (
        <div key={c.label} className="dashboard-stat">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">{c.label}</div>
          <div className="font-mono-price font-bold text-2xl text-[#0F172A] mt-2">{c.value}</div>
          <div className="text-xs text-slate-400 mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ------- Products Tab -------
function emptyProduct() {
  return { title: "", category: CATEGORIES[0], unit: UNITS[0], description: "", image_url: "", brands: [{ name: "", price: 0, stock: 0 }] };
}

function ProductsTab({ onChange }) {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCsv, setShowCsv] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);

  const load = () => api.get("/products").then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(emptyProduct()); setShowForm(true); };
  const openEdit = (p) => { setEditing(JSON.parse(JSON.stringify(p))); setShowForm(true); };

  const uploadCsv = async () => {
    if (!csvFile) { toast.error("Please pick a CSV file"); return; }
    setCsvUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      const { data } = await api.post("/admin/products/bulk-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult(data);
      toast.success(`Created ${data.created}, updated ${data.updated} products`);
      load();
      onChange?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadTemplate = async () => {
    const { data } = await api.get("/admin/products/csv-template");
    const blob = new Blob([data.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!editing.title || !editing.category) { toast.error("Title & category required"); return; }
    const cleanBrands = editing.brands.filter((b) => b.name);
    if (cleanBrands.length === 0) { toast.error("At least one brand required"); return; }
    try {
      const body = { ...editing, brands: cleanBrands.map((b) => ({ id: b.id, name: b.name, price: Number(b.price), stock: Number(b.stock) })) };
      if (editing.id) {
        await api.patch(`/admin/products/${editing.id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/admin/products", body);
        toast.success("Product added");
      }
      setShowForm(false);
      load();
      onChange?.();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/admin/products/${id}`);
    toast.success("Deleted");
    load();
    onChange?.();
  };

  const uploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image too large (max 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setEditing({ ...editing, image_url: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-heading font-bold text-xl text-[#0F172A]">Product Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowCsv(true); setCsvResult(null); setCsvFile(null); }} data-testid="bulk-import-btn">
            <Upload className="w-4 h-4 mr-1" /> Bulk Import CSV
          </Button>
          <Button className="btn-amber font-heading font-bold uppercase tracking-wider" onClick={openNew} data-testid="add-product-btn">
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`admin-product-${p.id}`}>
            <div className="aspect-video bg-slate-100 relative">
              {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
              <div className="absolute top-2 left-2 bg-[#0F172A] text-white text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded">
                {p.category}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-heading font-bold text-[#0F172A]">{p.title}</h3>
              <div className="text-xs text-slate-500">Unit: {p.unit}</div>
              <div className="mt-2 text-xs space-y-1">
                {p.brands.map((b) => (
                  <div key={b.id} className="flex justify-between border-b py-1">
                    <span className="font-semibold">{b.name}</span>
                    <span className="font-mono-price text-[#B45309]">{formatINR(b.price)} / {b.stock}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)} data-testid={`edit-product-${p.id}`}>
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => del(p.id)} data-testid={`delete-product-${p.id}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} data-testid="product-form-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger data-testid="product-form-category"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={editing.unit} onValueChange={(v) => setEditing({ ...editing, unit: v })}>
                    <SelectTrigger data-testid="product-form-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} data-testid="product-form-desc" />
              </div>
              <div>
                <Label>Product Photo</Label>
                <Input type="file" accept="image/*" onChange={uploadImage} data-testid="product-form-image" />
                {editing.image_url && (
                  <img src={editing.image_url} alt="preview" className="mt-2 w-32 h-24 object-cover rounded border" />
                )}
                <Input className="mt-2" placeholder="Or paste image URL" value={typeof editing.image_url === "string" && editing.image_url.startsWith("http") ? editing.image_url : ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Brands & Pricing *</Label>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, brands: [...editing.brands, { name: "", price: 0, stock: 0 }] })} data-testid="add-brand-btn">
                    <Plus className="w-3 h-3 mr-1" /> Add Brand
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.brands.map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded" data-testid={`brand-row-${i}`}>
                      <Input className="col-span-5" placeholder="Brand name" value={b.name} onChange={(e) => {
                        const brands = [...editing.brands]; brands[i].name = e.target.value; setEditing({ ...editing, brands });
                      }} data-testid={`brand-name-${i}`} />
                      <Input className="col-span-3" type="number" placeholder="Price" value={b.price} onChange={(e) => {
                        const brands = [...editing.brands]; brands[i].price = e.target.value; setEditing({ ...editing, brands });
                      }} data-testid={`brand-price-${i}`} />
                      <Input className="col-span-3" type="number" placeholder="Stock" value={b.stock} onChange={(e) => {
                        const brands = [...editing.brands]; brands[i].stock = e.target.value; setEditing({ ...editing, brands });
                      }} data-testid={`brand-stock-${i}`} />
                      <button className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded" onClick={() => {
                        const brands = editing.brands.filter((_, idx) => idx !== i); setEditing({ ...editing, brands });
                      }} data-testid={`remove-brand-${i}`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="btn-amber flex-1 font-heading font-bold uppercase" onClick={save} data-testid="save-product-btn">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCsv} onOpenChange={setShowCsv}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Products (CSV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-md p-3 text-xs text-[#92400E]">
              <p className="font-semibold mb-1">CSV Columns:</p>
              <p className="font-mono">title, category, unit, description, image_url, brand_name, brand_price, brand_stock</p>
              <p className="mt-2">Use multiple rows with the same <b>title</b> to add multiple brands to one product. Existing products (matched by title) will have their brands upserted.</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              data-testid="download-csv-template"
              className="w-full"
            >
              <FileDown className="w-4 h-4 mr-2" /> Download Template
            </Button>

            <div>
              <Label>Select CSV file</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                data-testid="csv-file-input"
              />
            </div>

            {csvResult && (
              <div className="bg-slate-50 rounded p-3 text-xs" data-testid="csv-result">
                <p><b>Created:</b> {csvResult.created}</p>
                <p><b>Updated:</b> {csvResult.updated}</p>
                <p><b>Total rows read:</b> {csvResult.total_rows}</p>
                {csvResult.errors?.length > 0 && (
                  <>
                    <p className="mt-2 text-red-600 font-semibold">Errors ({csvResult.errors.length}):</p>
                    <ul className="list-disc list-inside text-red-600 max-h-32 overflow-y-auto">
                      {csvResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCsv(false)}>Close</Button>
              <Button
                className="btn-amber flex-1 font-heading font-bold uppercase"
                onClick={uploadCsv}
                disabled={csvUploading || !csvFile}
                data-testid="csv-upload-btn"
              >
                {csvUploading ? "Uploading..." : "Upload & Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------- UPI Tab -------
function UpiTab() {
  const [upis, setUpis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ upi_id: "", holder_name: "", limit_2day: 300000, enabled: true });

  const load = () => api.get("/admin/upi/usage").then((r) => setUpis(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.upi_id) { toast.error("UPI ID required"); return; }
    try {
      await api.post("/admin/upi", form);
      toast.success("UPI added");
      setShowForm(false);
      setForm({ upi_id: "", holder_name: "", limit_2day: 300000, enabled: true });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this UPI?")) return;
    await api.delete(`/admin/upi/${id}`);
    load();
  };

  const setManualActive = async (id) => {
    await api.patch(`/admin/upi/${id}`, { manual_active: true });
    toast.success("Manual override set");
    load();
  };

  const toggleEnabled = async (u) => {
    await api.patch(`/admin/upi/${u.id}`, { enabled: !u.enabled });
    load();
  };

  const clearManual = async (id) => {
    await api.patch(`/admin/upi/${id}`, { manual_active: false });
    toast.success("Rotation restored to auto");
    load();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="font-heading font-bold text-xl text-[#0F172A]">UPI Rotation Manager</h2>
          <p className="text-xs text-slate-500 mt-1">Auto-switches to next UPI when 2-day usage hits ₹3L limit</p>
        </div>
        <Button className="btn-amber font-heading font-bold uppercase" onClick={() => setShowForm(true)} data-testid="add-upi-btn">
          <Plus className="w-4 h-4 mr-1" /> Add UPI
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upis.map((u) => {
          const pct = Math.min(100, (u.usage_2day / u.limit_2day) * 100);
          return (
            <div key={u.id} className="bg-white border border-slate-200 rounded-lg p-5" data-testid={`upi-card-${u.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono-price font-bold text-[#0F172A] text-lg">{u.upi_id}</div>
                  <div className="text-sm text-slate-500">{u.holder_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  {u.manual_active && (
                    <span className="text-[10px] bg-[#E0F2FE] text-[#0369A1] px-2 py-0.5 rounded font-bold uppercase">Manual Active</span>
                  )}
                  <Switch checked={u.enabled} onCheckedChange={() => toggleEnabled(u)} data-testid={`upi-toggle-${u.id}`} />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 uppercase tracking-widest font-bold">2-Day Usage</span>
                  <span className="font-mono-price font-bold">{formatINR(u.usage_2day)} / {formatINR(u.limit_2day)}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${pct > 85 ? "bg-red-500" : "bg-[#D97706]"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {!u.manual_active ? (
                  <Button size="sm" variant="outline" onClick={() => setManualActive(u.id)} data-testid={`upi-set-active-${u.id}`}>Force Active</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => clearManual(u.id)} data-testid={`upi-clear-manual-${u.id}`}>Auto Rotate</Button>
                )}
                <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => del(u.id)} data-testid={`upi-delete-${u.id}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add UPI Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>UPI ID *</Label>
              <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="example@ybl" data-testid="upi-form-id" />
            </div>
            <div>
              <Label>Account Holder Name</Label>
              <Input value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} data-testid="upi-form-holder" />
            </div>
            <div>
              <Label>2-Day Limit (₹)</Label>
              <Input type="number" value={form.limit_2day} onChange={(e) => setForm({ ...form, limit_2day: Number(e.target.value) })} data-testid="upi-form-limit" />
            </div>
            <Button className="btn-amber w-full font-heading font-bold uppercase" onClick={save} data-testid="save-upi-btn">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------- Orders Tab -------
const ORDER_STATUSES = ["Pending", "Paid", "Confirmed", "Delivered", "Cancelled"];

function OrdersTab({ onChange }) {
  const [orders, setOrders] = useState([]);
  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/orders/${id}`, { status });
    toast.success(`Marked as ${status}`);
    load();
    onChange?.();
  };

  const contactWhatsApp = (o) => {
    const text = `Hi ${o.customer_name}, regarding your order #${o.id.slice(0, 8).toUpperCase()}`;
    window.open(`https://wa.me/91${o.customer_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-[#0F172A] mb-4">Orders Log</h2>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-slate-500 text-sm">No orders yet.</div>}
        {orders.map((o) => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`order-${o.id}`}>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-price font-bold text-[#0F172A]">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`badge-stock ${o.status === "Delivered" ? "badge-in-stock" : o.status === "Cancelled" ? "badge-out-stock" : "badge-low-stock"}`}>
                    {o.status}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-2 font-semibold text-[#0F172A]">{o.customer_name} · {o.customer_phone}</div>
                <div className="text-xs text-slate-500">{o.delivery_address}</div>
                <div className="mt-2 text-xs space-y-0.5">
                  {o.items.map((it, idx) => (
                    <div key={idx}>• {it.product_title} ({it.brand_name}) — {it.quantity} {it.unit} @ {formatINR(it.unit_price)}</div>
                  ))}
                </div>
              </div>
              <div className="text-right sm:min-w-[180px]">
                <div className="font-mono-price font-bold text-[#B45309] text-xl">{formatINR(o.total_amount)}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">UPI: {o.assigned_upi_id || "—"}</div>
                <div className="mt-2 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => contactWhatsApp(o)} className="text-[#15803D] border-[#DCFCE7]" data-testid={`order-whatsapp-${o.id}`}>
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs" data-testid={`order-status-${o.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------- Meetings Tab -------
const MEETING_STATUSES = ["New", "Scheduled", "Completed", "Cancelled"];

function MeetingsTab({ onChange }) {
  const [meetings, setMeetings] = useState([]);
  const load = () => api.get("/admin/meetings").then((r) => setMeetings(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/meetings/${id}`, { status });
    toast.success(`Marked as ${status}`);
    load();
    onChange?.();
  };

  const contactWhatsApp = (m) => {
    const text = `Hi ${m.full_name}, regarding your site visit request at ${m.site_location}`;
    window.open(`https://wa.me/91${m.mobile.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-[#0F172A] mb-4">Meeting Requests</h2>
      <div className="space-y-3">
        {meetings.length === 0 && <div className="text-slate-500 text-sm">No meeting requests yet.</div>}
        {meetings.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`meeting-${m.id}`}>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#0F172A]">{m.full_name}</span>
                  <span className={`badge-stock ${m.status === "Completed" ? "badge-in-stock" : m.status === "Cancelled" ? "badge-out-stock" : "badge-low-stock"}`}>
                    {m.status}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString("en-IN")}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1">📱 {m.mobile} · 📍 {m.site_location}</div>
                {m.materials_required && <div className="text-xs text-slate-500 mt-1">Materials: {m.materials_required}</div>}
                {m.preferred_datetime && <div className="text-xs text-slate-500">Preferred: {m.preferred_datetime}</div>}
                {m.notes && <div className="text-xs text-slate-500 mt-1">Notes: {m.notes}</div>}
              </div>
              <div className="flex gap-2 items-start">
                <Button size="sm" variant="outline" onClick={() => contactWhatsApp(m)} className="text-[#15803D] border-[#DCFCE7]" data-testid={`meeting-whatsapp-${m.id}`}>
                  <MessageCircle className="w-3 h-3" />
                </Button>
                <Select value={m.status} onValueChange={(v) => updateStatus(m.id, v)}>
                  <SelectTrigger className="h-8 w-32 text-xs" data-testid={`meeting-status-${m.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{MEETING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
