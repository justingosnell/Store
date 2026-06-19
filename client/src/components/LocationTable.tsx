import { Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RibbonBadge } from "@/components/RibbonBadge";
import { useCategoryColors } from "@/hooks/useCategoryColors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Location } from "@shared/schema";

interface LocationTableProps {
  locations: Location[];
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
  onLocationClick: (location: Location) => void;
  onToggleBookmark: (id: string) => void;
}

export function LocationTable({ locations, onEdit, onDelete, onLocationClick, onToggleBookmark }: LocationTableProps) {
  const { categories } = useCategoryColors();

  // Create a map of category slug to category object for quick lookup
  const categoryMap = categories.reduce((map, cat) => {
    map[cat.slug] = cat;
    return map;
  }, {} as Record<string, typeof categories[0]>);

  const getCategoryLabel = (slug: string) => {
    return categoryMap[slug]?.name || slug;
  };

  const getCategoryColor = (slug: string) => {
    return categoryMap[slug]?.color || "#f97316";
  };

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No locations found</p>
        <p className="text-sm mt-2">Click "Add Location" to create your first location</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="rounded-md border min-w-full inline-block align-middle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell>
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={location.photoUrl}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="max-w-[200px] sm:max-w-xs">
                    <button
                      onClick={() => onLocationClick(location)}
                      className="truncate text-left hover:text-primary hover:underline transition-colors cursor-pointer w-full"
                    >
                      {location.name}
                    </button>
                    {/* Show category and state on mobile */}
                    <div className="sm:hidden text-xs text-muted-foreground mt-1">
                      <RibbonBadge backgroundColor={getCategoryColor(location.category)}>
                        {getCategoryLabel(location.category)}
                      </RibbonBadge>
                      {location.city ? `${location.city}, ${location.state}` : location.state}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <RibbonBadge backgroundColor={getCategoryColor(location.category)}>
                    {getCategoryLabel(location.category)}
                  </RibbonBadge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div>
                    {location.city ? `${location.city}, ${location.state}` : location.state}
                    {location.zipCode && (
                      <div className="text-xs text-muted-foreground">{location.zipCode}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                  {location.taggedDate ? (() => {
                    const [year, month, day] = location.taggedDate.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                  })() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onToggleBookmark(location.id)}
                      title={location.isBookmarked === "true" ? "Remove bookmark" : "Bookmark location"}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={location.isBookmarked === "true" ? "currentColor" : "none"}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(location)}
                      title="Edit location"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(location.id)}
                      title="Delete location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}