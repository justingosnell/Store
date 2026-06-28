import test from "node:test";
import assert from "node:assert/strict";
import { priceCart } from "./square-checkout";

const product = (price: string) => ({ price } as any);

test("priceCart adds shipping below $40", () => {
  assert.deepEqual(priceCart([{ product: product("12.00"), quantity: 2 }]), {
    subtotalCents: 2400, shippingCents: 695, totalCents: 3095,
  });
});

test("priceCart grants free shipping at $40", () => {
  assert.equal(priceCart([{ product: product("20.00"), quantity: 2 }]).shippingCents, 0);
});
