import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@shared/schema";

export type CartLine = {
  product: Product;
  quantity: number;
};

export type PolicyId = "returns" | "privacy" | "terms" | "payments";

type HomeDialogsProps = {
  activePolicyId: PolicyId | null;
  onPolicyChange: (id: PolicyId | null) => void;
  selectedProduct: Product | null;
  onSelectedProductChange: (product: Product | null) => void;
  giftBoxOpen: boolean;
  onGiftBoxOpenChange: (open: boolean) => void;
  giftSelections: string[];
  onGiftSelectionsChange: React.Dispatch<React.SetStateAction<string[]>>;
  giftNote: string;
  onGiftNoteChange: (note: string) => void;
  cartOpen: boolean;
  cart: CartLine[];
  activeProducts: Product[];
  subtotal: number;
  shipping: number;
  total: number;
  onAddToCart: (product: Product, quantity?: number) => void;
  onAddGiftBoxToCart: () => void;
  onCloseCart: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
  checkoutError: string;
  lazyLoadImages: boolean;
};

const productDetailSizes = "(min-width: 768px) 50vw, 100vw";

const categories = [
  { name: "Baby Books", emoji: "📚" },
  { name: "Toys", emoji: "🧸" },
  { name: "Burp Cloths", emoji: "🍼" },
  { name: "Gift Sets", emoji: "🎁" },
  { name: "Feeding", emoji: "🥄" },
  { name: "Bath Time", emoji: "🛁" },
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

export default function HomeDialogs({
  activePolicyId,
  onPolicyChange,
  selectedProduct,
  onSelectedProductChange,
  giftBoxOpen,
  onGiftBoxOpenChange,
  giftSelections,
  onGiftSelectionsChange,
  giftNote,
  onGiftNoteChange,
  cartOpen,
  cart,
  activeProducts,
  subtotal,
  shipping,
  total,
  onAddToCart,
  onAddGiftBoxToCart,
  onCloseCart,
  onQuantity,
  onCheckout,
  isCheckingOut,
  checkoutError,
  lazyLoadImages,
}: HomeDialogsProps) {
  const activePolicy = policyLinks.find((policy) => policy.id === activePolicyId);

  return (
    <>
      <PolicyDialog activePolicy={activePolicy} onPolicyChange={onPolicyChange} />
      <ProductDetailsDialog
        product={selectedProduct}
        onOpenChange={(open) => {
          if (!open) onSelectedProductChange(null);
        }}
        onAdd={(product, quantity) => {
          onSelectedProductChange(null);
          onAddToCart(product, quantity);
        }}
        lazyLoadImages={lazyLoadImages}
      />
      <GiftBoxDialog
        open={giftBoxOpen}
        activeProducts={activeProducts}
        giftSelections={giftSelections}
        onGiftSelectionsChange={onGiftSelectionsChange}
        giftNote={giftNote}
        onGiftNoteChange={onGiftNoteChange}
        onOpenChange={onGiftBoxOpenChange}
        onAddGiftBoxToCart={onAddGiftBoxToCart}
      />
      <CartDrawer
        open={cartOpen}
        cart={cart}
        subtotal={subtotal}
        shipping={shipping}
        total={total}
        onClose={onCloseCart}
        onQuantity={onQuantity}
        onCheckout={onCheckout}
        isCheckingOut={isCheckingOut}
        checkoutError={checkoutError}
      />
    </>
  );
}

function PolicyDialog({
  activePolicy,
  onPolicyChange,
}: {
  activePolicy: (typeof policyLinks)[number] | undefined;
  onPolicyChange: (id: PolicyId | null) => void;
}) {
  return (
    <Dialog open={Boolean(activePolicy)} onOpenChange={(open) => !open && onPolicyChange(null)}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl">
        {activePolicy && (
          <>
            <DialogHeader>
              <DialogTitle>{activePolicy.title}</DialogTitle>
              <DialogDescription>{activePolicy.summary}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 p-5 text-sm leading-6 text-gray-600">
              <div className="space-y-4">
                {activePolicy.content.map((paragraph) => (
                  <p key={paragraph} className={isPolicyHeading(paragraph) ? "font-bold text-gray-900" : undefined}>
                    {renderPolicyText(paragraph)}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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

function GiftBoxDialog({
  open,
  activeProducts,
  giftSelections,
  onGiftSelectionsChange,
  giftNote,
  onGiftNoteChange,
  onOpenChange,
  onAddGiftBoxToCart,
}: {
  open: boolean;
  activeProducts: Product[];
  giftSelections: string[];
  onGiftSelectionsChange: React.Dispatch<React.SetStateAction<string[]>>;
  giftNote: string;
  onGiftNoteChange: (note: string) => void;
  onOpenChange: (open: boolean) => void;
  onAddGiftBoxToCart: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    onChange={() => onGiftSelectionsChange((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])}
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
          <Textarea id="gift-note" maxLength={500} value={giftNote} onChange={(event) => onGiftNoteChange(event.target.value)} placeholder="Write a warm message for the recipient..." />
        </div>
        <Button
          className="min-h-12 rounded-full bg-gradient-to-r from-pink-700 to-purple-700 text-white"
          disabled={giftSelections.length < 3}
          onClick={onAddGiftBoxToCart}
        >
          Add {giftSelections.length} Items to Cart
        </Button>
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
            {isCheckingOut ? "Opening Square..." : "Secure Checkout with Square"}
          </Button>
        </div>
      </aside>
    </>
  );
}
