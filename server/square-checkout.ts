import crypto from "crypto";
import type { Product } from "@shared/schema";

export type CheckoutLine = { product: Product; quantity: number };

export function priceCart(lines: CheckoutLine[]) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + Math.round(Number(line.product.price) * 100) * line.quantity,
    0,
  );
  const shippingCents = subtotalCents >= 4000 ? 0 : 695;
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

export async function createSquarePaymentLink(input: {
  lines: CheckoutLine[];
  giftBox?: boolean;
  giftNote?: string;
}) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) throw new Error("Square checkout is not configured");
  const environment = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const baseUrl = environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  const { shippingCents } = priceCart(input.lines);
  const lineItems = input.lines.map(({ product, quantity }) => ({
    name: product.title.substring(0, 255),
    quantity: String(quantity),
    base_price_money: { amount: Math.round(Number(product.price) * 100), currency: "USD" },
    note: input.giftBox ? "Build-your-own gift box item" : undefined,
  }));
  if (shippingCents) {
    lineItems.push({
      name: "Shipping",
      quantity: "1",
      base_price_money: { amount: shippingCents, currency: "USD" },
      note: undefined,
    });
  }
  const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      description: input.giftBox ? "Tiny Treasures custom gift box" : "Tiny Treasures order",
      order: { location_id: locationId, line_items: lineItems },
      checkout_options: {
        ask_for_shipping_address: true,
        redirect_url: process.env.SQUARE_REDIRECT_URL || process.env.FRONTEND_URL || "http://localhost:3000/?checkout=success",
      },
      payment_note: input.giftNote?.substring(0, 500),
    }),
  });
  const data = await response.json() as any;
  if (!response.ok || !data.payment_link?.url) {
    throw new Error(data.errors?.[0]?.detail || "Square could not create checkout");
  }
  return { url: data.payment_link.url, orderId: data.payment_link.order_id };
}
