import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { CategoryFilter, type CategoryType } from "@/components/CategoryFilter";
import { StateFilter } from "@/components/StateFilter";
import { USMap } from "@/components/USMap";
import { PhotoPanel } from "@/components/PhotoPanel";
import { getApiUrl } from "@/lib/api";
import type { Location, Category } from "@shared/schema";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Fetch locations from API
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/locations"));
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  // Fetch categories from API
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/categories"));
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const filteredLocations = useMemo(() => {
    let filtered = locations;

    if (activeCategory !== "all") {
      filtered = filtered.filter((loc) => loc.category === activeCategory);
    }

    if (selectedState) {
      filtered = filtered.filter((loc) => loc.state === selectedState);
    }

    return filtered;
  }, [locations, activeCategory, selectedState]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: locations.length };
    
    // Dynamically count locations for each category
    categories.forEach((cat) => {
      counts[cat.slug] = locations.filter(loc => loc.category === cat.slug).length;
    });
    
    return counts;
  }, [locations, categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />

      <main id="main-content" className="flex-1 overflow-hidden" role="main">
        <div className="h-full flex flex-col md:flex-row gap-0">
          <aside 
            className="md:w-1/4 bg-background border-r overflow-hidden" 
            role="complementary" 
            aria-label="Category filters"
          >
            <CategoryFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              categoryCounts={categoryCounts}
              categories={categories}
            />
          </aside>

          <section className="md:w-2/4 relative" aria-label="Interactive map">
            <USMap
              locations={filteredLocations}
              activeCategory={activeCategory}
              selectedLocation={selectedLocation}
              onLocationClick={setSelectedLocation}
            />
          </section>

          <aside 
            className="md:w-1/4 bg-background border-l overflow-hidden" 
            role="complementary" 
            aria-label="State filters"
          >
            <StateFilter
              selectedState={selectedState}
              onStateChange={setSelectedState}
            />
          </aside>
        </div>
      </main>

      <PhotoPanel
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </div>
  );
}
