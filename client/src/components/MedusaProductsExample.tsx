import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMedusaProducts, type MedusaProduct } from "@/lib/medusa";

export function MedusaProductsExample() {
  const [products, setProducts] = useState<MedusaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    listMedusaProducts(6)
      .then(({ products: medusaProducts }) => {
        if (!mounted) return;
        setProducts(medusaProducts);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load Medusa products.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-[#eef5f9] px-4 py-1 text-xs font-bold uppercase tracking-wide text-[#123a5a]">
            Medusa Store API example
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Products from Medusa</h2>
          <p className="mt-1 text-gray-500">This section reads from the separate Medusa ecommerce backend.</p>
        </div>
        <a href={`${import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"}/app`} target="_blank" rel="noreferrer">
          <Button variant="outline" className="rounded-full border-pink-100 bg-white">
            Medusa Admin
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </div>

      {loading && (
        <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center text-gray-500 shadow-sm">
          Loading Medusa products...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-amber-800">
          <div className="font-bold">Medusa is not connected yet.</div>
          <p className="mt-1 text-sm">
            Start the Medusa service and set <code>VITE_MEDUSA_BACKEND_URL</code> and <code>VITE_MEDUSA_PUBLISHABLE_KEY</code>.
          </p>
          <p className="mt-2 text-xs">{error}</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center text-gray-500 shadow-sm">
          No Medusa products found yet.
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
              <div className="flex h-48 items-center justify-center bg-pink-50">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl">🎁</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800">{product.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">{product.description || "No description yet."}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
