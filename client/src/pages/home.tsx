import { useEffect, useRef, useState } from "react";
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
  LogIn,
  Menu,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiUrl } from "@/lib/api";
import type { Product } from "@shared/schema";
import heroBg from "./apply-schema-fix.webp";

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
  { icon: "🌙", className: "top-4 right-[26%] animate-bounce-gentle", delay: "0.5s", size: "text-5xl" },
  { icon: "💜", className: "top-6 left-[52%] animate-float-gentle", delay: "0.3s", size: "text-4xl" },
  { icon: "🍼", className: "bottom-12 left-[12%] animate-float-sway", delay: "0.7s", size: "text-5xl" },
  { icon: "🌟", className: "bottom-8 right-[18%] animate-twinkle", delay: "1.2s", size: "text-4xl" },
  { icon: "🐰", className: "bottom-6 right-[36%] animate-bounce-gentle", delay: "2s", size: "text-5xl" },
];

const defaultFacebookReviewUrl = "https://www.facebook.com/your-page/reviews";
const productCardSizes = "(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw";
const productDetailSizes = "(min-width: 768px) 50vw, 100vw";

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

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "#shop" },
  { label: "About", href: "#about" },
];

const policyLinks = [
  {
    id: "returns",
    title: "Shipping and Returns Policy",
    summary: "Thank you for supporting our small, independent shop!",
    content: [
      "Because our burp cloths and swaddles are individually handmade, we treat every single package with extra care. Please review our shipping and return rules below.",
      "1. Order Processing Times",
      "All of our items are prepared, inspected, and packaged in-house.",
      "Standard orders typically take [Insert Processing Time, e.g., 2-4 business days] to be processed and handed over to the shipping carrier.",
      'If you purchase an item listed as "Made to Order," please refer to the specific timeline noted on that product\'s page.',
      "2. Shipping Rates & Delivery",
      "Shipping costs are calculated at checkout based on the weight of the items and your delivery address.",
      "Once your package ships, you will receive an automated email with your tracking number.",
      "Barefeet and Dandelions is not responsible for shipping carrier delays, packages lost in transit by the carrier, or items stolen after confirmed delivery.",
      "3. Returns and Exchanges",
      "Because our items are designed for infants and newborns, we maintain strict hygiene and safety standards:",
      "Eligibility: We accept returns on unwashed, unused, and undamaged storybooks, burp cloths, and swaddles within 30 days of the delivery date. Items must be returned in their original packaging.",
      "Hygiene Exception: For safety reasons, any fabric item that shows signs of use, has been washed, or is missing its original tags cannot be returned or refunded.",
      "Return Shipping: Customers are responsible for all return shipping costs unless the return is a result of our error (e.g., you received the wrong item). We recommend using a trackable shipping service, as we cannot guarantee that we will receive your returned item.",
      "4. Handmade Variations",
      'Please note that because our burp cloths and swaddles are handmade, slight variations in fabric pattern placement, dimensions, and stitching are natural characteristics of the craft. These variations do not constitute product defects and are not eligible for "damaged goods" free return shipping.',
      "5. Damaged or Incorrect Items",
      "If your storybook arrives bent or a handmade item has a legitimate structural defect, please contact us at [Your Contact Email] within 48 hours of delivery. Please include your order number and a clear photo of the damage so we can quickly ship out a replacement for you.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    summary: "Effective Date: June 27, 2026",
    content: [
      "At Barefeet and Dandelions LLC, we respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy explains how our custom website collects, uses, discloses, and safeguards your information when you visit our website and purchase our handmade baby gifts, storybooks, and swaddles.",
      "1. Information We Collect",
      "We collect information that you directly provide to us when you make a purchase, create an account, or contact us. This includes:",
      "Identifiers: Your name, shipping address, billing address, email address, and phone number.",
      "Session and Technical Data: Because this website is an independent custom-built application, our Express backend utilizes local storage, cookies, or secure server sessions to maintain your shopping cart, remember user sessions, and secure our checkout flow. We may automatically collect your IP address, browser type, and device information for security and site optimization.",
      "2. Payment Processing & Third-Party Disclosure",
      "We do not store or process your raw credit or debit card information on our servers. All payments are securely handled directly through our third-party payment processor, [Square](https://squareup.com/us/en).",
      "Square collects your financial details directly.",
      "Their use of your personal information is governed by Square's own Privacy Policy.",
      "Our Express backend only receives a secure token and confirmation from Square to verify that your payment was successful.",
      "3. How We Use Your Information",
      "We use the information we collect solely to:",
      "Process, fulfill, and ship your orders.",
      "Maintain your custom session and shopping cart persistence.",
      "Communicate with you regarding order updates or customer service inquiries.",
      "Detect, prevent, and mitigate security threats or technical glitches on our custom platform.",
      "4. Data Retention and Security",
      "We implement industry-standard security measures, including HTTPS encryption for all data transit, to protect your personal identifiers. However, because no method of transmission over the internet or electronic storage is 100% secure, we cannot guarantee absolute data security. We retain your order history information only as long as necessary to fulfill tax, legal, and accounting obligations.",
      "5. Contact Us",
      "If you have any questions or concerns about this Privacy Policy or how your data is handled on our platform, please contact us at: [Your Contact Email].",
    ],
  },
  {
    id: "terms",
    title: "Terms of Service",
    summary: "Effective Date: June 27, 2026",
    content: [
      "Welcome to [Your Shop Name]. This website, located at [Your Website URL], is an independently developed, custom-coded web application. Throughout the site, the terms \"we,\" \"us,\" and \"our\" refer to [Your Shop Name]. By visiting our site and purchasing handmade burp cloths, storybooks, or swaddles from us, you engage in our \"Service\" and agree to be bound by the following terms and conditions (\"Terms of Service\", \"Terms\").",
      "Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services.",
      "1. Online Store Terms",
      "By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose, nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws). You must not transmit any worms, viruses, or any code of a destructive nature to our Node.js and Express backend server. A breach or violation of any of the Terms will result in an immediate termination of your Services.",
      "2. Intellectual Property & Custom Code Protection",
      "All content included on this website-such as text, custom graphics, logos, button icons, images, digital book previews, fabric designs, and the underlying custom React frontend and Node.js backend source code-is the property of [Your Shop Name] and is protected by international copyright, trademark, and proprietary rights laws.",
      "You agree not to reproduce, duplicate, copy, sell, resell, exploit, or reverse-engineer any portion of the Service, use of the Service, access to the Service, or any contact on the website through which the service is provided, without express written permission by us.",
      "3. Accuracy of Billing and Account Information",
      "We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order.",
      "All payment transactions are processed securely via our third-party payment processor, Square. By initiating a purchase, you agree to provide current, complete, and accurate purchase and account information.",
      "We are not liable for any payment processing failures, currency conversion discrepancies, or security issues that occur on Square's external platform.",
      "4. Products and Handmade Modifications",
      "Certain products, such as our handmade swaddles and burp cloths, are available exclusively online through the website. We have made every effort to display as accurately as possible the colors and images of our products. We cannot guarantee that your computer monitor's display of any color will be completely accurate.",
      "Prices for our products are subject to change without notice.",
      "We reserve the right at any time to modify or discontinue a product (or any part thereof) without notice. We shall not be liable to you or to any third-party for any modification, price change, suspension, or discontinuance of products.",
      "5. Technical Disclaimer and Limitation of Liability",
      "Because this website is a custom-built web application independent of standard commercial content management systems, it is provided on an \"as is\" and \"as available\" basis.",
      "We do not guarantee, represent, or warrant that your use of our service will be uninterrupted, timely, secure, or error-free.",
      "We are not responsible for database connection drops, checkout script errors, API timeouts with third parties, or server downtime affecting our Express backend.",
      "In no case shall [Your Shop Name], our directors, officers, employees, or creators be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages of any kind, including, without limitation, lost profits, lost revenue, lost savings, loss of data, or any similar damages, whether based in contract, tort (including negligence), strict liability or otherwise, arising from your use of any of the service or any products procured using the service.",
      "6. Product Safety and Indemnification",
      "Our products are intended for infants but must always be used under direct, responsible adult supervision. You agree to indemnify, defend, and hold harmless [Your Shop Name] from any claim or demand, including reasonable attorneys' fees, made by any third-party due to or arising out of your misuse of our handmade products, failure to follow infant safety guidelines, or your violation of these Terms of Service.",
      "7. Governing Law",
      "These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of the jurisdiction in which [Your Shop Name] operates.",
      "8. Changes to Terms of Service",
      "You can review the most current version of the Terms of Service at any time on this page. We reserve the right, at our sole discretion, to update, change, or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes.",
      "9. Contact Information",
      "Questions about the Terms of Service should be sent to us at: [Your Contact Email].",
    ],
  },
  {
    id: "payments",
    title: "Third-Party Payment Processor Disclaimer",
    summary: "Our online store uses Square to securely process online payments.",
    content: [
      "When you make a purchase through our website, your payment information is transmitted directly to Square for processing using industry-standard encryption and security practices.",
      "We do not collect, store, or have access to your full credit card, debit card, or other financial account information. All payment transactions are processed by Square in accordance with its own security standards, privacy practices, and terms of service.",
      "By completing a purchase, you acknowledge and agree that:",
      "Your payment information will be processed by Square.",
      "Your use of Square's payment services is subject to Square's Terms of Service and Privacy Policy.",
      "We are not responsible for payment processing errors, transaction delays, declined payments, service interruptions, fraud prevention decisions, or other issues arising from Square's payment processing systems.",
      "We are not liable for any unauthorized transactions, data breaches, or security incidents occurring within Square's systems, except as required by applicable law.",
      "If you experience a payment-related issue, please contact us first so we can assist you. However, certain matters-including payment authorization, chargebacks, fraud reviews, and transaction processing-may ultimately be handled by Square or your financial institution.",
      "By placing an order through our website, you acknowledge that your payment will be processed by Square and that you have had the opportunity to review Square's applicable Terms of Service and Privacy Policy.",
    ],
  },
] as const;

type PolicyId = (typeof policyLinks)[number]["id"];

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

function getProductImages(product: Product): string[] {
  let gallery: string[] = [];
  try {
    const parsed = JSON.parse(product.imageUrls || "[]");
    if (Array.isArray(parsed)) {
      gallery = parsed.filter((url): url is string => typeof url === "string" && Boolean(url.trim()));
    }
  } catch {
    gallery = [];
  }
  return Array.from(new Set([product.imageUrl, ...gallery].filter(Boolean)));
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

function isPolicyHeading(paragraph: string) {
  return /^\d+\.\s/.test(paragraph);
}

function renderPolicyText(paragraph: string) {
  const match = paragraph.match(/^(.*)\[([^\]]+)\]\((https?:\/\/[^)]+)\)(.*)$/);
  if (!match) return paragraph;

  const [, before, label, href, after] = match;
  return (
    <>
      {before}
      <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-pink-800 underline underline-offset-4 hover:text-pink-900">
        {label}
      </a>
      {after}
    </>
  );
}

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
  const reviewSliderRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/products"));
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to fetch store settings");
      return response.json();
    },
  });

  const activeProducts = products.filter((product) => product.status === "active");
  const featuredProducts = activeProducts.filter((product) => product.featured === "true");
  const lazyLoadImages = siteSettings.lazy_load_below_fold_images === "true";
  const facebookReviewUrl = siteSettings.facebook_reviews_url || defaultFacebookReviewUrl;

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const shipping = subtotal > 40 || subtotal === 0 ? 0 : 6.95;
  const total = subtotal + shipping;
  const activePolicy = policyLinks.find((policy) => policy.id === activePolicyId);

  function addToCart(product: Product, quantity = 1) {
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

  function addGiftBoxToCart() {
    const chosen = activeProducts.filter((product) => giftSelections.includes(product.id));
    chosen.forEach((product) => addToCart(product));
    setGiftBoxOpen(false);
  }

  function scrollReviews(direction: "left" | "right") {
    reviewSliderRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

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

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-purple-50 p-6 shadow-sm ring-1 ring-pink-100 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-700">Make it personal</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Build your own gift box</h2>
              <p className="mt-3 max-w-2xl text-gray-600">Choose at least three treasures, add a personal note, and we’ll prepare them together as a thoughtful gift.</p>
            </div>
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-pink-700 to-purple-700 px-8 text-white shadow-xl hover:from-pink-800 hover:to-purple-800"
              onClick={() => setGiftBoxOpen(true)}
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

        {isLoading ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-10 text-center text-gray-700 shadow-sm">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                onView={setSelectedProduct}
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
                    onClick={() => setActivePolicyId(policy.id)}
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

      <Dialog open={Boolean(activePolicy)} onOpenChange={(open) => !open && setActivePolicyId(null)}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-2xl">
          {activePolicy && (
            <>
              <DialogHeader>
                <DialogTitle>{activePolicy.title}</DialogTitle>
                <DialogDescription>{activePolicy.summary}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 p-5 text-sm leading-6 text-gray-600">
                {"content" in activePolicy ? (
                  <div className="space-y-4">
                    {activePolicy.content.map((paragraph) => (
                      <p key={paragraph} className={isPolicyHeading(paragraph) ? "font-bold text-gray-900" : undefined}>
                        {renderPolicyText(paragraph)}
                      </p>
                    ))}
                  </div>
                ) : (
                  "Policy content coming soon."
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ProductDetailsDialog
        product={selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onAdd={(product, quantity) => {
          setSelectedProduct(null);
          addToCart(product, quantity);
        }}
        lazyLoadImages={lazyLoadImages}
      />

      <Dialog open={giftBoxOpen} onOpenChange={setGiftBoxOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Build your gift box</DialogTitle>
            <DialogDescription>Select at least three products. Your note will be included with the Square order.</DialogDescription>
          </DialogHeader>
          <fieldset>
            <legend className="sr-only">Gift box products</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeProducts.map((product) => {
                const selected = giftSelections.includes(product.id);
                return (
                  <label key={product.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${selected ? "border-pink-500 bg-pink-50" : "border-gray-200"}`}>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-pink-500"
                      checked={selected}
                      onChange={() => setGiftSelections((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])}
                    />
                    <span>
                      <span className="block font-semibold text-gray-900">{product.title}</span>
                      <span className="text-sm text-gray-600">{money(product.price)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label htmlFor="gift-note" className="mb-2 block text-sm font-semibold">Gift note</label>
            <Textarea id="gift-note" maxLength={500} value={giftNote} onChange={(event) => setGiftNote(event.target.value)} placeholder="Write a warm message for the recipient…" />
          </div>
          <Button
            className="min-h-12 rounded-full bg-gradient-to-r from-pink-700 to-purple-700 text-white"
            disabled={giftSelections.length < 3}
            onClick={addGiftBoxToCart}
          >
            Add {giftSelections.length} Items to Cart
          </Button>
        </DialogContent>
      </Dialog>

      <CartDrawer
        open={cartOpen}
        cart={cart}
        subtotal={subtotal}
        shipping={shipping}
        total={total}
        onClose={() => setCartOpen(false)}
        onQuantity={updateQuantity}
        onCheckout={checkout}
        isCheckingOut={isCheckingOut}
        checkoutError={checkoutError}
      />
    </main>
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

function ProductDetailsDialog({
  product,
  onOpenChange,
  onAdd,
  lazyLoadImages,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Product, quantity: number) => void;
  lazyLoadImages: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setQuantity(1);
    setDescriptionExpanded(false);
    setActiveImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (descriptionExpanded) {
      descriptionRef.current?.focus();
    }
  }, [descriptionExpanded]);

  const compareAtPrice = Number(product?.compareAtPrice || 0);
  const price = Number(product?.price || 0);
  const isOnSale = compareAtPrice > price;
  const description = product?.description || "No description is available for this product.";
  const hasLongDescription = description.length > 180;
  const images = product ? getProductImages(product) : [];
  const activeImage = images[activeImageIndex];
  const activeImageSrc = activeImage ? getOptimizedImageUrl(activeImage, 1200) : "";
  const activeImageSrcSet = activeImage ? getImageSrcSet(activeImage, [640, 960, 1200, 1600]) : undefined;

  function showPreviousImage() {
    setActiveImageIndex((current) => (current - 1 + images.length) % images.length);
  }

  function showNextImage() {
    setActiveImageIndex((current) => (current + 1) % images.length);
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto overscroll-contain border-0 p-0 shadow-2xl sm:max-h-[92vh] sm:max-w-4xl sm:rounded-none">
        {product && (
          <div className="grid bg-white md:grid-cols-2">
            <div className="bg-[#f7f7f7] p-3 sm:p-5">
              <div className="relative flex aspect-square max-h-[58dvh] items-center justify-center overflow-hidden bg-white md:max-h-[620px]">
                {activeImage ? (
                  <img
                    src={activeImageSrc}
                    srcSet={activeImageSrcSet}
                    sizes={productDetailSizes}
                    alt={`${product.title}, view ${activeImageIndex + 1} of ${images.length}`}
                    className="h-full w-full object-contain p-2 sm:p-4"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-8xl"
                    style={{ background: productVisual(product) }}
                    role="img"
                    aria-label={`${product.title} placeholder image`}
                  >
                    <span aria-hidden="true">{categoryEmoji(product.category)}</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-gray-900 shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                      onClick={showPreviousImage}
                      aria-label="Show previous product image"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-gray-900 shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                      onClick={showNextImage}
                      aria-label="Show next product image"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Product image thumbnails">
                  {images.map((url, index) => (
                    <div key={url} role="listitem" className="shrink-0">
                      <button
                        type="button"
                        className={`h-16 w-16 overflow-hidden border-2 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                          activeImageIndex === index ? "border-pink-500" : "border-transparent"
                        }`}
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={`Show product image ${index + 1} of ${images.length}`}
                        aria-current={activeImageIndex === index ? "true" : undefined}
                      >
                        <img
                          src={getOptimizedImageUrl(url, 160)}
                          alt=""
                          className="h-full w-full object-contain"
                          loading={lazyLoadImages ? "lazy" : "eager"}
                          decoding="async"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col px-5 pb-8 pt-6 sm:px-10 sm:py-12">
              <DialogHeader className="space-y-0 text-left">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-700">
                  Tiny Treasures
                </p>
                <DialogTitle className="pr-8 text-2xl font-normal leading-tight text-[#121212] sm:text-3xl">
                  {product.title}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-5 flex items-center gap-3">
                <p className="text-lg font-normal text-[#121212]">
                  <span className="sr-only">{isOnSale ? "Sale price: " : "Price: "}</span>
                  {money(product.price)}
                </p>
                {isOnSale && (
                  <>
                    <p className="text-sm text-gray-700 line-through">
                      <span className="sr-only">Regular price: </span>
                      {money(compareAtPrice)}
                    </p>
                    <span className="rounded-full bg-[#334fb4] px-3 py-1 text-[10px] uppercase tracking-wider text-white">
                      Sale
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-700">Shipping calculated at checkout.</p>

              <div className="mt-7">
                <DialogDescription
                  ref={descriptionRef}
                  id="product-description"
                  tabIndex={descriptionExpanded ? 0 : undefined}
                  aria-label={descriptionExpanded ? "Full product description. Scroll to read more." : undefined}
                  className={`text-sm leading-7 text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 ${
                    descriptionExpanded
                      ? "max-h-36 overflow-y-auto overscroll-contain pr-3"
                      : hasLongDescription
                        ? "line-clamp-3"
                        : ""
                  }`}
                >
                  {description}
                </DialogDescription>

                {hasLongDescription && (
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
                    aria-expanded={descriptionExpanded}
                    aria-controls="product-description"
                    onClick={() => setDescriptionExpanded((current) => !current)}
                  >
                    {descriptionExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>

              <fieldset className="mt-8">
                <legend className="mb-2 text-sm text-[#121212]">Quantity</legend>
                <div className="flex h-12 w-40 items-center border border-gray-500" role="group" aria-label="Choose quantity">
                  <button
                    type="button"
                    className="grid h-full min-w-12 place-items-center text-xl text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#121212] disabled:cursor-not-allowed disabled:text-gray-300"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <output className="flex-1 text-center text-sm text-[#121212]" aria-live="polite" aria-atomic="true">
                    <span className="sr-only">Quantity: </span>
                    {quantity}
                  </output>
                  <button
                    type="button"
                    className="grid h-full min-w-12 place-items-center text-xl text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#121212] disabled:cursor-not-allowed disabled:text-gray-300"
                    onClick={() => setQuantity((current) => Math.min(product.inventory, current + 1))}
                    disabled={quantity >= product.inventory}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </fieldset>

              <div className="mt-6">
                <Button
                  className="animate-pulse-glow min-h-12 w-full rounded-full bg-gradient-to-r from-pink-700 to-purple-700 px-8 py-3 text-base font-semibold text-white shadow-xl transition-all hover:from-pink-800 hover:to-purple-800 hover:shadow-2xl focus-visible:ring-pink-700 motion-reduce:animate-none"
                  onClick={() => onAdd(product, quantity)}
                  disabled={product.inventory === 0}
                >
                  {product.inventory > 0 ? (
                    <>
                      Add to Cart <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </>
                  ) : (
                    "Sold Out"
                  )}
                </Button>
              </div>

              <p
                className={`mt-4 text-xs ${product.inventory > 0 ? "text-green-700" : "text-red-700"}`}
                role="status"
              >
                {product.inventory > 0 ? `${product.inventory} available` : "Currently unavailable"}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  isCheckingOut,
  checkoutError,
}: {
  open: boolean;
  cart: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  onClose: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
  checkoutError: string;
}) {
  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/30 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-pink-50 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-pink-100 bg-white p-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Shopping cart</h2>
            <p className="text-sm text-gray-700">{cart.length} unique items</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full border-pink-100 bg-white" onClick={onClose} aria-label="Close shopping cart">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center">
              <div>
                <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-pink-700" />
                <p className="font-bold text-gray-800">Your cart is empty</p>
                <p className="mt-1 text-sm text-gray-700">Add a tiny treasure to get started.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((line) => {
                const cartImageUrl = getProductImages(line.product)[0];
                const cartImageSrc = cartImageUrl ? getOptimizedImageUrl(cartImageUrl, 160) : "";
                return (
                  <div key={line.product.id} className="rounded-3xl border border-pink-100 bg-white p-3 shadow-sm">
                    <div className="flex gap-3">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 text-3xl">
                        {cartImageUrl ? (
                          <img
                            src={cartImageSrc}
                            alt={line.product.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center"
                            style={{ background: productVisual(line.product) }}
                            aria-hidden="true"
                          >
                            {categoryEmoji(line.product.category)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-gray-800">{line.product.title}</h3>
                        <p className="truncate text-sm text-gray-700">{line.product.category}</p>
                        <p className="mt-1 text-sm font-bold text-pink-700">{money(line.product.price)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-pink-100">
                        <button type="button" className="p-2" onClick={() => onQuantity(line.product.id, -1)} aria-label={`Decrease quantity for ${line.product.title}`}>
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{line.quantity}</span>
                        <button type="button" className="p-2" onClick={() => onQuantity(line.product.id, 1)} aria-label={`Increase quantity for ${line.product.title}`}>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="font-bold text-gray-800">{money(Number(line.product.price) * line.quantity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-pink-100 bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : money(shipping)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          </div>
          {checkoutError && <p className="mt-3 text-sm text-red-700" role="alert">{checkoutError}</p>}
          <Button className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-700 to-purple-700 text-white hover:from-pink-800 hover:to-purple-800" disabled={!cart.length || isCheckingOut} onClick={onCheckout}>
            {isCheckingOut ? "Opening Square…" : "Secure Checkout with Square"}
          </Button>
        </div>
      </aside>
    </>
  );
}
