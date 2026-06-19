import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Home,
  Image,
  LogOut,
  PackagePlus,
  Pencil,
  Search,
  SearchCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Upload,
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
    return { active, inventory, value, seoReady };
  }, [products]);

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
      updateForm("imageUrl", media.url);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Image uploaded", description: "The Cloudinary URL was applied to this product." });
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
    updateForm("imageUrl", media.url);
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
    <div className="min-h-screen bg-[#f6f6f3] text-[#202223]">
      <header className="sticky top-0 z-40 border-b border-[#dde0dc] bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#008060] text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-black">Little Nest Admin</h1>
              <p className="text-xs text-[#6d7175]">Signed in as {user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" className="border-[#c9cccf] bg-white">
                <Home className="mr-2 h-4 w-4" />
                Storefront
              </Button>
            </Link>
            <Button variant="outline" className="border-[#c9cccf] bg-white" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-black">Products</h2>
            <p className="mt-1 text-[#6d7175]">Manage toys, burp cloths, baby books, inventory, pricing, and publish status.</p>
          </div>
          <Button className="bg-[#008060] text-white hover:bg-[#006e52]" onClick={openCreateDialog}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Active products" value={String(stats.active)} />
          <MetricCard icon={<Boxes className="h-5 w-5" />} label="Units in stock" value={String(stats.inventory)} />
          <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Inventory value" value={money(stats.value)} />
          <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="SEO ready" value={`${stats.seoReady}/${products.length}`} />
        </section>

        <section className="rounded-lg border border-[#dde0dc] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#dde0dc] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#8c9196]" />
              <Input
                className="h-11 border-[#c9cccf] pl-9"
                placeholder="Search products, SKUs, categories"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full border-[#c9cccf] lg:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[#fafbfb] text-xs uppercase text-[#6d7175]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inventory</th>
                  <th className="px-4 py-3">SEO</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={7}>Loading products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={7}>No products found.</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-[#edf0ed]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-md bg-[#e8f3ee] text-[#008060]">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-black">{product.title}</div>
                            <div className="text-xs text-[#6d7175]">{product.sku || product.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className={product.inventory <= 5 ? "font-bold text-[#b95000]" : "font-bold"}>
                          {product.inventory}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <SeoBadge score={getSeoScore(productToForm(product)).score} />
                      </td>
                      <td className="px-4 py-4">{product.category}</td>
                      <td className="px-4 py-4">{money(product.price)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="border-[#c9cccf] bg-white" onClick={() => openEditDialog(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="border-[#c9cccf] bg-white text-[#b42318]" onClick={() => deleteMutation.mutate(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
      </main>

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
                <h3 className="font-black text-[#202223]">Product description</h3>
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
                  <h3 className="font-black text-[#202223]">Product image</h3>
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
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#008060] bg-[#f1f8f5] p-6 text-center transition hover:bg-[#e8f3ee] disabled:cursor-not-allowed disabled:opacity-60"
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
                    <Button type="button" variant="outline" className="border-[#c9cccf] bg-white" onClick={() => setMediaLibraryOpen(true)}>
                      <Image className="mr-2 h-4 w-4" />
                      Choose from library
                    </Button>
                    {form.imageUrl && (
                      <Button type="button" variant="ghost" className="text-[#b42318] hover:bg-[#fdecea] hover:text-[#b42318]" onClick={() => updateForm("imageUrl", "")}>
                        Remove image
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <SeoPanel form={form} onChange={updateForm} />
            <div className="flex justify-end gap-2 border-t border-[#dde0dc] pt-4">
              <Button type="button" variant="outline" className="border-[#c9cccf] bg-white" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-[#008060] text-white hover:bg-[#006e52]" disabled={saveMutation.isPending}>
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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f3ee] text-[#008060]">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm text-[#6d7175]">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "active"
      ? "bg-[#e8f3ee] text-[#008060]"
      : status === "draft"
        ? "bg-[#fff4e5] text-[#b95000]"
        : "bg-[#edeff1] text-[#6d7175]";

  return <Badge className={`${className} capitalize hover:bg-inherit`}>{status}</Badge>;
}

function SeoBadge({ score }: { score: number }) {
  const className =
    score >= 75
      ? "bg-[#e8f3ee] text-[#008060]"
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
      ? "bg-[#e8f3ee] text-[#008060] border-[#a8d5c2]"
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
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-[#e8f3ee] text-[#008060]">
            <SearchCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black">SEO plugin</h3>
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
                className="w-full border-[#c9cccf] bg-white font-bold text-[#123a5a] hover:bg-[#eef5f9] sm:w-auto"
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
                        <div className="text-sm font-bold text-[#123a5a]">{check.label}</div>
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
      <Label className="font-semibold text-[#123a5a]">{label}</Label>
      {children}
    </div>
  );
}
