import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@shared/schema";

export type CategoryType = string;

interface CategoryFilterProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  categoryCounts: Record<string, number>;
  categories?: Category[];
}

export function CategoryFilter({
  activeCategory,
  onCategoryChange,
  categoryCounts,
  categories = [],
}: CategoryFilterProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="luckiest-guy-regular text-xl font-semibold">Tagged Places</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Filter by attraction type
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <Button
          variant={activeCategory === "all" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => onCategoryChange("all")}
          data-testid="button-category-all"
        >
          <MapPin className="h-4 w-4 mr-2" />
          All Locations
          <Badge variant="secondary" className="ml-auto">
            {categoryCounts.all ?? 0}
          </Badge>
        </Button>

        {categories.map((category) => (
          <Button
            key={category.slug}
            variant={activeCategory === category.slug ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onCategoryChange(category.slug)}
            data-testid={`button-category-${category.slug}`}
          >
            <span className="mr-2 text-base">{category.icon}</span>
            {category.name}
            <Badge variant="secondary" className="ml-auto">
              {categoryCounts[category.slug] ?? 0}
            </Badge>
          </Button>
        ))}
      </div>

      {activeCategory !== "all" && (
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onCategoryChange("all")}
            data-testid="button-clear-category"
          >
            Clear Filter
          </Button>
        </div>
      )}
    </div>
  );
}
