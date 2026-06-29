import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gift,
  ShoppingCart,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";
import { useAfterInitialLoad, useAfterInitialLoadOrInteraction } from "@/hooks/useAfterInitialLoad";
import type { Product } from "@shared/schema";
import type { PolicyId } from "./home-dialogs";

type HomeSectionsProps = {
  orderPlaced: boolean;
  onGiftBoxOpen: () => void;
  onProductAdd: (product: Product) => void;
  onProductView: (product: Product) => void;
  onPolicyChange: (id: PolicyId) => void;
  onActiveProductsChange: (products: Product[]) => void;
  onLazyLoadImagesChange: (enabled: boolean) => void;
};

const defaultFacebookReviewUrl = "https://www.facebook.com/your-page/reviews";
const productCardSizes = "(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw";

const categories = [
  { name: "Baby Books", emoji: "📚" },
  { name: "Toys", emoji: "🧸" },
  { name: "Burp Cloths", emoji: "🍼" },
  { name: "Gift Sets", emoji: "🎁" },
  { name: "Feeding", emoji: "🥄" },
  { name: "Bath Time", emoji: "🛁" },
];

const facebookReviews = [
  {
    emoji: "🧸",
    name: "Megan R.",
    time: "2 days ago",
    review: "The plush bunny was even sweeter in person, and it felt safe and soft enough for a newborn gift.",
  },
  {
    emoji: "🌿",
    name: "Priya S.",
    time: "4 days ago",
    review: "The burp cloths are beautifully made. The cotton is gentle, and the colors looked perfect in my baby shower basket.",
  },
  {
    emoji: "💝",
    name: "Rachel B.",
    time: "1 week ago",
    review: "Everything arrived looking boutique-level. The keepsake set made such a thoughtful gift for new parents.",
  },
  {
    emoji: "📚",
    name: "Danielle K.",
    time: "1 week ago",
    review: "The baby book was sturdy, adorable, and perfect for adding something personal to a shower gift.",
  },
  {
    emoji: "🎁",
    name: "Alyssa M.",
    time: "2 weeks ago",
    review: "I loved being able to choose a gift that felt thoughtful without spending hours searching.",
  },
];

const policyLinks = [
  { id: "returns", title: "Shipping and Returns Policy" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "terms", title: "Terms of Service" },
  { id: "payments", title: "Third-Party Payment Processor Disclaimer" },
] as const;

function money(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numeric);
}

function productVisual(product: Product) {
  const palettes: Record<string, string> = {
    Toys: "linear-gradient(135deg, #fff7cc 0%, #fde68a 46%, #fbbf24 100%)",
    "Burp Cloths": "linear-gradient(135deg, #ffe4ef 0%, #fbcfe8 48%, #fb7185 100%)",
    "Baby Books": "linear-gradient(135deg, #dbeafe 0%, #c7d2fe 48%, #818cf8 100%)",
    "Gift Sets": "linear-gradient(135deg, #f3e8ff 0%, #ddd6fe 48%, #a78bfa 100%)",
    Feeding: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 48%, #34d399 100%)",
    "Bath Time": "linear-gradient(135deg, #cffafe 0%, #bae6fd 48%, #38bdf8 100%)",
  };

  return product.imageUrl || palettes[product.category] || "linear-gradient(135deg, #fce7f3 0%, #d8b4fe 100%)";
}

function addQueryParams(url: string, params: Record<string, string | number>) {
  const [path, hash = ""] = url.split("#");
  const [base, query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const nextQuery = search.toString();
  return `${base}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

function getOptimizedImageUrl(url: string, width: number) {
  if (!url) return url;

  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    return url.replace("/image/upload/", `/image/upload/f_auto,q_auto:eco,c_limit,w_${width}/`);
  }

  if (url.startsWith("/api/image/")) {
    return addQueryParams(url, { w: width, format: "webp" });
  }

  return url;
}

function getImageSrcSet(url: string, widths: number[]) {
  if (!url) return undefined;
  return widths.map((width) => `${getOptimizedImageUrl(url, width)} ${width}w`).join(", ");
}

function categoryEmoji(category: string) {
  return categories.find((item) => item.name === category)?.emoji ?? "🎀";
}

function parseProductVariants(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return [
      Array.isArray(parsed.size) && parsed.size.length ? `Sizes: ${parsed.size.slice(0, 3).join(", ")}` : "",
      Array.isArray(parsed.color) && parsed.color.length ? `Colors: ${parsed.color.slice(0, 3).join(", ")}` : "",
      Array.isArray(parsed.style) && parsed.style.length ? `Styles: ${parsed.style.slice(0, 2).join(", ")}` : "",
    ].filter(Boolean);
  } catch {
    return [];
  }
}

export function HomeSections({
  orderPlaced,
  onGiftBoxOpen,
  onProductAdd,
  onProductView,
  onPolicyChange,
  onActiveProductsChange,
  onLazyLoadImagesChange,
}: HomeSectionsProps) {
  const reviewSliderRef = useRef<HTMLDivElement>(null);
  const canLoadProducts = useAfterInitialLoadOrInteraction(4500);
  const canLoadSettings = useAfterInitialLoad(6000);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/products"));
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: canLoadProducts,
  });
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to fetch store settings");
      return response.json();
    },
    enabled: canLoadSettings,
  });

  const activeProducts = useMemo(() => products.filter((product) => product.status === "active"), [products]);
  const featuredProducts = activeProducts.filter((product) => product.featured === "true");
  const lazyLoadImages = siteSettings.lazy_load_below_fold_images === "true";
  const facebookReviewUrl = siteSettings.facebook_reviews_url || defaultFacebookReviewUrl;

  useEffect(() => {
    onActiveProductsChange(activeProducts);
  }, [activeProducts, onActiveProductsChange]);

  useEffect(() => {
    onLazyLoadImagesChange(lazyLoadImages);
  }, [lazyLoadImages, onLazyLoadImagesChange]);

  function scrollReviews(direction: "left" | "right") {
    reviewSliderRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  return (
    <>
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-purple-50 p-6 shadow-sm ring-1 ring-pink-100 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-700">Make it personal</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Build your own gift box</h2>
              <p className="mt-3 max-w-2xl text-gray-600">Choose at least three treasures, add a personal note, and we'll prepare them together as a thoughtful gift.</p>
            </div>
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-pink-700 to-purple-700 px-8 text-white shadow-xl hover:from-pink-800 hover:to-purple-800"
              onClick={onGiftBoxOpen}
            >
              Build a Gift Box <Gift className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Star className="h-7 w-7 fill-yellow-300 text-yellow-300" />
              <h2 className="text-4xl font-bold text-gray-800">
                Featured <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Picks</span>
              </h2>
              <Star className="h-7 w-7 fill-yellow-300 text-yellow-300" />
            </div>
            <p className="ml-9 text-gray-700">Our most loved items for your little one</p>
          </div>
        </div>

        {orderPlaced && (
          <div className="mb-6 flex items-center gap-3 rounded-3xl border border-green-100 bg-green-50 p-4 text-green-700">
            <Check className="h-5 w-5" />
            <div>
              <div className="font-bold">Order placed</div>
              <div className="text-sm">This demo checkout completed successfully.</div>
            </div>
          </div>
        )}

        {!canLoadProducts || productsLoading ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-10 text-center text-gray-700 shadow-sm">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onProductAdd}
                onView={onProductView}
                lazyLoadImages={lazyLoadImages}
              />
            ))}
          </div>
        )}
      </section>

      <section className="relative mt-20 overflow-hidden bg-white py-16">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">What Our Customers Say</h2>
          </div>

          <div className="mb-8 rounded-3xl bg-[#f5f5f7] p-5 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-end gap-2">
                  <span className="text-3xl font-bold text-[#075eb8]">Facebook</span>
                  <span className="text-3xl font-bold text-gray-900">Reviews</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">4.9</span>
                  <span className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-7 w-7 fill-yellow-300 text-yellow-300" />
                    ))}
                  </span>
                  <span className="text-sm font-medium text-gray-700">(128)</span>
                </div>
              </div>

              <a href={facebookReviewUrl} target="_blank" rel="noreferrer">
                <Button className="h-12 rounded-full bg-[#075eb8] px-8 text-base font-bold text-white shadow-md hover:bg-[#064f9b]">
                  Review us on Facebook
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute -left-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-gray-600/80 text-white shadow-lg hover:bg-gray-700 hover:text-white"
              onClick={() => scrollReviews("left")}
              aria-label="Scroll reviews left"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div
              ref={reviewSliderRef}
              className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
            >
              {facebookReviews.map((review) => (
                <article
                  key={`${review.name}-${review.time}`}
                  className="flex min-h-[330px] w-[82vw] max-w-sm shrink-0 snap-start flex-col rounded-3xl bg-[#f7f7f9] p-6 shadow-sm sm:w-[320px]"
                >
                  <div className="mb-7 flex items-start gap-4">
                    <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-sm">
                      {review.emoji}
                      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-black text-[#075eb8] shadow-sm">
                        f
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{review.name}</h3>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#075eb8] text-xs font-bold text-white">✓</span>
                      </div>
                      <p className="text-sm text-gray-700">{review.time}</p>
                    </div>
                  </div>

                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed text-gray-900">{review.review}</p>
                </article>
              ))}
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute -right-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-gray-600/80 text-white shadow-lg hover:bg-gray-700 hover:text-white"
              onClick={() => scrollReviews("right")}
              aria-label="Scroll reviews right"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 border-t border-pink-100 bg-rose-50/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-700">About Tiny Treasures</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">Thoughtful baby gifts, chosen with care</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                Tiny Treasures is a curated baby boutique focused on soft essentials, keepsakes, storybooks, and gifts that feel personal from the first peek.
              </p>
            </div>

            <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Store Policies</h3>
              <div className="mt-4 grid gap-2">
                {policyLinks.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    className="flex min-h-12 items-center justify-between rounded-2xl border border-pink-100 px-4 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
                    onClick={() => onPolicyChange(policy.id)}
                  >
                    <span>{policy.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductCard({
  product,
  onAdd,
  onView,
  lazyLoadImages,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  onView: (product: Product) => void;
  lazyLoadImages: boolean;
}) {
  const variantDetails = parseProductVariants(product.variants);
  const productImageSrc = product.imageUrl ? getOptimizedImageUrl(product.imageUrl, 640) : "";
  const productImageSrcSet = product.imageUrl ? getImageSrcSet(product.imageUrl, [320, 480, 640, 960]) : undefined;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <button
        type="button"
        className="relative block h-52 w-full cursor-pointer overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-pink-500"
        onClick={() => onView(product)}
        aria-label={`View details for ${product.title}`}
      >
        {product.imageUrl ? (
          <img
            src={productImageSrc}
            srcSet={productImageSrcSet}
            sizes={productCardSizes}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
            loading={lazyLoadImages ? "lazy" : "eager"}
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl" style={{ background: productVisual(product) }}>
            {categoryEmoji(product.category)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
      </button>

      <div className="p-4">
        <div className="mb-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-800">
            {product.title}
          </h3>
        </div>

        <p className="mb-2 line-clamp-2 text-xs text-gray-700">{product.description}</p>

        {variantDetails.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {variantDetails.map((detail) => (
              <span key={detail} className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-800">
                {detail}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-pink-700">{money(product.price)}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${product.inventory > 0 ? "text-green-700" : "text-red-700"}`}>
              {product.inventory > 0 ? `${product.inventory} left` : "Out of stock"}
            </span>
            <Button
              size="sm"
              onClick={() => onAdd(product)}
              disabled={product.inventory === 0}
              className="h-8 rounded-full bg-pink-700 px-3 text-xs text-white shadow-sm hover:bg-pink-800"
            >
              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
