import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Wallet,
  ShoppingBag,
  Tag,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  X,
  MessageCircle,
  IndianRupee,
  Upload,
  FileDown,
  Truck,
  CheckCircle2,
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

const UNITS = ["Bag (50 Kg)", "Ton", "KG", "Bundle", "Piece"];
const CALC_TYPES = [
  { value: "disabled", label: "Disabled" },
  { value: "per_bag", label: "Per Bag" },
  { value: "per_ton", label: "Per Ton" },
  { value: "per_piece", label: "Per Piece" },
  { value: "fixed", label: "Fixed / Order" },
];

const TABS = [
  { key: "overview", label: "Overview", icon: Wallet },
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "upi", label: "UPI Accounts", icon: IndianRupee },
  { key: "orders", label: "Orders", icon: ShoppingBag },
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
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" data-testid="admin-tabs">
          {TABS.map((tt) => (
            <button
              key={tt.key}
              onClick={() => setTab(tt.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-heading font-bold text-sm uppercase tracking-wider whitespace-nowrap transition ${
                tab === tt.key ? "bg-[#0F172A] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-[#D97706]"
              }`}
              data-testid={`tab-${tt.key}`}
            >
              <tt.icon className="w-4 h-4" /> {tt.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview stats={stats} />}
        {tab === "products" && <ProductsTab onChange={loadStats} />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "upi" && <UpiTab />}
        {tab === "orders" && <OrdersTab onChange={loadStats} />}
      </div>
    </div>
  );
}

function Overview({ stats }) {
  if (!stats) return <div className="text-slate-500">Loading...</div>;
  const cards = [
    { label: "Total Products", value: stats.products, sub: "Active in catalog" },
    { label: "Revenue (30d)", value: formatINR(stats.revenue_30day), sub: "Last 30 days" },
    { label: "Advance (30d)", value: formatINR(stats.advance_30day), sub: "Last 30 days" },
    { label: "Total Orders", value: stats.orders, sub: `${stats.pending_orders} pending` },
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

// ------- Categories Tab -------
function emptyCategory() {
  return {
    name: "",
    sort_order: 10,
    hamali_default: { enabled: false, calc_type: "disabled", rate: 0, label: "Loading + unloading" },
  };
}

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/admin/categories").then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(emptyCategory()); setShowForm(true); };
  const openEdit = (c) => { setEditing(JSON.parse(JSON.stringify(c))); setShowForm(true); };

  const save = async () => {
    if (!editing.name.trim()) { toast.error("Name required"); return; }
    try {
      const body = {
        name: editing.name.trim(),
        sort_order: Number(editing.sort_order) || 0,
        hamali_default: {
          ...editing.hamali_default,
          enabled: editing.hamali_default.calc_type !== "disabled",
          rate: Number(editing.hamali_default.rate) || 0,
        },
      };
      if (editing.id) await api.patch(`/admin/categories/${editing.id}`, body);
      else await api.post("/admin/categories", body);
      toast.success("Saved");
      setShowForm(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this category?")) return;
    await api.delete(`/admin/categories/${id}`);
    toast.success("Deleted");
    load();
  };

  const setEditingH = (patch) => setEditing({ ...editing, hamali_default: { ...editing.hamali_default, ...patch } });

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="font-heading font-bold text-xl text-[#0F172A]">Categories & Hamali Defaults</h2>
          <p className="text-xs text-slate-500 mt-1">Default hamali per category is applied to products unless the product overrides it.</p>
        </div>
        <Button className="btn-amber font-heading font-bold uppercase" onClick={openNew} data-testid="add-category-btn">
          <Plus className="w-4 h-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`category-card-${c.id}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-heading font-bold text-[#0F172A]">{c.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Sort: {c.sort_order} · {c.is_active ? "Active" : "Inactive"}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)} data-testid={`edit-category-${c.id}`}><Edit3 className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => del(c.id)} data-testid={`delete-category-${c.id}`}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
            <div className="mt-3 border-t pt-2 text-xs">
              {c.hamali_default?.enabled ? (
                <div className="flex items-center gap-2 text-[#B45309]">
                  <Truck className="w-3 h-3" />
                  <span className="font-semibold">Hamali:</span>
                  <span>{c.hamali_default.calc_type} · {formatINR(c.hamali_default.rate)}</span>
                </div>
              ) : (
                <div className="text-slate-400">No hamali</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="category-form-name" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} data-testid="category-form-sort" />
              </div>
              <div className="border-t pt-3">
                <Label>Default Hamali</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Select value={editing.hamali_default.calc_type} onValueChange={(v) => setEditingH({ calc_type: v, enabled: v !== "disabled" })}>
                    <SelectTrigger data-testid="category-form-hamali-calc"><SelectValue /></SelectTrigger>
                    <SelectContent>{CALC_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Rate ₹" value={editing.hamali_default.rate} onChange={(e) => setEditingH({ rate: e.target.value })} disabled={editing.hamali_default.calc_type === "disabled"} data-testid="category-form-hamali-rate" />
                </div>
                <Input className="mt-2" placeholder="Label (e.g. Loading + unloading)" value={editing.hamali_default.label} onChange={(e) => setEditingH({ label: e.target.value })} disabled={editing.hamali_default.calc_type === "disabled"} data-testid="category-form-hamali-label" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="btn-amber flex-1 font-heading font-bold uppercase" onClick={save} data-testid="save-category-btn">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------- Products Tab -------
function emptyProduct() {
  return {
    title: "",
    category: "",
    unit: UNITS[0],
    description: "",
    image_url: "",
    hsn_code: "",
    gst_rate: 0,
    brands: [{ name: "", price: 0, stock: 0 }],
    hamali: null,
  };
}

function ProductsTab({ onChange }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hamaliOverride, setHamaliOverride] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);

  const load = () => api.get("/admin/products").then((r) => setProducts(r.data));
  const loadCats = () => api.get("/admin/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); loadCats(); }, []);

  const openNew = () => {
    const first = categories[0]?.name || "";
    setEditing({ ...emptyProduct(), category: first });
    setHamaliOverride(false);
    setShowForm(true);
  };
  const openEdit = (p) => {
    const copy = JSON.parse(JSON.stringify(p));
    setEditing(copy);
    setHamaliOverride(!!(copy.hamali && copy.hamali.enabled));
    setShowForm(true);
  };

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
      const body = {
        ...editing,
        gst_rate: Number(editing.gst_rate) || 0,
        brands: cleanBrands.map((b) => ({ id: b.id, name: b.name, price: Number(b.price), stock: Number(b.stock) })),
        hamali: hamaliOverride ? {
          ...editing.hamali,
          enabled: (editing.hamali?.calc_type || "disabled") !== "disabled",
          rate: Number(editing.hamali?.rate) || 0,
        } : null,
      };
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

  const setEditingH = (patch) => setEditing({
    ...editing,
    hamali: { ...(editing.hamali || { enabled: false, calc_type: "disabled", rate: 0, label: "Loading + unloading" }), ...patch },
  });

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
              <div className="text-xs text-slate-500">Unit: {p.unit} · HSN: {p.hsn_code || "—"} · GST: {p.gst_rate}%</div>
              {p.hamali?.enabled && (
                <div className="text-[10px] text-[#B45309] font-semibold mt-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Hamali: {p.hamali.calc_type} · {formatINR(p.hamali.rate)}
                </div>
              )}
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
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} data-testid="product-form-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger data-testid="product-form-category"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>HSN Code</Label>
                  <Input value={editing.hsn_code} onChange={(e) => setEditing({ ...editing, hsn_code: e.target.value })} data-testid="product-form-hsn" />
                </div>
                <div>
                  <Label>GST Rate (%)</Label>
                  <Input type="number" value={editing.gst_rate} onChange={(e) => setEditing({ ...editing, gst_rate: e.target.value })} data-testid="product-form-gst" />
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

              {/* Hamali override */}
              <div className="border rounded p-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Override Hamali (per product)</Label>
                    <p className="text-[10px] text-slate-500 mt-0.5">Off = inherit from category default</p>
                  </div>
                  <Switch checked={hamaliOverride} onCheckedChange={setHamaliOverride} data-testid="product-hamali-override" />
                </div>
                {hamaliOverride && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Select value={editing.hamali?.calc_type || "disabled"} onValueChange={(v) => setEditingH({ calc_type: v })}>
                      <SelectTrigger data-testid="product-hamali-calc"><SelectValue /></SelectTrigger>
                      <SelectContent>{CALC_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Rate ₹" value={editing.hamali?.rate ?? 0} onChange={(e) => setEditingH({ rate: e.target.value })} data-testid="product-hamali-rate" />
                  </div>
                )}
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
              <p className="font-mono text-[10px]">title, category, unit, description, image_url, hsn_code, gst_rate, brand_name, brand_price, brand_stock, hamali_calc_type, hamali_rate, hamali_label</p>
              <p className="mt-2">Use multiple rows with the same <b>title</b> to add multiple brands. Existing products are upserted by title.</p>
            </div>

            <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="download-csv-template" className="w-full">
              <FileDown className="w-4 h-4 mr-2" /> Download Template
            </Button>

            <div>
              <Label>Select CSV file</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} data-testid="csv-file-input" />
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
              <Button className="btn-amber flex-1 font-heading font-bold uppercase" onClick={uploadCsv} disabled={csvUploading || !csvFile} data-testid="csv-upload-btn">
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
          <p className="text-xs text-slate-500 mt-1">Auto-switches to next UPI when 2-day advance receipts hit the limit</p>
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
                  <span className="text-slate-500 uppercase tracking-widest font-bold">2-Day Advance</span>
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
const ORDER_STATUSES = ["PendingVerification", "AdvanceReceived", "ReadyForPickup", "Completed", "Cancelled"];
const STATUS_CLS = {
  PendingVerification: "badge-low-stock",
  AdvanceReceived: "badge-in-stock",
  ReadyForPickup: "badge-in-stock",
  Completed: "badge-in-stock",
  Cancelled: "badge-out-stock",
};

function OrdersTab({ onChange }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [utrInputs, setUtrInputs] = useState({});
  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/orders/${id}`, { status });
    toast.success(`Marked as ${status}`);
    load();
    onChange?.();
  };

  const markVerified = async (id, utr) => {
    await api.patch(`/admin/orders/${id}`, { verified: true, utr_ref: utr || "" });
    toast.success("Payment verified");
    load();
    onChange?.();
  };

  const contactWhatsApp = (o) => {
    const text = `Hi ${o.customer_name}, regarding your order ${o.order_code}`;
    window.open(`https://wa.me/91${o.customer_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-heading font-bold text-xl text-[#0F172A]">Orders Log</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52" data-testid="orders-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-slate-500 text-sm">No orders yet.</div>}
        {filtered.map((o) => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`order-${o.id}`}>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-price font-bold text-[#0F172A]">{o.order_code}</span>
                  <span className={`badge-stock ${STATUS_CLS[o.status] || "badge-low-stock"}`} data-testid={`order-status-badge-${o.id}`}>{o.status}</span>
                  {o.payment?.verified && (
                    <span className="text-[10px] bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-2 font-semibold text-[#0F172A]">{o.customer_name} · {o.customer_phone}</div>
                <div className="mt-2 text-xs space-y-0.5">
                  {o.items.map((it, idx) => (
                    <div key={idx}>• {it.product_title} ({it.brand_name}) — {it.quantity} {it.unit} @ {formatINR(it.unit_price)}{it.hamali_amount > 0 ? ` + Hamali ${formatINR(it.hamali_amount)}` : ""}</div>
                  ))}
                </div>
                {o.notes && <div className="text-xs text-slate-500 mt-2">Notes: {o.notes}</div>}
              </div>
              <div className="text-right sm:min-w-[220px]">
                <div className="font-mono-price font-bold text-[#B45309] text-xl">{formatINR(o.total_amount)}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Adv {o.advance_percent}%: {formatINR(o.advance_amount)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Bal: {formatINR(o.balance_amount)}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">UPI: {o.assigned_upi_id || "—"}</div>
                <div className="mt-2 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => contactWhatsApp(o)} className="text-[#15803D] border-[#DCFCE7]" data-testid={`order-whatsapp-${o.id}`}>
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs" data-testid={`order-status-${o.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {!o.payment?.verified && (
                  <div className="mt-2 flex gap-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="UTR ref (optional)"
                      value={utrInputs[o.id] ?? o.payment?.utr_ref ?? ""}
                      onChange={(e) => setUtrInputs({ ...utrInputs, [o.id]: e.target.value })}
                      data-testid={`utr-input-${o.id}`}
                    />
                    <Button size="sm" className="btn-amber h-8 text-xs px-2 whitespace-nowrap" onClick={() => markVerified(o.id, utrInputs[o.id] ?? "")} data-testid={`verify-btn-${o.id}`}>
                      Verify
                    </Button>
                  </div>
                )}
                {o.payment?.utr_ref && <div className="text-[10px] text-slate-400 mt-1">UTR: {o.payment.utr_ref}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
