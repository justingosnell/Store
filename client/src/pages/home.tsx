import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Baby,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Gift,
  Heart,
  LogIn,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getApiUrl } from "@/lib/api";
import type { Product } from "@shared/schema";
import heroBg from "./apply-schema-fix.png";

type CartLine = {
  product: Product;
  quantity: number;
};

const categories = [
  { name: "Baby Books", emoji: "📚", color: "from-blue-200 to-indigo-200", text: "text-indigo-700" },
  { name: "Toys", emoji: "🧸", color: "from-yellow-200 to-amber-200", text: "text-amber-700" },
  { name: "Burp Cloths", emoji: "🍼", color: "from-pink-200 to-rose-200", text: "text-rose-700" },
  { name: "Gift Sets", emoji: "🎁", color: "from-purple-200 to-violet-200", text: "text-violet-700" },
  { name: "Feeding", emoji: "🥄", color: "from-green-200 to-emerald-200", text: "text-emerald-700" },
  { name: "Bath Time", emoji: "🛁", color: "from-cyan-200 to-sky-200", text: "text-sky-700" },
];

const floatingItems = [
  { icon: "🧸", className: "top-10 left-[6%] animate-float-gentle", delay: "0s", size: "text-6xl" },
  { icon: "⭐", className: "top-8 left-[22%] animate-twinkle", delay: "0.8s", size: "text-4xl" },
  { icon: "🚗", className: "top-16 right-[8%] animate-float-sway", delay: "1s", size: "text-6xl" },
  { icon: "🌙", className: "top-4 right-[26%] animate-bounce-gentle", delay: "0.5s", size: "text-5xl" },
  { icon: "💜", className: "top-6 left-[52%] animate-float-gentle", delay: "0.3s", size: "text-4xl" },
  { icon: "🍼", className: "bottom-12 left-[12%] animate-float-sway", delay: "0.7s", size: "text-5xl" },
  { icon: "🌟", className: "bottom-8 right-[18%] animate-twinkle", delay: "1.2s", size: "text-4xl" },
  { icon: "🐰", className: "bottom-6 right-[36%] animate-bounce-gentle", delay: "2s", size: "text-5xl" },
];

// Replace this placeholder with the real Facebook reviews URL when it is available.
const facebookReviewUrl = "https://www.facebook.com/your-page/reviews";

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

function categoryEmoji(category: string) {
  return categories.find((item) => item.name === category)?.emoji ?? "🎀";
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const reviewSliderRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/products"));
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const activeProducts = products.filter((product) => product.status === "active");
  const featured = activeProducts.filter((product) => product.featured === "true").slice(0, 3);
  const visibleProducts = featured.length > 0 ? featured : activeProducts.slice(0, 3);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const haystack = [product.title, product.description, product.category, product.tags, product.ageRange]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [activeProducts, activeCategory, query]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const shipping = subtotal > 40 || subtotal === 0 ? 0 : 6.95;
  const total = subtotal + shipping;

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
    setOrderPlaced(false);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function checkout() {
    if (!cart.length) return;
    setOrderPlaced(true);
    setCart([]);
    setCartOpen(false);
  }

  function scrollReviews(direction: "left" | "right") {
    reviewSliderRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-800">
      <nav className="sticky top-0 z-50 border-b border-pink-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-400 shadow-md transition-transform group-hover:scale-110">
                <Baby className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight text-pink-600">Tiny Treasures</span>
                <span className="-mt-1 text-[10px] font-medium uppercase tracking-widest text-purple-400">Baby Store</span>
              </div>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {["Home", "Shop", "Categories"].map((item) => (
                <a
                  key={item}
                  href={item === "Home" ? "/" : `#${item.toLowerCase()}`}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-pink-50 hover:text-pink-500"
                >
                  {item}
                </a>
              ))}
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-pink-50 hover:text-pink-500">
                Owner Login
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-gray-500 hover:bg-pink-50 hover:text-pink-500">
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="relative rounded-full text-gray-600 hover:bg-pink-50 hover:text-pink-500"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-pink-500 p-0 text-xs text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </Badge>
                )}
              </Button>
              <button className="rounded-full p-2 text-gray-600 hover:bg-pink-50 md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-pink-100 bg-white px-4 pb-4 pt-2 md:hidden">
            {["Home", "Shop", "Categories"].map((item) => (
              <a
                key={item}
                href={item === "Home" ? "/" : `#${item.toLowerCase()}`}
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-pink-50 hover:text-pink-500"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <span className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-pink-50 hover:text-pink-500">
                Owner Login
              </span>
            </Link>
          </div>
        )}
      </nav>

      <section
        className="relative flex min-h-[680px] items-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/85" />
        <div className="absolute right-[-60px] top-[-80px] h-[420px] w-[420px] rounded-full bg-pink-300/20 blur-[80px]" />
        <div className="absolute bottom-[-60px] left-[-60px] h-[360px] w-[360px] rounded-full bg-purple-300/20 blur-[80px]" />

        {floatingItems.map((item) => (
          <div
            key={`${item.icon}-${item.className}`}
            className={`pointer-events-none absolute ${item.className} ${item.size} opacity-85 drop-shadow-md`}
            style={{ animationDelay: item.delay }}
          >
            {item.icon}
          </div>
        ))}

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6">
          <div className="animate-pop-in mb-6 inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/70 px-5 py-2.5 text-sm font-semibold text-pink-600 shadow-md backdrop-blur-sm">
            <Sparkles className="h-4 w-4 animate-spin-slow" style={{ animationDuration: "4s" }} />
            Welcome to Tiny Treasures
            <Sparkles className="h-4 w-4 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "4s" }} />
          </div>

          <h1 className="animate-pop-in mb-6 text-5xl font-bold leading-tight text-gray-800 md:text-7xl" style={{ animationDelay: "0.1s" }}>
            Everything Baby,{" "}
            <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500 bg-clip-text text-transparent">
              Made with Love
            </span>
          </h1>

          <p className="animate-pop-in mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-gray-600" style={{ animationDelay: "0.2s" }}>
            Discover our carefully curated collection of storybooks, toys, burp cloths, and more, all chosen with your baby's joy and safety in mind.
          </p>

          <div className="animate-pop-in flex flex-wrap justify-center gap-4" style={{ animationDelay: "0.35s" }}>
            <a href="#shop">
              <Button
                size="lg"
                className="animate-pulse-glow rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-10 text-base font-semibold text-white shadow-xl transition-all hover:from-pink-600 hover:to-purple-600 hover:shadow-2xl"
              >
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <button
              onClick={() => {
                setActiveCategory("Baby Books");
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-2 border-pink-300 bg-white/70 px-8 font-semibold text-pink-600 backdrop-blur-sm hover:bg-pink-50"
              >
                Browse Books 📚
              </Button>
            </button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            {[
              { icon: <Truck className="h-4 w-4 text-pink-500" />, text: "Free shipping over $40", bg: "bg-pink-50" },
              { icon: <Shield className="h-4 w-4 text-purple-500" />, text: "Baby-safe materials", bg: "bg-purple-50" },
              { icon: <Heart className="h-4 w-4 text-red-400" />, text: "Curated with love", bg: "bg-red-50" },
            ].map((item) => (
              <div key={item.text} className={`flex items-center gap-2 rounded-full border border-white px-4 py-2 font-medium shadow-sm ${item.bg}`}>
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Star className="h-7 w-7 fill-yellow-300 text-yellow-300" />
              <h2 className="text-4xl font-bold text-gray-800">
                Featured <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Picks</span>
              </h2>
              <Star className="h-7 w-7 fill-yellow-300 text-yellow-300" />
            </div>
            <p className="ml-9 text-gray-500">Our most loved items for your little one</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-pink-300" />
              <Input
                className="h-11 rounded-full border-pink-100 bg-white pl-9 shadow-sm"
                placeholder="Search tiny treasures"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              className="rounded-full font-semibold text-pink-500 hover:bg-pink-50 hover:text-pink-600"
              onClick={() => {
                setActiveCategory("All");
                setQuery("");
              }}
            >
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {["All", ...categories.map((item) => item.name)].map((item) => (
            <button
              key={item}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === item ? "bg-pink-500 text-white shadow-md" : "border border-pink-100 bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-500"
              }`}
              onClick={() => setActiveCategory(item)}
            >
              {item}
            </button>
          ))}
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

        {isLoading ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-10 text-center text-gray-500 shadow-sm">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {(query || activeCategory !== "All" ? filteredProducts : visibleProducts).map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
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
                  <span className="text-3xl font-bold text-[#1877f2]">Facebook</span>
                  <span className="text-3xl font-bold text-gray-900">Reviews</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">4.9</span>
                  <span className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-7 w-7 fill-yellow-300 text-yellow-300" />
                    ))}
                  </span>
                  <span className="text-sm font-medium text-gray-500">(128)</span>
                </div>
              </div>

              <a href={facebookReviewUrl} target="_blank" rel="noreferrer">
                <Button className="h-12 rounded-full bg-[#1877f2] px-8 text-base font-bold text-white shadow-md hover:bg-[#0f65d8]">
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
                      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-black text-[#1877f2] shadow-sm">
                        f
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{review.name}</h3>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1877f2] text-xs font-bold text-white">✓</span>
                      </div>
                      <p className="text-sm text-gray-500">{review.time}</p>
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

      <section className="mx-auto mb-16 mt-16 max-w-7xl px-4 sm:px-6">
        <div className="animate-shimmer-bg relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-12 text-center text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-80 w-80 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 h-60 w-60 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/10" />
          <div className="absolute left-16 top-4 animate-twinkle text-2xl text-white/80">⭐</div>
          <div className="absolute bottom-4 right-20 animate-twinkle text-xl text-white/70" style={{ animationDelay: "0.8s" }}>⭐</div>

          <div className="relative z-10">
            <div className="animate-wiggle mb-4 inline-block text-6xl">🎁</div>
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Free Shipping on Orders Over $40!</h2>
            <p className="mx-auto mb-8 max-w-lg text-lg text-pink-100">Stock up on everything your baby needs and save on shipping.</p>
            <a href="#shop">
              <Button size="lg" className="rounded-full bg-white px-10 text-base font-bold text-pink-600 shadow-xl transition-all hover:scale-105 hover:bg-pink-50">
                Start Shopping ✨
              </Button>
            </a>
          </div>
        </div>
      </section>

      <CartDrawer
        open={cartOpen}
        cart={cart}
        subtotal={subtotal}
        shipping={shipping}
        total={total}
        onClose={() => setCartOpen(false)}
        onQuantity={updateQuantity}
        onCheckout={checkout}
      />
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {product.featured === "true" && (
        <div className="absolute left-3 top-3 z-10">
          <Badge className="flex items-center gap-1 border-0 bg-yellow-400 text-xs font-semibold text-yellow-900">
            <Star className="h-2.5 w-2.5 fill-current" /> Featured
          </Badge>
        </div>
      )}

      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl" style={{ background: productVisual(product) }}>
            {categoryEmoji(product.category)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 cursor-pointer text-sm font-semibold leading-tight text-gray-800 transition-colors hover:text-pink-600">
            {product.title}
          </h3>
          <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-xs capitalize text-purple-500">
            {categoryEmoji(product.category)} {product.category}
          </span>
        </div>

        <p className="mb-3 line-clamp-2 text-xs text-gray-400">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-pink-600">{money(product.price)}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${product.inventory > 0 ? "text-green-500" : "text-red-400"}`}>
              {product.inventory > 0 ? `${product.inventory} left` : "Out of stock"}
            </span>
            <Button
              size="sm"
              onClick={() => onAdd(product)}
              disabled={product.inventory === 0}
              className="h-8 rounded-full bg-pink-500 px-3 text-xs text-white shadow-sm hover:bg-pink-600"
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

function CartDrawer({
  open,
  cart,
  subtotal,
  shipping,
  total,
  onClose,
  onQuantity,
  onCheckout,
}: {
  open: boolean;
  cart: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  onClose: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/30 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-pink-50 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-pink-100 bg-white p-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Shopping cart</h2>
            <p className="text-sm text-gray-500">{cart.length} unique items</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full border-pink-100 bg-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center">
              <div>
                <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-pink-300" />
                <p className="font-bold text-gray-800">Your cart is empty</p>
                <p className="mt-1 text-sm text-gray-500">Add a tiny treasure to get started.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((line) => (
                <div key={line.product.id} className="rounded-3xl border border-pink-100 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl" style={{ background: productVisual(line.product) }}>
                      {categoryEmoji(line.product.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-gray-800">{line.product.title}</h3>
                      <p className="truncate text-sm text-gray-500">{line.product.category}</p>
                      <p className="mt-1 text-sm font-bold text-pink-600">{money(line.product.price)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-pink-100">
                      <button className="p-2" onClick={() => onQuantity(line.product.id, -1)}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{line.quantity}</span>
                      <button className="p-2" onClick={() => onQuantity(line.product.id, 1)}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold text-gray-800">{money(Number(line.product.price) * line.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-pink-100 bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : money(shipping)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <Button className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600" disabled={!cart.length} onClick={onCheckout}>
            Demo checkout
          </Button>
        </div>
      </aside>
    </>
  );
}
