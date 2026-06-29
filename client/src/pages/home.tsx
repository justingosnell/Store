import { lazy, Suspense, useCallback, useState } from "react";
import {
  ArrowRight,
  Baby,
  LogIn,
  Menu,
  ShoppingCart,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/api";
import { useAfterInitialLoadOrInteraction } from "@/hooks/useAfterInitialLoad";
import type { Product } from "@shared/schema";
import type { CartLine, PolicyId } from "./home-dialogs";
import heroBg from "./apply-schema-fix.webp";

const HomeDialogs = lazy(() => import("./home-dialogs"));
const HomeSections = lazy(() => import("./home-sections").then((module) => ({ default: module.HomeSections })));

const floatingItems = [
  { icon: "🧸", className: "top-10 left-[6%] animate-float-gentle", delay: "0s", size: "text-6xl" },
  { icon: "⭐", className: "top-8 left-[22%] animate-twinkle", delay: "0.8s", size: "text-4xl" },
  { icon: "🌙", className: "top-4 right-[26%] animate-bounce-gentle", delay: "0.5s", size: "text-5xl" },
  { icon: "💜", className: "top-6 left-[52%] animate-float-gentle", delay: "0.3s", size: "text-4xl" },
  { icon: "🍼", className: "bottom-12 left-[12%] animate-float-sway", delay: "0.7s", size: "text-5xl" },
  { icon: "🌟", className: "bottom-8 right-[18%] animate-twinkle", delay: "1.2s", size: "text-4xl" },
  { icon: "🐰", className: "bottom-6 right-[36%] animate-bounce-gentle", delay: "2s", size: "text-5xl" },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "#shop" },
  { label: "About", href: "#about" },
];

export default function Home() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [giftBoxOpen, setGiftBoxOpen] = useState(false);
  const [giftSelections, setGiftSelections] = useState<string[]>([]);
  const [giftNote, setGiftNote] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [activePolicyId, setActivePolicyId] = useState<PolicyId | null>(null);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [lazyLoadImages, setLazyLoadImages] = useState(false);
  const canLoadSections = useAfterInitialLoadOrInteraction(1600);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const shipping = subtotal > 40 || subtotal === 0 ? 0 : 6.95;
  const total = subtotal + shipping;
  const shouldLoadDialogs = Boolean(activePolicyId || selectedProduct || giftBoxOpen || cartOpen);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [...current, { product, quantity }];
    });
    setCartOpen(true);
    setOrderPlaced(false);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  async function checkout() {
    if (!cart.length) return;
    setIsCheckingOut(true);
    setCheckoutError("");
    try {
      const response = await fetch(getApiUrl("/api/checkout/square"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          giftBox: giftSelections.length >= 3,
          giftNote: giftNote.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Checkout is unavailable");
      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout is unavailable");
    } finally {
      setIsCheckingOut(false);
    }
  }

  const addGiftBoxToCart = useCallback(() => {
    const chosen = activeProducts.filter((product) => giftSelections.includes(product.id));
    chosen.forEach((product) => addToCart(product));
    setGiftBoxOpen(false);
  }, [activeProducts, addToCart, giftSelections]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-800">
      <nav className="sticky top-0 z-50 border-b border-pink-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-400 shadow-md transition-transform group-hover:scale-110">
                <Baby className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight text-pink-700">Tiny Treasures</span>
                <span className="-mt-1 text-[10px] font-semibold uppercase tracking-widest text-purple-700">Baby Store</span>
              </div>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-700"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-700">
                Owner Login
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-700">
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="relative rounded-full text-gray-700 hover:bg-pink-50 hover:text-pink-700"
                onClick={() => setCartOpen(true)}
                aria-label={`Open shopping cart${cartCount > 0 ? ` with ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-pink-700 p-0 text-xs text-white" aria-hidden="true">
                    {cartCount > 9 ? "9+" : cartCount}
                  </Badge>
                )}
              </Button>
              <button
                type="button"
                className="rounded-full p-2 text-gray-700 hover:bg-pink-50 md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-pink-100 bg-white px-4 pb-4 pt-2 md:hidden">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-700"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <span className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-700">
                Owner Login
              </span>
            </Link>
          </div>
        )}
      </nav>

      <section className="relative flex min-h-[680px] items-center overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          aria-hidden="true"
        />
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
          <h1
            className="animate-pop-in mb-6 text-5xl font-bold leading-tight text-gray-800 md:text-7xl"
            style={{ animationDelay: "0.1s", textShadow: "2px 2px 2px rgba(255,255,255,0.9)" }}
          >
            Everything Baby,{" "}
            <span className="bg-gradient-to-r from-pink-700 via-rose-600 to-purple-700 bg-clip-text text-transparent">
              Made with Love
            </span>
          </h1>

          <p className="animate-pop-in mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-gray-600" style={{ animationDelay: "0.2s" }}>
            Discover our carefully curated collection of storybooks, toys, burp cloths, and more, all chosen with your baby's joy and safety in mind.
          </p>

          <div className="animate-pop-in flex justify-center" style={{ animationDelay: "0.35s" }}>
            <a href="#shop">
              <Button
                size="lg"
                className="animate-pulse-glow rounded-full bg-gradient-to-r from-pink-700 to-purple-700 px-10 text-base font-semibold text-white shadow-xl transition-all hover:from-pink-800 hover:to-purple-800 hover:shadow-2xl"
              >
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {canLoadSections ? (
        <Suspense fallback={<DeferredSectionsPlaceholder />}>
          <HomeSections
            orderPlaced={orderPlaced}
            onGiftBoxOpen={() => setGiftBoxOpen(true)}
            onProductAdd={addToCart}
            onProductView={setSelectedProduct}
            onPolicyChange={setActivePolicyId}
            onActiveProductsChange={setActiveProducts}
            onLazyLoadImagesChange={setLazyLoadImages}
          />
        </Suspense>
      ) : (
        <DeferredSectionsPlaceholder />
      )}

      {shouldLoadDialogs && (
        <Suspense fallback={null}>
          <HomeDialogs
            activePolicyId={activePolicyId}
            onPolicyChange={setActivePolicyId}
            selectedProduct={selectedProduct}
            onSelectedProductChange={setSelectedProduct}
            giftBoxOpen={giftBoxOpen}
            onGiftBoxOpenChange={setGiftBoxOpen}
            giftSelections={giftSelections}
            onGiftSelectionsChange={setGiftSelections}
            giftNote={giftNote}
            onGiftNoteChange={setGiftNote}
            cartOpen={cartOpen}
            cart={cart}
            activeProducts={activeProducts}
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            onAddToCart={addToCart}
            onAddGiftBoxToCart={addGiftBoxToCart}
            onCloseCart={() => setCartOpen(false)}
            onQuantity={updateQuantity}
            onCheckout={checkout}
            isCheckingOut={isCheckingOut}
            checkoutError={checkoutError}
            lazyLoadImages={lazyLoadImages}
          />
        </Suspense>
      )}
    </main>
  );
}

function DeferredSectionsPlaceholder() {
  return (
    <div aria-hidden="true">
      <section id="shop" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-pink-100 bg-white p-10 text-center text-gray-700 shadow-sm">
          Loading products...
        </div>
      </section>
      <section id="about" className="mt-20 h-24 border-t border-pink-100 bg-rose-50/60" />
    </div>
  );
}
