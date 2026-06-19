const medusaBackendUrl = import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000";
const medusaPublishableKey = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY || "";

export type MedusaProduct = {
  id: string;
  title: string;
  handle?: string;
  description?: string | null;
  thumbnail?: string | null;
};

type MedusaProductsResponse = {
  products: MedusaProduct[];
  count: number;
  limit: number;
  offset: number;
};

function getMedusaUrl(path: string) {
  return `${medusaBackendUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function medusaStoreRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (medusaPublishableKey) {
    headers.set("x-publishable-api-key", medusaPublishableKey);
  }

  const response = await fetch(getMedusaUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Medusa request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function listMedusaProducts(limit = 6, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return medusaStoreRequest<MedusaProductsResponse>(`/store/products?${params.toString()}`);
}
