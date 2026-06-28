import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
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
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type AdminSection = "home" | "orders" | "products" | "customers" | "analytics" | "gallery" | "meta" | "performance";

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
  imageUrls: "[]",
  ageRange: "",
  material: "",
  variants: "{}",
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

function parseProductImageUrls(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((url): url is string => typeof url === "string" && Boolean(url.trim()))
      : [];
  } catch {
    return [];
  }
}

function getProductImages(product: Pick<InsertProduct, "imageUrl" | "imageUrls">): string[] {
  return Array.from(new Set([product.imageUrl || "", ...parseProductImageUrls(product.imageUrls)].filter(Boolean)));
}

function valuesDiffer(previous: string | number | null | undefined, next: string | number | null | undefined) {
  return String(previous ?? "") !== String(next ?? "");
}

type ProductVariants = {
  size: string[];
  color: string[];
  material: string[];
  style: string[];
};

type ProductVariantDrafts = Record<keyof ProductVariants, string>;

const emptyVariants: ProductVariants = {
  size: [],
  color: [],
  material: [],
  style: [],
};

const emptyVariantDrafts: ProductVariantDrafts = {
  size: "",
  color: "",
  material: "",
  style: "",
};

function parseProductVariants(value?: string | null): ProductVariants {
  if (!value) return emptyVariants;
  try {
    const parsed = JSON.parse(value);
    return {
      size: Array.isArray(parsed.size) ? parsed.size.filter(Boolean) : [],
      color: Array.isArray(parsed.color) ? parsed.color.filter(Boolean) : [],
      material: Array.isArray(parsed.material) ? parsed.material.filter(Boolean) : [],
      style: Array.isArray(parsed.style) ? parsed.style.filter(Boolean) : [],
    };
  } catch {
    return emptyVariants;
  }
}

function variantInputToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatVariantList(values: string[]) {
  return values.join(", ");
}

function variantsToDrafts(variants: ProductVariants): ProductVariantDrafts {
  return {
    size: formatVariantList(variants.size),
    color: formatVariantList(variants.color),
    material: formatVariantList(variants.material),
    style: formatVariantList(variants.style),
  };
}

function getVariantSummary(product: Product | InsertProduct) {
  const variants = parseProductVariants(product.variants);
  const labels = [
    variants.size.length ? `${variants.size.length} size${variants.size.length === 1 ? "" : "s"}` : "",
    variants.color.length ? `${variants.color.length} color${variants.color.length === 1 ? "" : "s"}` : "",
    variants.material.length ? `${variants.material.length} material${variants.material.length === 1 ? "" : "s"}` : "",
    variants.style.length ? `${variants.style.length} style${variants.style.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return labels.length ? labels.join(" / ") : "No variants";
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
    imageUrls: product.imageUrls || "[]",
    ageRange: product.ageRange,
    material: product.material,
    variants: product.variants || "{}",
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

const initialAdminOrders: AdminOrder[] = [
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
  const [, setLocation] = useLocation();
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
  const [variantDrafts, setVariantDrafts] = useState<ProductVariantDrafts>(emptyVariantDrafts);

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
    { id: "performance", label: "Performance", icon: BarChart3 },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "meta", label: "Meta", icon: SearchCheck },
  ] satisfies Array<{ id: AdminSection; label: string; icon: typeof Home }>;

  const saveMutation = useMutation({
    mutationFn: async (confirmations?: { confirmPriceChange?: boolean; confirmArchive?: boolean }) => {
      const url = editingProduct ? getApiUrl(`/api/products/${editingProduct.id}`) : getApiUrl("/api/products");
      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          inventory: Number(form.inventory || 0),
          ...confirmations,
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
        headers: { "X-Confirm-Action": "archive-product" },
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
      toast({ title: "Archived", description: "Product was hidden from the active store and can be restored from Archived." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not archive product", description: error.message, variant: "destructive" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error: Error) => {
      toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setVariantDrafts(emptyVariantDrafts);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setForm(productToForm(product));
    setVariantDrafts(variantsToDrafts(parseProductVariants(product.variants)));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setVariantDrafts(emptyVariantDrafts);
  }

  function updateForm<K extends keyof InsertProduct>(key: K, value: InsertProduct[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addProductImages(urls: string[]) {
    setForm((current) => {
      const nextImages = Array.from(new Set([...getProductImages(current), ...urls.filter(Boolean)]));
      return {
        ...current,
        imageUrl: current.imageUrl || nextImages[0] || "",
        imageUrls: JSON.stringify(nextImages),
      };
    });
  }

  function setPrimaryProductImage(url: string) {
    setForm((current) => ({
      ...current,
      imageUrl: url,
      imageUrls: JSON.stringify(Array.from(new Set([url, ...getProductImages(current)]))),
    }));
  }

  function removeProductImage(url: string) {
    setForm((current) => {
      const remaining = getProductImages(current).filter((imageUrl) => imageUrl !== url);
      return {
        ...current,
        imageUrl: current.imageUrl === url ? remaining[0] || "" : current.imageUrl,
        imageUrls: JSON.stringify(remaining),
      };
    });
  }

  function updateVariantOption(key: keyof ProductVariants, value: string) {
    const nextDrafts = {
      ...variantDrafts,
      [key]: value,
    };
    setVariantDrafts(nextDrafts);
    const next = {
      size: variantInputToList(nextDrafts.size),
      color: variantInputToList(nextDrafts.color),
      material: variantInputToList(nextDrafts.material),
      style: variantInputToList(nextDrafts.style),
    };
    updateForm("variants", JSON.stringify(next));
  }

  function handleProductImageSelect(media: Media) {
    addProductImages([resolveMediaUrl(media.url)]);
    setMediaLibraryOpen(false);
  }

  async function handleProductImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      toast({ title: "Some files were skipped", description: "Only image files can be uploaded.", variant: "destructive" });
    }

    try {
      const uploaded = await Promise.all(validFiles.map((file) => productImageUploadMutation.mutateAsync(file)));
      addProductImages(uploaded.map((media) => resolveMediaUrl(media.url)));
      toast({
        title: "Images uploaded",
        description: `${uploaded.length} product image${uploaded.length === 1 ? "" : "s"} added.`,
      });
    } finally {
      event.target.value = "";
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const confirmPriceChange = Boolean(editingProduct && valuesDiffer(editingProduct.price, form.price));
    const confirmArchive = Boolean(editingProduct && editingProduct.status !== "archived" && form.status === "archived");

    if (confirmPriceChange) {
      const confirmed = window.confirm(
        `Changing this product price from ${money(editingProduct!.price)} to ${money(form.price)} can affect what shoppers see in the store. Continue?`
      );
      if (!confirmed) return;
    }

    if (confirmArchive) {
      const confirmed = window.confirm(
        "Archiving this product will hide it from active selling views. It is a soft-delete and can be restored by changing the status later. Continue?"
      );
      if (!confirmed) return;
    }

    saveMutation.mutate({ confirmPriceChange, confirmArchive });
  }

  function handleArchiveProduct(product: Product) {
    const confirmed = window.confirm(
      `Archive "${product.title}"? This is a soft-delete: the product will be hidden from active selling views but kept in the database and audit history.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(product.id);
  }

  async function handleLogout() {
    const confirmed = window.confirm("Log out of the Tiny Treasures admin panel?");
    if (!confirmed) return;
    await logout();
  }

  return (
    <div className="min-h-screen bg-[#f3f5f7] p-2 text-[#2f3135] sm:p-5">
      <header className="mb-5 rounded-lg border border-[#d5dadd] bg-white shadow-sm">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#008060] text-white">
              <Store className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-black sm:text-xl">Tiny Treasures Admin Panel</h1>
              <p className="text-xs text-[#8b8e92]">Signed in as {user?.username}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[#7d8185]">
            <Link href="/">
              <Button variant="outline" className="hidden sm:flex items-center gap-2 border-[#bfc5c8] text-[#2f3135] hover:bg-slate-50 hover:text-black">
                <Store className="h-4 w-4 text-[#008060]" />
                View Storefront
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 overflow-hidden rounded-full border border-[#d5dadd] bg-white hover:bg-slate-50" title="Admin User Menu">
                  <UserCircle className="h-7 w-7 text-[#123a5a]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Logged in as {user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserCircle className="h-4 w-4 mr-2 text-[#123a5a]" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer">
                  <Store className="h-4 w-4 mr-2 text-[#008060]" />
                  View Storefront
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[#d72c0d] focus:text-[#d72c0d] focus:bg-[#fdecea] cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="rounded-lg bg-[#123a5a] p-2 shadow-sm sm:p-3 lg:min-h-[calc(100vh-136px)] lg:p-6">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-3 lg:overflow-visible lg:pb-0" aria-label="Admin sections">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex h-12 shrink-0 items-center gap-3 rounded-md px-4 text-left text-sm font-semibold transition lg:w-full lg:text-[15px] ${
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
              <Sparkles className="absolute left-[38%] top-28 h-8 w-8 rotate-[12deg]" />
              <PackagePlus className="absolute left-[53%] top-16 h-11 w-11 rotate-[-10deg]" />
              <ClipboardList className="absolute left-[70%] top-28 h-7 w-7 rotate-[8deg]" />
              <SearchCheck className="absolute right-[6%] top-12 h-8 w-8 rotate-[-16deg]" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl font-black tracking-normal text-[#34363a] md:text-5xl">Hi, Welcome !</h2>
              <p className="mt-2 text-xl text-[#8f9296]">You're off to a great start.</p>
            </div>
          </section>

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
                  <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#dfe3e6]">
                        <th className="w-14 px-5 py-4">
                          <input type="checkbox" className="h-4 w-4 rounded border-[#bfc5c8] text-[#008060] focus:ring-[#008060]" disabled />
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Inventory</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">SEO</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Variants</th>
                        <th className="px-6 py-4 text-left font-semibold text-[#5c5f62] tracking-wider">Price</th>
                        <th className="px-6 py-4 text-right font-semibold text-[#5c5f62] tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#686c71]">
                      {isLoading ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={9}>Loading products...</td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-[#6d7175]" colSpan={9}>No products found.</td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => (
                          <tr key={product.id} className="border-b border-[#e5e8ea] last:border-b-0 hover:bg-slate-50/85 transition-colors duration-150">
                            <td className="px-5 py-4">
                              <input type="checkbox" className="h-4 w-4 rounded border-[#bfc5c8] text-[#008060] focus:ring-[#008060]" disabled />
                            </td>
                            <td className="px-6 py-4">
                              <button type="button" className="font-semibold text-[#008060] hover:text-[#005a43] hover:underline transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#008060] focus:ring-offset-2 rounded" onClick={() => openEditDialog(product)}>
                                {product.title}
                              </button>
                              <div className="mt-1 text-[11px] text-[#8c9196]">{product.sku || product.handle || product.id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={product.status} />
                            </td>
                            <td className="px-6 py-4">
                              <span className={product.inventory <= 5 ? "font-semibold text-[#b95000]" : "font-semibold text-[#008060]"}>
                                {product.inventory}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <SeoBadge score={getSeoScore(productToForm(product)).score} />
                            </td>
                            <td className="px-6 py-4 text-[#2f3135]">{product.category}</td>
                            <td className="px-6 py-4 text-[#686c71]">{getVariantSummary(product)}</td>
                            <td className="px-6 py-4 text-[#34363a] font-medium">{money(product.price)}</td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#34363a] hover:bg-slate-100 hover:text-black" onClick={() => openEditDialog(product)} title="Edit product">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#ff5d75] hover:bg-red-50 hover:text-red-600"
                                  onClick={() => handleArchiveProduct(product)}
                                  disabled={product.status === "archived" || deleteMutation.isPending}
                                  title={product.status === "archived" ? "Product is already archived" : "Archive product"}
                                >
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
          ) : activeSection === "performance" ? (
            <PerformancePanel />
          ) : activeSection === "gallery" ? (
            <section className="min-w-0 rounded-lg border border-[#cdd2d5] bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5">
                <h3 className="text-2xl font-black text-[#34363a]">Gallery</h3>
                <p className="mt-1 text-sm text-[#6d7175]">Upload, search, edit, and safely remove images from your store library.</p>
              </div>
              <MediaLibraryPanel mode="manage" />
            </section>
          ) : activeSection === "meta" ? (
            <MetaPanel />
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
              <div className="mb-4">
                <h3 className="font-black text-[#34363a]">Variants</h3>
                <p className="text-sm text-[#6d7175]">Add comma-separated options for clothing or configurable products.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Size options">
                  <Input
                    value={variantDrafts.size}
                    onChange={(event) => updateVariantOption("size", event.target.value)}
                    placeholder="Newborn, 0-3M, 3-6M"
                  />
                </Field>
                <Field label="Color options">
                  <Input
                    value={variantDrafts.color}
                    onChange={(event) => updateVariantOption("color", event.target.value)}
                    placeholder="Ivory, Sage, Blush"
                  />
                </Field>
                <Field label="Material options">
                  <Input
                    value={variantDrafts.material}
                    onChange={(event) => updateVariantOption("material", event.target.value)}
                    placeholder="Cotton, Bamboo, Fleece"
                  />
                </Field>
                <Field label="Style options">
                  <Input
                    value={variantDrafts.style}
                    onChange={(event) => updateVariantOption("style", event.target.value)}
                    placeholder="Short sleeve, Long sleeve, Hooded"
                  />
                </Field>
              </div>
              <div className="mt-3 text-xs font-semibold text-[#6d7175]">{getVariantSummary(form)}</div>
            </section>
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
                  <h3 className="font-black text-[#34363a]">Product images</h3>
                  <p className="text-sm text-[#6d7175]">Add multiple angles or lighting conditions. Mark one image as the primary storefront image.</p>
                </div>
              </div>
              <div className="space-y-4">
                {getProductImages(form).length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Product image gallery">
                    {getProductImages(form).map((url, index) => {
                      const isPrimary = form.imageUrl === url;
                      return (
                        <li key={url} className="overflow-hidden rounded-lg border border-[#d8dcdf] bg-white">
                          <div className="relative aspect-square bg-[#f7f7f7]">
                            <img
                              src={url}
                              alt={`${form.title || "Product"} image ${index + 1}`}
                              className="h-full w-full object-contain"
                            />
                            {isPrimary && (
                              <span className="absolute left-2 top-2 rounded-full bg-[#008060] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 border-t border-[#e5e8ea]">
                            <button
                              type="button"
                              className="min-h-11 border-r border-[#e5e8ea] px-2 text-xs font-semibold text-[#006e52] hover:bg-[#f1f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#008060] disabled:text-[#8c9196]"
                              onClick={() => setPrimaryProductImage(url)}
                              disabled={isPrimary}
                            >
                              {isPrimary ? "Primary" : "Make primary"}
                            </button>
                            <button
                              type="button"
                              className="min-h-11 px-2 text-xs font-semibold text-[#b42318] hover:bg-[#fff4f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b42318]"
                              onClick={() => removeProductImage(url)}
                              aria-label={`Remove image ${index + 1}`}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[#c9cccf] bg-[#fafbfb] text-center text-[#6d7175]">
                    <div>
                      <Image className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">No product images selected</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    ref={productImageInputRef}
                    type="file"
                    multiple
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
                      {productImageUploadMutation.isPending ? "Uploading images..." : "Upload product images"}
                    </span>
                    <span className="mt-1 text-sm text-[#6d7175]">Select one or more images. Files are saved to Cloudinary.</span>
                  </button>
                  <div>
                    <Button type="button" variant="outline" className="border-[#b8d0dd] bg-[#eef5f9] font-semibold text-[#123a5a]" onClick={() => setMediaLibraryOpen(true)}>
                      <Image className="mr-2 h-4 w-4" />
                      Add from library
                    </Button>
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

function ImageAltTextPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data: mediaItems = [], isLoading } = useQuery<Media[]>({
    queryKey: ["media"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/media"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load media");
      return response.json();
    },
  });
  const missingAlt = mediaItems.filter((item) => !item.alt?.trim());
  const mutation = useMutation({
    mutationFn: async ({ id, alt }: { id: string; alt: string }) => {
      const response = await fetch(getApiUrl(`/api/media/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alt }),
      });
      if (!response.ok) throw new Error("Could not save alt text");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setDrafts((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      toast({ title: "Alt text saved" });
    },
  });

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-[#cdd2d5] bg-white p-4 shadow-sm sm:p-7">
      <div className="mb-6">
        <h3 className="text-2xl font-black text-[#34363a]">Missing image alt text</h3>
        <p className="mt-1 text-sm text-[#6d7175]">Improve accessibility and image SEO from one convenient panel.</p>
        <p className="mt-3 font-semibold text-[#b95000]" role="status">{missingAlt.length} image{missingAlt.length === 1 ? "" : "s"} need alt text</p>
      </div>
      {isLoading ? (
        <p>Loading images…</p>
      ) : missingAlt.length === 0 ? (
        <div className="rounded-lg bg-[#f1f8f5] p-5 text-[#006e52]">All media images have alt text.</div>
      ) : (
        <ul className="grid min-w-0 gap-4 2xl:grid-cols-2">
          {missingAlt.map((item) => {
            const value = drafts[item.id] ?? "";
            return (
              <li key={item.id} className="grid min-w-0 gap-4 overflow-hidden rounded-xl border border-[#dde0dc] bg-[#fafbfb] p-4 sm:grid-cols-[112px_minmax(0,1fr)]">
                <div className="flex items-start justify-center">
                  <img
                    src={resolveMediaUrl(item.url)}
                    alt=""
                    className="aspect-square w-full max-w-28 rounded-lg border border-[#e3e6e8] bg-white object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="line-clamp-2 break-all text-sm font-bold leading-5 text-[#34363a]"
                    title={item.originalName}
                  >
                    {item.originalName}
                  </p>
                  <Label htmlFor={`alt-${item.id}`} className="mt-3 block font-semibold text-[#34363a]">Alt text</Label>
                  <Textarea
                    id={`alt-${item.id}`}
                    className="mt-1 min-h-24 w-full resize-y bg-white text-[#202223]"
                    maxLength={250}
                    value={value}
                    onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Describe the image’s meaningful content and purpose."
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-[#6d7175]">{value.length}/250</span>
                    <Button
                      size="sm"
                      className="min-h-10 w-full bg-[#006e52] px-4 font-semibold text-white hover:bg-[#005a43] disabled:bg-[#c7d8d2] disabled:text-[#5c6f68] sm:w-auto"
                      disabled={!value.trim() || mutation.isPending}
                      onClick={() => mutation.mutate({ id: item.id, alt: value.trim() })}
                    >
                      Apply alt text
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PerformancePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to load performance settings");
      return response.json();
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const response = await fetch(getApiUrl(`/api/settings/${key}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: String(enabled) }),
      });
      if (!response.ok) throw new Error("Could not update performance setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Performance setting updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });
  const options = [
    {
      key: "defer_below_fold_scripts",
      title: "Defer below-the-fold scripts",
      description: "Delays optional third-party scripts marked as below-fold until the page has loaded. Core ES module scripts remain standards-compliant and already defer automatically.",
    },
    {
      key: "lazy_load_below_fold_images",
      title: "Lazy load below-the-fold images",
      description: "Uses native browser lazy loading for storefront product images and gallery thumbnails to reduce initial page weight.",
    },
  ];

  return (
    <section className="rounded-lg border border-[#cdd2d5] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6">
        <h3 className="text-2xl font-black text-[#34363a]">Performance</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6d7175]">Control safe front-end optimizations without editing code. Changes are stored in Neon and apply across the storefront.</p>
      </div>
      <div className="grid gap-4">
        {options.map((option) => {
          const enabled = settings[option.key] === "true";
          return (
            <div key={option.key} className="flex flex-col gap-4 rounded-xl border border-[#dde0dc] bg-[#fafbfb] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <h4 className="font-bold text-[#34363a]">{option.title}</h4>
                <p className="mt-1 text-sm leading-6 text-[#6d7175]">{option.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={option.title}
                disabled={isLoading || mutation.isPending}
                onClick={() => mutation.mutate({ key: option.key, enabled: !enabled })}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060] focus-visible:ring-offset-2 disabled:opacity-60 ${
                  enabled ? "bg-[#008060]" : "bg-[#8c9196]"
                }`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
                <span className="sr-only">{enabled ? "Enabled" : "Disabled"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StoreSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [facebookUrl, setFacebookUrl] = useState("");
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
  });

  useEffect(() => {
    setFacebookUrl(settings.facebook_reviews_url || "");
  }, [settings.facebook_reviews_url]);

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetch(getApiUrl("/api/settings/facebook_reviews_url"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not update Facebook reviews URL");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Facebook reviews URL updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = facebookUrl.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error();
      }
    } catch {
      toast({
        title: "Enter a valid URL",
        description: "Use the full Facebook reviews URL, including https://",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(value);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-[#dfe3e6] bg-[#f8faf9] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,520px)] lg:items-end">
        <div>
          <h4 className="text-lg font-black text-[#34363a]">Storefront links</h4>
          <p className="mt-1 text-sm leading-6 text-[#6d7175]">
            Update customer-facing links from the admin panel. The storefront reads this value from Neon through the settings table.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="facebook-reviews-url" className="font-semibold text-[#34363a]">
            Facebook reviews URL
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="facebook-reviews-url"
              type="url"
              inputMode="url"
              placeholder="https://www.facebook.com/your-page/reviews"
              value={facebookUrl}
              onChange={(event) => setFacebookUrl(event.target.value)}
              disabled={isLoading || mutation.isPending}
              className="bg-white"
            />
            <Button
              type="submit"
              disabled={isLoading || mutation.isPending}
              className="bg-[#008060] text-white hover:bg-[#006e52]"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MetaPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [form, setForm] = useState({
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    faviconUrl: "",
  });
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to load meta settings");
      return response.json();
    },
  });

  useEffect(() => {
    setForm({
      metaTitle: settings.meta_title || "",
      metaDescription: settings.meta_description || "",
      metaKeywords: settings.meta_keywords || "",
      faviconUrl: settings.favicon_url || "",
    });
  }, [settings.meta_title, settings.meta_description, settings.meta_keywords, settings.favicon_url]);

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = [
        ["meta_title", form.metaTitle.trim()],
        ["meta_description", form.metaDescription.trim()],
        ["meta_keywords", form.metaKeywords.trim()],
        ["favicon_url", form.faviconUrl.trim()],
      ] as const;

      const responses = await Promise.all(
        updates.map(async ([key, value]) => {
          const response = await fetch(getApiUrl(`/api/settings/${key}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ value }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || `Could not update ${key}`);
          return data;
        })
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Meta settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const favicon = form.faviconUrl.trim();
    if (favicon) {
      try {
        const parsedUrl = new URL(favicon);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
      } catch {
        toast({
          title: "Enter a valid favicon URL",
          description: "Use a full image URL starting with https:// or select one from the gallery.",
          variant: "destructive",
        });
        return;
      }
    }
    mutation.mutate();
  }

  return (
    <>
      <section className="rounded-lg border border-[#cdd2d5] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-[#34363a]">Meta</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6d7175]">
            Edit the storefront browser title, search description, keywords, and favicon from one place.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="meta-title" className="font-semibold text-[#34363a]">Meta title</Label>
              <Input
                id="meta-title"
                value={form.metaTitle}
                onChange={(event) => updateField("metaTitle", event.target.value)}
                maxLength={70}
                placeholder="Tiny Treasures Baby Boutique"
                className="bg-white"
                disabled={isLoading || mutation.isPending}
              />
              <p className="text-xs text-[#6d7175]">{form.metaTitle.length}/70 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-description" className="font-semibold text-[#34363a]">Meta description</Label>
              <Textarea
                id="meta-description"
                value={form.metaDescription}
                onChange={(event) => updateField("metaDescription", event.target.value)}
                maxLength={170}
                rows={4}
                placeholder="Shop curated baby gifts, soft essentials, and keepsakes."
                className="resize-y bg-white"
                disabled={isLoading || mutation.isPending}
              />
              <p className="text-xs text-[#6d7175]">{form.metaDescription.length}/170 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-keywords" className="font-semibold text-[#34363a]">Keywords</Label>
              <Input
                id="meta-keywords"
                value={form.metaKeywords}
                onChange={(event) => updateField("metaKeywords", event.target.value)}
                maxLength={300}
                placeholder="baby boutique, baby gifts, burp cloths, baby books"
                className="bg-white"
                disabled={isLoading || mutation.isPending}
              />
              <p className="text-xs text-[#6d7175]">Separate keywords with commas.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon-url" className="font-semibold text-[#34363a]">Favicon image URL</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="favicon-url"
                  type="url"
                  inputMode="url"
                  value={form.faviconUrl}
                  onChange={(event) => updateField("faviconUrl", event.target.value)}
                  placeholder="https://example.com/favicon.png"
                  className="bg-white"
                  disabled={isLoading || mutation.isPending}
                />
                <Button type="button" variant="outline" onClick={() => setMediaLibraryOpen(true)}>
                  <Image className="mr-2 h-4 w-4" />
                  Choose
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading || mutation.isPending} className="bg-[#008060] text-white hover:bg-[#006e52]">
              {mutation.isPending ? "Saving..." : "Save meta settings"}
            </Button>
          </div>

          <aside className="rounded-xl border border-[#dfe3e6] bg-[#fafbfb] p-4">
            <h4 className="font-black text-[#34363a]">Preview</h4>
            <div className="mt-4 rounded-lg border border-[#dfe3e6] bg-white p-4">
              {form.faviconUrl.trim() ? (
                <img src={form.faviconUrl.trim()} alt="Favicon preview" className="mb-3 h-10 w-10 rounded object-contain" />
              ) : (
                <div className="mb-3 grid h-10 w-10 place-items-center rounded bg-pink-50 text-pink-500">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <div className="line-clamp-2 text-sm font-semibold text-[#1a0dab]">
                {form.metaTitle.trim() || "Tiny Treasures Baby Boutique"}
              </div>
              <div className="mt-1 text-xs text-[#006621]">tiny-treasures.example</div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4d5156]">
                {form.metaDescription.trim() || "Shop Tiny Treasures, a curated baby boutique for thoughtful gifts, soft essentials, and sweet keepsakes."}
              </p>
            </div>
          </aside>
        </form>
      </section>

      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose favicon image</DialogTitle>
          </DialogHeader>
          <MediaLibraryPanel
            mode="select"
            onSelect={(media) => {
              updateField("faviconUrl", resolveMediaUrl(media.url));
              setMediaLibraryOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
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
  const [orders, setOrders] = useState<AdminOrder[]>(initialAdminOrders);

  const titleMap: Record<AdminSection, string> = {
    home: "Home",
    orders: "Orders",
    products: "Products",
    customers: "Customers",
    analytics: "Analytics",
    gallery: "Gallery",
    meta: "Meta",
    performance: "Performance",
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
        <StoreSettingsPanel />
      </section>
    );
  }

  function deleteOrder(order: AdminOrder) {
    const confirmed = window.confirm(`Delete order ${order.id} for ${order.customer}? This cannot be undone.`);
    if (!confirmed) return;
    setOrders((current) => current.filter((item) => item.id !== order.id));
    setSelectedOrder((current) => (current?.id === order.id ? null : current));
  }

  if (activeSection === "orders") {
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
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="text-[11px] uppercase text-[#34363a]">
                <tr className="border-b border-[#dfe3e6]">
                  <th className="px-6 py-5">Order</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Customer</th>
                  <th className="px-6 py-5">Payment Status</th>
                  <th className="px-6 py-5">Fulfillment Status</th>
                  <th className="px-6 py-5">Total</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[#686c71]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-[#6d7175]">
                      No orders to display.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
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
                      <td className="px-6 py-5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-[#d72c0d] hover:bg-[#fdecea] hover:text-[#b42318]"
                          onClick={() => deleteOrder(order)}
                          title={`Delete order ${order.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <DialogTitle>Order {selectedOrder.id}</DialogTitle>
                      <p className="text-sm text-[#686c71]">
                        Placed {selectedOrder.date} by {selectedOrder.customer}
                      </p>
                    </div>
                  </div>
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
            <MetricCard icon={<SearchCheck className="h-5 w-5" />} label="Avg. position" value={metrics.summary.position ? metrics.summary.position.toFixed(1) : "0.0"} />
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
