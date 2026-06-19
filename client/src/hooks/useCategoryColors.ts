import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import type { Category } from "@shared/schema";

export function useCategoryColors() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/categories"));
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getColorBySlug = (slug: string): string => {
    const category = categories.find(cat => cat.slug === slug);
    return category?.color || "#f97316"; // Default orange
  };

  const getCategoryMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      map[cat.slug] = cat.color;
    });
    return map;
  };

  return { categories, getColorBySlug, getCategoryMap };
}