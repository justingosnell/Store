import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BadgePercent,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  Home,
  Image,
  Megaphone,
  PackagePlus,
  Pencil,
  Search,
  SearchCheck,
  SlidersHorizontal,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserCircle,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/lib/api";
import { MediaLibraryPanel } from "@/components/MediaLibraryPanel";
import type { InsertProduct, Media, Product } from "@shared/schema";

type AdminSection = "home" | "orders" | "products" | "customers" | "analytics" | "marketing" | "discounts";

type GoogleSearchConsoleStatus = {
  configured: boolean;
  connected: boolean;
};

type GoogleSearchConsoleProperty = {
  siteUrl: string;
  permissionLevel: string;
};

type GoogleSearchConsoleMetrics = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
};

const emptyForm: InsertProduct = {
  title: "",
  category: "Toys",
  description: "",
  price: "",
  compareAtPrice: "",
  inventory: 0,
  status: "active",
  imageUrl: "",
  ageRange: "",
  material: "",
  tags: "",
  sku: "",
  featured: "false",
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
};

function money(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numeric);
}

function resolveMediaUrl(url: string) {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return getApiUrl(url);
}

function productToForm(product: Product): InsertProduct {
  return {
    title: product.title,
    handle: product.handle,
    category: product.category,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    inventory: product.inventory,
    status: product.status as "active" | "draft" | "archived",
    imageUrl: product.imageUrl,
    ageRange: product.ageRange,
    material: product.material,
    tags: product.tags,
    sku: product.sku,
    featured: product.featured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    focusKeyword: product.focusKeyword,
  };
}

type SeoCheck = {
  label: string;
  detail: string;
  status: "good" | "ok" | "bad";
};

type AdminOrder = {
  id: string;
  date: string;
  customer: string;
  email: string;
  phone: string;
  payment: string;
  fulfillment: string;
  total: string;
  subtotal: string;
  shipping: string;
  tax: string;
  shippingAddress: string;
  billingAddress: string;
  deliveryMethod: string;
  trackingNumber?: string;
  notes: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: string;
  }>;
};

function getSeoTitle(form: InsertProduct) {
  return form.seoTitle?.trim() || form.title || "Product title";
}

function getSeoDescription(form: InsertProduct) {
  return form.seoDescription?.trim() || form.description || "Add a concise product description for search results.";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trimToLength(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).replace(/\s+\S*$/, "").replace(/[.,;:]+$/, "")}.`;
}

function getSuggestedFocusKeyword(form: InsertProduct) {
  const existing = form.focusKeyword?.trim();
  if (existing) return existing;

  const title = form.title?.trim();
  if (title) return title.toLowerCase();

  return `${form.category || "baby"} gifts`.toLowerCase();
}

function generateSeoFields(form: InsertProduct) {
  const title = form.title?.trim() || `${form.category || "Baby"} Gift`;
  const category = form.category || "Baby Gifts";
  const keyword = getSuggestedFocusKeyword(form);
  const age = form.ageRange?.trim();
  const material = form.material?.trim();
  const tags = form.tags?.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 2);
  const detailBits = [material, age ? `made for ${age}` : "", tags?.length ? `great for ${tags.join(" and ")}` : ""].filter(Boolean);

  const rawTitle = `${title} | ${category} at Tiny Treasures`;
  const seoTitle = trimToLength(rawTitle.length < 35 ? `${title} | Thoughtful Baby Gifts` : rawTitle, 60);
  const descriptionSeed = form.description?.trim()
    ? form.description.trim()
    : `${title} is a thoughtful ${category.toLowerCase()} pick for little ones.`;
  const detailText = detailBits.length ? ` ${detailBits.join(", ")}.` : "";
  const rawDescription = `${title} from Tiny Treasures is a sweet choice for baby showers, newborn gifts, and everyday care.${detailText} ${descriptionSeed}`;

  return {
    focusKeyword: keyword,
    seoTitle,
    seoDescription: trimToLength(rawDescription, 155),
    handle: slugify(keyword || title),
  };
}

function getSeoScore(form: InsertProduct): { checks: SeoCheck[]; score: number; status: "Good" | "Needs work" | "Poor" } {
  const keyword = form.focusKeyword?.trim().toLowerCase() || "";
  const title = getSeoTitle(form);
  const description = getSeoDescription(form);
  const handle = form.handle?.trim() || slugify(form.title || "") || "";
  const body = `${form.title} ${form.description} ${form.category} ${form.tags}`.toLowerCase();

  const checks: SeoCheck[] = [
    {
      label: "Focus keyphrase",
      detail: keyword ? `"${form.focusKeyword}" is set` : "Add a focus keyphrase for this product",
      status: keyword ? "good" : "bad",
    },
    {
      label: "SEO title length",
      detail: `${title.length} characters. Aim for 35-60.`,
      status: title.length >= 35 && title.length <= 60 ? "good" : title.length >= 20 && title.length <= 70 ? "ok" : "bad",
    },
    {
      label: "Meta description length",
      detail: `${description.length} characters. Aim for 120-155.`,
      status: description.length >= 120 && description.length <= 155 ? "good" : description.length >= 80 && description.length <= 170 ? "ok" : "bad",
    },
    {
      label: "Keyphrase in title",
      detail: keyword && title.toLowerCase().includes(keyword) ? "Keyphrase appears in the SEO title" : "Use the focus keyphrase in the SEO title",
      status: keyword && title.toLowerCase().includes(keyword) ? "good" : "bad",
    },
    {
      label: "Keyphrase in description",
      detail: keyword && description.toLowerCase().includes(keyword) ? "Keyphrase appears in the meta description" : "Use the focus keyphrase in the meta description",
      status: keyword && description.toLowerCase().includes(keyword) ? "good" : "bad",
    },
    {
      label: "Keyphrase in slug",
      detail: keyword && handle.includes(keyword.replace(/\s+/g, "-")) ? "Slug includes the keyphrase" : "Include the keyphrase in the URL handle when natural",
      status: keyword && handle.includes(keyword.replace(/\s+/g, "-")) ? "good" : handle.length > 0 ? "ok" : "bad",
    },
    {
      label: "Product content",
      detail: `${form.description?.trim().length || 0} description characters. Add helpful details for shoppers.`,
      status: (form.description?.trim().length || 0) >= 160 ? "good" : (form.description?.trim().length || 0) >= 80 ? "ok" : "bad",
    },
    {
      label: "Image readiness",
      detail: form.imageUrl ? "Product image URL is set" : "Add a product image URL for richer search and sharing previews",
      status: form.imageUrl ? "good" : "ok",
    },
  ];

  const points = checks.reduce((sum, check) => sum + (check.status === "good" ? 2 : check.status === "ok" ? 1 : 0), 0);
  const score = Math.round((points / (checks.length * 2)) * 100);
  const status = score >= 75 ? "Good" : score >= 45 ? "Needs work" : "Poor";

  return { checks, score, status };
}

export default function Admin() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [activeSection, setActiveSection] = useState<AdminSection>("products");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<InsertProduct>(emptyForm);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/products"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus = status === "all" || product.status === status;
      const matchesQuery = !term || [product.title, product.category, product.sku, product.tags].join(" ").toLowerCase().includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [products, query, status]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === "active").length;
    const inventory = products.reduce((sum, product) => sum + (product.inventory || 0), 0);
    const value = products.reduce((sum, product) => sum + Number(product.price || 0) * (product.inventory || 0), 0);
    const seoReady = products.filter((product) => getSeoScore(productToForm(product)).score >= 75).length;
    const lowInventory = products.filter((product) => product.inventory <= 5).length;
    return { active, inventory, value, seoReady, lowInventory };
  }, [products]);

  const newOrderNotifications = 0;
  const notificationCount = stats.lowInventory + newOrderNotifications;

  const adminNav = [
    { id: "home", label: "Home", icon: Home },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "products", label: "Products", icon: Boxes },
    { id: "customers", label: "Customers", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "marketing", label: "Marketing", icon: Megaphone },
    { id: "discounts", label: "Discounts", icon: BadgePercent },
  ] satisfies Array<{ id: AdminSection; label: string; icon: typeof Home }>;

  const sectionTabs = [
    { id: "products", label: "All Products" },
    { id: "orders", label: "Open" },
    { id: "analytics", label: "Low Stock" },
    { id: "marketing", label: "Featured" },
    { id: "discounts", label: "SEO Ready" },
    { id: "customers", label: "Customers" },
  ] satisfies Array<{ id: AdminSection; label: string }>;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingProduct ? getApiUrl(`/api/products/${editingProduct.id}`) : getApiUrl("/api/products");
      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          inventory: Number(form.inventory || 0),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Saved", description: editingProduct ? "Product updated" : "Product created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save product", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(getApiUrl(`/api/products/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Deleted", description: "Product removed from the store" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete product", description: error.message, variant: "destructive" });
    },
  });

  const productImageUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(getApiUrl("/api/media"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Image upload failed");
      }

      return response.json() as Promise<Media>;
    },
    onSuccess: (media) => {
      updateForm("imageUrl", resolveMediaUrl(media.url));
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Image uploaded", description: "The image was applied to this product." });
      if (productImageInputRef.current) {
        productImageInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setForm(productToForm(product));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof InsertProduct>(key: K, value: InsertProduct[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleProductImageSelect(media: Media) {
    updateForm("imageUrl", resolveMediaUrl(media.url));
    setMediaLibraryOpen(false);
  }

  function handleProductImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    productImageUploadMutation.mutate(file);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    saveMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-[#f3f5f7] p-3 text-[#2f3135] sm:p-5">
      <header className="mb-5 rounded-lg border border-[#d5dadd] bg-white shadow-sm">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#008060] text-white">
              <Store className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-black">Tiny Treasures Admin Panel</h1>
              <p className="text-xs text-[#8b8e92]">Signed in as {user?.username}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#7d8185]">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Storefront">
                <Store className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-[#ff4f6d]"
              title={`${notificationCount} notifications: ${newOrderNotifications} new orders, ${stats.lowInventory} low inventory`}
            >
              <Bell className="h-4 w-4 fill-current" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#d72c0d] px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 overflow-hidden rounded-full border border-[#d5dadd] bg-white" onClick={logout} title="Logout">
              <UserCircle className="h-7 w-7 text-[#123a5a]" />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="rounded-lg bg-[#123a5a] p-6 shadow-sm lg:min-h-[calc(100vh-136px)]">
          <nav className="grid gap-3">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex h-12 items-center gap-4 rounded-md px-4 text-left text-[15px] font-semibold transition ${
                    active ? "bg-white text-[#123a5a] shadow-sm" : "text-white/90 hover:bg-white/10"
                  }`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-[#008060]" : "text-[#b8d0dd]"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 pb-8">
          <section className="relative mb-8 overflow-hidden rounded-lg bg-[#f3f5f7] px-1 py-5">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/3 text-[#123a5a] opacity-20 md:block">
              <ShoppingBag className="absolute left-[8%] top-24 h-10 w-10 rotate-[-18deg]" />
              <Boxes className="absolute left-[28%] top-10 h-7 w-7 rotate-[14deg]" />
              <BadgePercent className="absolute left-[38%] top-28 h-8 w-8 rotate-[12deg]" />
              <PackagePlus className="absolute left-[53%] top-16 h-11 w-11 rotate-[-10deg]" />
              <ClipboardList className="absolute left-[70%] top-28 h-7 w-7 rotate-[8deg]" />
              <SearchCheck className="absolute right-[6%] top-12 h-8 w-8 rotate-[-16deg]" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl font-black tracking-normal text-[#34363a] md:text-5xl">Hi, Welcome !</h2>
              <p className="mt-2 text-xl text-[#8f9296]">You're off to a great start.</p>
              <div className="relative mt-9 max-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a5a9]" />
                <Input
                  className="h-9 rounded-md border-[#bfc5c8] bg-white pl-9 text-sm shadow-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
          </section>

          <div className="mb-7 overflow-x-auto border-b border-[#cdd2d5]">
            <div className="flex min-w-max gap-8 px-1">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`border-b-2 px-1 pb-4 text-sm font-semibold transition ${
                    activeSection === tab.id ? "border-[#3578ff] text-black" : "border-transparent text-black hover:border-[#9ab9ff]"
                  }`}
                  onClick={() => setActiveSection(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeSection === "products" ? (
            <>
              <section className="mb-6 grid gap-4 md:grid-cols-4">
                <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Active products" value={String(stats.active)} />
                <MetricCard icon={<Boxes className="h-5 w-5" />} label="Units in stock" value={String(stats.inventory)} />
                <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Inventory value" value={money(stats.value)} />
                <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="SEO ready" value={`${stats.seoReady}/${products.length}`} />
              </section>

              <section className="rounded-lg border border-[#cdd2d5] bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-[#dfe3e6] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full max-w-[276px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a5a9]" />
                    <Input
                      className="h-8 rounded-md border-[#c7cccf] bg-white pl-9 text-xs"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#65696d]">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-8 w-36 border-[#bfc5c8] bg-white px-3 text-xs shadow-sm">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Filters</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs font-normal text-[#65696d]">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button className="h-8 bg-[#008060] px-3 text-xs text-white hover:bg-[#006e52]" onClick={openCreateDialog}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Add product
                    </Button>
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      <Button variant="outline" size="icon" className="h-7 w-7 border-[#d8dcdf] bg-white">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>Page</span>
                      <span className="rounded border border-[#d8dcdf] px-2 py-1">1</span>
                      <span>of 1</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 border-[#d8dcdf] bg-white">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                    <thead className="text-[11px] uppercase text-[#34363a]">
                      <tr className="border-b border-[#dfe3e6]">
                        <th className="w-20 border-r border-[#dfe3e6] px-8 py-5">
                          <span className="block h-4 w-4 rounded border border-[#d0d5d8]" />
                        </th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">Product</th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">Status</th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">Inventory</th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">SEO</th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">Category</th>
                        <th className="border-r border-[#dfe3e6] px-6 py-5">Price</th>
                        <th className="px-6 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#686c71]">
                      {isLoading ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={8}>Loading products...</td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={8}>No products found.</td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => (
                          <tr key={product.id} className="border-b border-[#e5e8ea] last:border-b-0">
                            <td className="border-r border-[#e5e8ea] px-8 py-5">
                              <span className="block h-4 w-4 rounded border border-[#d0d5d8]" />
                            </td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5">
                              <button type="button" className="font-semibold text-[#008060]" onClick={() => openEditDialog(product)}>
                                {product.title}
                              </button>
                              <div className="mt-1 text-[11px] text-[#8c9196]">{product.sku || product.handle || product.id}</div>
                            </td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5">
                              <StatusBadge status={product.status} />
                            </td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5">
                              <span className={product.inventory <= 5 ? "font-semibold text-[#b95000]" : "font-semibold text-[#008060]"}>
                                {product.inventory}
                              </span>
                            </td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5">
                              <SeoBadge score={getSeoScore(productToForm(product)).score} />
                            </td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5">{product.category}</td>
                            <td className="border-r border-[#e5e8ea] px-6 py-5 text-[#34363a]">{money(product.price)}</td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-[#34363a]" onClick={() => openEditDialog(product)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-[#ff5d75]" onClick={() => deleteMutation.mutate(product.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <AdminSectionPanel
              activeSection={activeSection}
              stats={stats}
              productCount={products.length}
              onAddProduct={() => {
                setActiveSection("products");
                openCreateDialog();
              }}
            />
          )}
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <Input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
              </Field>
              <Field label="Category">
                <Select value={form.category} onValueChange={(value) => updateForm("category", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toys">Toys</SelectItem>
                    <SelectItem value="Burp Cloths">Burp Cloths</SelectItem>
                    <SelectItem value="Baby Books">Baby Books</SelectItem>
                    <SelectItem value="Gift Sets">Gift Sets</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Price">
                <Input value={form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="24.00" required />
              </Field>
              <Field label="Compare-at price">
                <Input value={form.compareAtPrice} onChange={(event) => updateForm("compareAtPrice", event.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Inventory">
                <Input type="number" value={form.inventory} onChange={(event) => updateForm("inventory", Number(event.target.value))} />
              </Field>
              <Field label="SKU">
                <Input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(value) => updateForm("status", value as InsertProduct["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Featured">
                <Select value={form.featured} onValueChange={(value) => updateForm("featured", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Featured</SelectItem>
                    <SelectItem value="false">Not featured</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Age range">
                <Input value={form.ageRange} onChange={(event) => updateForm("ageRange", event.target.value)} placeholder="Newborn+" />
              </Field>
              <Field label="Material">
                <Input value={form.material} onChange={(event) => updateForm("material", event.target.value)} placeholder="Organic cotton" />
              </Field>
            </div>
            <section className="rounded-lg border border-[#dde0dc] bg-white p-4">
              <div className="mb-3">
                <h3 className="font-black text-[#34363a]">Product description</h3>
                <p className="text-sm text-[#6d7175]">Tell shoppers what makes this item special, safe, and giftable.</p>
              </div>
              <Textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Describe the product, materials, size, age range, care instructions, and what makes it a thoughtful gift."
                rows={5}
              />
            </section>
            <Field label="Tags">
              <Input value={form.tags} onChange={(event) => updateForm("tags", event.target.value)} placeholder="baby shower, newborn, organic" />
            </Field>
            <section className="rounded-lg border border-[#dde0dc] bg-white p-4">
              <div className="mb-4">
                <div>
                  <h3 className="font-black text-[#34363a]">Product image</h3>
                  <p className="text-sm text-[#6d7175]">Upload to Cloudinary or choose an existing image from your media library.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#c9cccf] bg-[#fafbfb]">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt={form.title || "Product image"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-[#6d7175]">
                      <Image className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">No image selected</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    ref={productImageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleProductImageUpload}
                  />
                  <button
                    type="button"
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#008060] bg-[#eef5f9] p-6 text-center transition hover:bg-[#e6eef3] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => productImageInputRef.current?.click()}
                    disabled={productImageUploadMutation.isPending}
                  >
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#008060] text-white">
                      <Upload className="h-6 w-6" />
                    </span>
                    <span className="font-black text-[#123a5a]">
                      {productImageUploadMutation.isPending ? "Uploading image..." : "Upload image"}
                    </span>
                    <span className="mt-1 text-sm text-[#6d7175]">Saves the image to Cloudinary and applies it to this product.</span>
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" className="border-[#b8d0dd] bg-[#eef5f9] font-semibold text-[#123a5a]" onClick={() => setMediaLibraryOpen(true)}>
                      <Image className="mr-2 h-4 w-4" />
                      Choose from library
                    </Button>
                    {form.imageUrl && (
                      <Button type="button" variant="ghost" className="bg-[#fdecea] font-semibold text-[#b42318]" onClick={() => updateForm("imageUrl", "")}>
                        Remove image
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <SeoPanel form={form} onChange={updateForm} />
            <div className="flex justify-end gap-2 border-t border-[#dde0dc] pt-4">
              <Button type="button" variant="outline" className="border-[#b8d0dd] bg-[#eef5f9] font-semibold text-[#123a5a]" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-[#006e52] font-semibold text-white" disabled={saveMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product image library</DialogTitle>
          </DialogHeader>
          <MediaLibraryPanel mode="select" onSelect={handleProductImageSelect} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dde0dc] bg-white p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#eef5f9] text-[#123a5a]">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm text-[#6d7175]">{label}</div>
    </div>
  );
}

function AdminSectionPanel({
  activeSection,
  stats,
  productCount,
  onAddProduct,
}: {
  activeSection: AdminSection;
  stats: { active: number; inventory: number; value: number; seoReady: number };
  productCount: number;
  onAddProduct: () => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const titleMap: Record<AdminSection, string> = {
    home: "Home",
    orders: "Orders",
    products: "Products",
    customers: "Customers",
    analytics: "Analytics",
    marketing: "Marketing",
    discounts: "Discounts",
  };

  if (activeSection === "home") {
    return (
      <section className="rounded-lg border border-[#cdd2d5] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-black text-[#34363a]">Store overview</h3>
            <p className="mt-1 text-sm text-[#8f9296]">Products, inventory, and SEO readiness at a glance.</p>
          </div>
          <Button className="bg-[#008060] text-white hover:bg-[#006e52]" onClick={onAddProduct}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Active products" value={String(stats.active)} />
          <MetricCard icon={<Boxes className="h-5 w-5" />} label="Units in stock" value={String(stats.inventory)} />
          <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Inventory value" value={money(stats.value)} />
          <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="SEO ready" value={`${stats.seoReady}/${productCount}`} />
        </div>
      </section>
    );
  }

  if (activeSection === "orders") {
    const orders: AdminOrder[] = [
      {
        id: "#1007",
        date: "06/18/2026 10:08AM",
        customer: "Avery Johnson",
        email: "avery.johnson@example.com",
        phone: "(555) 014-1007",
        payment: "Paid",
        fulfillment: "Unfulfilled",
        total: "$68.00",
        subtotal: "$62.00",
        shipping: "$0.00",
        tax: "$6.00",
        shippingAddress: "214 Magnolia Lane, Austin, TX 78704",
        billingAddress: "214 Magnolia Lane, Austin, TX 78704",
        deliveryMethod: "Standard shipping",
        notes: "Gift wrap requested. Include the handwritten note from checkout.",
        items: [
          { name: "Little Arrival Gift Box", sku: "GIFT-LITTLE-ARRIVAL", quantity: 1, price: "$68.00" },
        ],
      },
      {
        id: "#1006",
        date: "06/17/2026 02:34PM",
        customer: "Maya Thompson",
        email: "maya.thompson@example.com",
        phone: "(555) 014-1006",
        payment: "Authorized",
        fulfillment: "Partially Fulfilled",
        total: "$124.50",
        subtotal: "$116.00",
        shipping: "$0.00",
        tax: "$8.50",
        shippingAddress: "88 Willow Street, Portland, OR 97205",
        billingAddress: "88 Willow Street, Portland, OR 97205",
        deliveryMethod: "Standard shipping",
        trackingNumber: "TT94001006",
        notes: "One item is packed. Waiting on restock for the blanket.",
        items: [
          { name: "Organic Cotton Swaddle", sku: "SWD-COTTON-SAGE", quantity: 2, price: "$32.00" },
          { name: "Keepsake Rattle", sku: "TOY-RATTLE-WOOD", quantity: 1, price: "$28.00" },
          { name: "Soft Knit Blanket", sku: "BLK-KNIT-CREAM", quantity: 1, price: "$32.00" },
        ],
      },
      {
        id: "#1005",
        date: "06/16/2026 09:41AM",
        customer: "Elliot Brooks",
        email: "elliot.brooks@example.com",
        phone: "(555) 014-1005",
        payment: "Paid",
        fulfillment: "Fulfilled",
        total: "$42.00",
        subtotal: "$38.00",
        shipping: "$0.00",
        tax: "$4.00",
        shippingAddress: "502 Cedar Court, Denver, CO 80203",
        billingAddress: "502 Cedar Court, Denver, CO 80203",
        deliveryMethod: "Standard shipping",
        trackingNumber: "TT94001005",
        notes: "Delivered to front desk.",
        items: [
          { name: "Keepsake Rattle", sku: "TOY-RATTLE-WOOD", quantity: 1, price: "$28.00" },
          { name: "Milestone Card Set", sku: "CARD-MILESTONE", quantity: 1, price: "$14.00" },
        ],
      },
      {
        id: "#1004",
        date: "06/15/2026 04:20PM",
        customer: "Nora Williams",
        email: "nora.williams@example.com",
        phone: "(555) 014-1004",
        payment: "Paid",
        fulfillment: "Unfulfilled",
        total: "$89.99",
        subtotal: "$82.99",
        shipping: "$0.00",
        tax: "$7.00",
        shippingAddress: "19 Rose Avenue, Charlotte, NC 28202",
        billingAddress: "19 Rose Avenue, Charlotte, NC 28202",
        deliveryMethod: "Standard shipping",
        notes: "Customer asked for neutral packaging.",
        items: [
          { name: "Little Arrival Gift Box", sku: "GIFT-LITTLE-ARRIVAL", quantity: 1, price: "$68.00" },
          { name: "Milestone Card Set", sku: "CARD-MILESTONE", quantity: 1, price: "$21.99" },
        ],
      },
    ];

    return (
      <>
        <section className="rounded-lg border border-[#cdd2d5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#dfe3e6] p-4">
            <h3 className="font-black text-[#34363a]">Recent orders</h3>
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-[#65696d]">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[11px] uppercase text-[#34363a]">
                <tr className="border-b border-[#dfe3e6]">
                  <th className="px-6 py-5">Order</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Customer</th>
                  <th className="px-6 py-5">Payment Status</th>
                  <th className="px-6 py-5">Fulfillment Status</th>
                  <th className="px-6 py-5">Total</th>
                </tr>
              </thead>
              <tbody className="text-[#686c71]">
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#e5e8ea] last:border-b-0">
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="font-semibold text-[#008060] underline-offset-4 transition hover:text-[#006e52] hover:underline focus:outline-none focus:ring-2 focus:ring-[#008060] focus:ring-offset-2"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="px-6 py-5">{order.date}</td>
                    <td className="px-6 py-5">{order.customer}</td>
                    <td className={`px-6 py-5 ${order.payment === "Paid" ? "text-[#008060]" : "text-[#b95000]"}`}>{order.payment}</td>
                    <td className={`px-6 py-5 ${order.fulfillment === "Fulfilled" ? "text-[#008060]" : order.fulfillment === "Partially Fulfilled" ? "text-[#b42318]" : "text-[#b95000]"}`}>
                      {order.fulfillment}
                    </td>
                    <td className="px-6 py-5 text-[#34363a]">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle>Order {selectedOrder.id}</DialogTitle>
                  <p className="text-sm text-[#686c71]">
                    Placed {selectedOrder.date} by {selectedOrder.customer}
                  </p>
                </DialogHeader>

                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-[#dfe3e6]">
                      <div className="border-b border-[#dfe3e6] px-4 py-3">
                        <h4 className="font-black text-[#34363a]">Items</h4>
                      </div>
                      <div className="divide-y divide-[#e5e8ea]">
                        {selectedOrder.items.map((item) => (
                          <div key={item.sku} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm">
                            <div>
                              <div className="font-semibold text-[#34363a]">{item.name}</div>
                              <div className="mt-1 text-xs text-[#686c71]">SKU {item.sku}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-[#34363a]">{item.price}</div>
                              <div className="mt-1 text-xs text-[#686c71]">Qty {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Timeline</h4>
                      <div className="mt-4 space-y-3 text-sm text-[#686c71]">
                        <div className="flex gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[#008060]" />
                          <div>
                            <div className="font-semibold text-[#34363a]">Order placed</div>
                            <div>{selectedOrder.date}</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[#b95000]" />
                          <div>
                            <div className="font-semibold text-[#34363a]">{selectedOrder.fulfillment}</div>
                            <div>{selectedOrder.trackingNumber ? `Tracking ${selectedOrder.trackingNumber}` : "No tracking number yet"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Notes</h4>
                      <p className="mt-2 text-sm leading-6 text-[#686c71]">{selectedOrder.notes}</p>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Summary</h4>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4 text-[#686c71]"><span>Subtotal</span><span>{selectedOrder.subtotal}</span></div>
                        <div className="flex justify-between gap-4 text-[#686c71]"><span>Shipping</span><span>{selectedOrder.shipping}</span></div>
                        <div className="flex justify-between gap-4 text-[#686c71]"><span>Tax</span><span>{selectedOrder.tax}</span></div>
                        <div className="flex justify-between gap-4 border-t border-[#dfe3e6] pt-3 font-black text-[#34363a]"><span>Total</span><span>{selectedOrder.total}</span></div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Customer</h4>
                      <div className="mt-3 space-y-1 text-sm text-[#686c71]">
                        <div className="font-semibold text-[#34363a]">{selectedOrder.customer}</div>
                        <div>{selectedOrder.email}</div>
                        <div>{selectedOrder.phone}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Payment</h4>
                      <p className={`mt-2 text-sm font-semibold ${selectedOrder.payment === "Paid" ? "text-[#008060]" : "text-[#b95000]"}`}>{selectedOrder.payment}</p>
                    </div>

                    <div className="rounded-lg border border-[#dfe3e6] p-4">
                      <h4 className="font-black text-[#34363a]">Shipping</h4>
                      <div className="mt-3 space-y-3 text-sm text-[#686c71]">
                        <div>
                          <div className="font-semibold text-[#34363a]">Method</div>
                          <div>{selectedOrder.deliveryMethod}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-[#34363a]">Ship to</div>
                          <div>{selectedOrder.shippingAddress}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-[#34363a]">Bill to</div>
                          <div>{selectedOrder.billingAddress}</div>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (activeSection === "analytics") {
    return <AnalyticsImportPanel />;
  }

  return (
    <section className="rounded-lg border border-[#cdd2d5] bg-white p-8 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h3 className="text-2xl font-black text-[#34363a]">{titleMap[activeSection]}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7c8084]">
            This workspace is ready for the custom ecommerce tools we add next. The sidebar and tab navigation are wired, so each area can grow into its own full CRUD screen.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Products" value={String(productCount)} />
            <MetricCard icon={<Boxes className="h-5 w-5" />} label="Inventory" value={String(stats.inventory)} />
            <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="SEO ready" value={`${stats.seoReady}/${productCount}`} />
          </div>
        </div>
        <div className="rounded-lg border border-[#c9cccf] bg-[#eef5f9] p-5">
          <h4 className="font-black text-[#34363a]">Next action</h4>
          <p className="mt-2 text-sm leading-6 text-[#59605d]">Add or refine product data before connecting customer, order, and promotion workflows.</p>
          <Button className="mt-5 bg-[#008060] text-white hover:bg-[#006e52]" onClick={onAddProduct}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>
    </section>
  );
}

function AnalyticsImportPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSiteUrl, setSelectedSiteUrl] = useState("");

  const statusQuery = useQuery<GoogleSearchConsoleStatus>({
    queryKey: ["google-search-console-status"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/google/search-console/status"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load Google connection status");
      return response.json();
    },
  });

  const propertiesQuery = useQuery<{ properties: GoogleSearchConsoleProperty[] }>({
    queryKey: ["google-search-console-properties"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/google/search-console/properties"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load Search Console properties");
      return response.json();
    },
    enabled: Boolean(statusQuery.data?.connected),
  });

  useEffect(() => {
    if (!selectedSiteUrl && propertiesQuery.data?.properties?.length) {
      setSelectedSiteUrl(propertiesQuery.data.properties[0].siteUrl);
    }
  }, [propertiesQuery.data?.properties, selectedSiteUrl]);

  const metricsQuery = useQuery<GoogleSearchConsoleMetrics>({
    queryKey: ["google-search-console-metrics", selectedSiteUrl],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/google/search-console/metrics?siteUrl=${encodeURIComponent(selectedSiteUrl)}`), {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import Search Console metrics");
      }
      return response.json();
    },
    enabled: Boolean(statusQuery.data?.connected && selectedSiteUrl),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl("/api/google/search-console/disconnect"), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to disconnect Google");
      return response.json();
    },
    onSuccess: () => {
      setSelectedSiteUrl("");
      queryClient.invalidateQueries({ queryKey: ["google-search-console-status"] });
      queryClient.removeQueries({ queryKey: ["google-search-console-properties"] });
      queryClient.removeQueries({ queryKey: ["google-search-console-metrics"] });
      toast({ title: "Google disconnected", description: "Search Console data import has been disconnected." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not disconnect Google", description: error.message, variant: "destructive" });
    },
  });

  const connectToGoogle = () => {
    window.location.href = getApiUrl("/api/google/search-console/auth");
  };

  const metrics = metricsQuery.data;
  const configured = statusQuery.data?.configured ?? false;
  const connected = statusQuery.data?.connected ?? false;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#cdd2d5] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-[#34363a]">Google search analytics</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8084]">
              Connect a Google account with access to Search Console to import impressions, clicks, CTR, and average position for your store.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <Button
                type="button"
                variant="outline"
                className="border-[#b8d0dd] bg-[#eef5f9] font-semibold text-[#123a5a]"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                Disconnect Google
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-[#008060] font-semibold text-white hover:bg-[#006e52]"
                onClick={connectToGoogle}
                disabled={!configured}
              >
                Connect Google account
              </Button>
            )}
          </div>
        </div>

        {!configured && (
          <div className="mt-5 rounded-lg border border-[#ffd59d] bg-[#fff4e5] p-4 text-sm text-[#8a4b00]">
            Google OAuth is not configured yet. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to the Express backend environment.
          </div>
        )}

        {connected && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <Field label="Search Console property">
              <Select value={selectedSiteUrl} onValueChange={setSelectedSiteUrl}>
                <SelectTrigger className="border-[#c9cccf] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(propertiesQuery.data?.properties || []).map((property) => (
                    <SelectItem key={property.siteUrl} value={property.siteUrl}>
                      {property.siteUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              className="bg-[#008060] font-semibold text-white hover:bg-[#006e52]"
              onClick={() => metricsQuery.refetch()}
              disabled={!selectedSiteUrl || metricsQuery.isFetching}
            >
              {metricsQuery.isFetching ? "Importing..." : "Import analytics"}
            </Button>
          </div>
        )}
      </div>

      {metrics && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="Impressions" value={metrics.summary.impressions.toLocaleString()} />
            <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Clicks" value={metrics.summary.clicks.toLocaleString()} />
            <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="CTR" value={`${(metrics.summary.ctr * 100).toFixed(2)}%`} />
            <MetricCard icon={<BadgePercent className="h-5 w-5" />} label="Avg. position" value={metrics.summary.position ? metrics.summary.position.toFixed(1) : "0.0"} />
          </section>

          <section className="rounded-lg border border-[#cdd2d5] bg-white shadow-sm">
            <div className="border-b border-[#dfe3e6] p-4">
              <h3 className="font-black text-[#34363a]">Imported page performance</h3>
              <p className="mt-1 text-xs text-[#7c8084]">
                {metrics.siteUrl} · {metrics.startDate} to {metrics.endDate}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="text-[11px] uppercase text-[#34363a]">
                  <tr className="border-b border-[#dfe3e6]">
                    <th className="px-6 py-5">Page</th>
                    <th className="px-6 py-5">Impressions</th>
                    <th className="px-6 py-5">Clicks</th>
                    <th className="px-6 py-5">CTR</th>
                    <th className="px-6 py-5">Current Position</th>
                  </tr>
                </thead>
                <tbody className="text-[#686c71]">
                  {metrics.pages.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center" colSpan={5}>No Search Console rows returned for this date range.</td>
                    </tr>
                  ) : (
                    metrics.pages.map((page) => (
                      <tr key={page.page} className="border-b border-[#e5e8ea] last:border-b-0">
                        <td className="max-w-[420px] truncate px-6 py-5 font-semibold text-[#008060]">{page.page}</td>
                        <td className="px-6 py-5">{page.impressions.toLocaleString()}</td>
                        <td className="px-6 py-5">{page.clicks.toLocaleString()}</td>
                        <td className="px-6 py-5">{(page.ctr * 100).toFixed(2)}%</td>
                        <td className="px-6 py-5">{page.position ? page.position.toFixed(1) : "0.0"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "active"
      ? "border border-[#b8d0dd] bg-[#eef5f9] text-[#008060]"
      : status === "draft"
        ? "bg-[#fff4e5] text-[#b95000]"
        : "bg-[#edeff1] text-[#6d7175]";

  return <Badge className={`${className} capitalize hover:bg-inherit`}>{status}</Badge>;
}

function SeoBadge({ score }: { score: number }) {
  const className =
    score >= 75
      ? "border border-[#b8d0dd] bg-[#eef5f9] text-[#008060]"
      : score >= 45
        ? "bg-[#fff4e5] text-[#b95000]"
        : "bg-[#fdecea] text-[#b42318]";

  return <Badge className={`${className} hover:bg-inherit`}>{score}%</Badge>;
}

function SeoPanel({
  form,
  onChange,
}: {
  form: InsertProduct;
  onChange: <K extends keyof InsertProduct>(key: K, value: InsertProduct[K]) => void;
}) {
  const [open, setOpen] = useState(false);
  const analysis = getSeoScore(form);
  const title = getSeoTitle(form);
  const description = getSeoDescription(form);
  const handle = form.handle || slugify(form.title || "") || "product";
  const suggestedSeo = generateSeoFields(form);
  const statusClass =
    analysis.status === "Good"
      ? "bg-[#eef5f9] text-[#008060] border-[#b8d0dd]"
      : analysis.status === "Needs work"
        ? "bg-[#fff4e5] text-[#b95000] border-[#ffd59d]"
        : "bg-[#fdecea] text-[#b42318] border-[#f5b5ad]";

  return (
    <section className="rounded-lg border border-[#dde0dc] bg-[#fafbfb] p-4">
      <button
        type="button"
        className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-[#eef5f9] text-[#123a5a]">
            <SearchCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-[#34363a]">SEO plugin</h3>
              {open ? <ChevronUp className="h-4 w-4 text-[#6d7175]" /> : <ChevronDown className="h-4 w-4 text-[#6d7175]" />}
            </div>
            <p className="mt-1 text-sm text-[#6d7175]">Click to view Yoast-style search preview and product SEO checks.</p>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-sm font-bold ${statusClass}`}>
          {analysis.status} / {analysis.score}%
        </div>
      </button>

      {open && (
        <div className="mt-4">

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <Field label="Focus keyphrase">
                <Input
                  value={form.focusKeyword}
                  onChange={(event) => onChange("focusKeyword", event.target.value)}
                  placeholder="organic burp cloths"
                />
              </Field>
              <Field label="SEO title">
                <Input
                  value={form.seoTitle}
                  onChange={(event) => onChange("seoTitle", event.target.value)}
                  placeholder={form.title || "Product title for search engines"}
                />
                <p className="text-xs text-[#6d7175]">{title.length}/60 characters</p>
              </Field>
              <Field label="Meta description">
                <Textarea
                  value={form.seoDescription}
                  onChange={(event) => onChange("seoDescription", event.target.value)}
                  placeholder="Write a compelling search description for this product."
                  rows={3}
                />
                <p className="text-xs text-[#6d7175]">{description.length}/155 characters</p>
              </Field>
              <Field label="URL handle">
                <Input
                  value={form.handle}
                  onChange={(event) => onChange("handle", event.target.value)}
                  placeholder={handle}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#b8d0dd] bg-[#eef5f9] font-bold text-[#123a5a] sm:w-auto"
                onClick={() => {
                  onChange("focusKeyword", suggestedSeo.focusKeyword);
                  onChange("seoTitle", suggestedSeo.seoTitle);
                  onChange("seoDescription", suggestedSeo.seoDescription);
                  onChange("handle", suggestedSeo.handle);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4 text-[#008060]" />
                Generate SEO
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-[#dde0dc] bg-white p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6d7175]">Search preview</div>
                <div className="text-lg text-[#1a0dab]">{title}</div>
                <div className="text-sm text-[#006621]">https://tinytreasures.local/products/{handle}</div>
                <p className="mt-1 text-sm leading-5 text-[#545454]">{description}</p>
              </div>

              <div className="rounded-md border border-[#dde0dc] bg-white p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6d7175]">SEO analysis</div>
                <div className="space-y-2">
                  {analysis.checks.map((check) => (
                    <div key={check.label} className="flex gap-3 rounded-md bg-[#fafbfb] p-2">
                      <span
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                          check.status === "good" ? "bg-[#008060]" : check.status === "ok" ? "bg-[#f6a609]" : "bg-[#d72c0d]"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-bold text-[#34363a]">{check.label}</div>
                        <div className="text-xs leading-5 text-[#6d7175]">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="font-bold text-[#34363a]">{label}</Label>
      {children}
    </div>
  );
}
