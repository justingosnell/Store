import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Maximize2, Minimize2, MapIcon, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoPanel } from "@/components/PhotoPanel";
import { useCategoryColors } from "@/hooks/useCategoryColors";
import { getApiUrl } from "@/lib/api";
import type { Location } from "@shared/schema";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function createCustomIcon(category: string, isSelected: boolean, color: string) {
  let markerColor = color;

  if (isSelected) {
    markerColor = "#a855f7";
  }

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28s12-19 12-28c0-6.627-5.373-12-12-12z" 
            fill="${markerColor}" 
            stroke="white" 
            stroke-width="2"/>
      <circle cx="16" cy="12" r="5" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

function MapController({
  locations,
  selectedLocation,
}: {
  locations: Location[];
  selectedLocation: Location | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 8, {
        animate: true,
      });
    } else if (locations.length > 0) {
      // Fit bounds with all locations visible
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedLocation, locations, map]);

  return null;
}

interface MapProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationClick: (location: Location | null) => void;
}

function InteractiveMap({
  locations,
  selectedLocation,
  onLocationClick,
  terrain = "standard",
}: MapProps & { terrain?: "standard" | "satellite" }) {
  const { getColorBySlug } = useCategoryColors();

  const tileLayerConfig: Record<"standard" | "satellite", { url: string; attribution: string }> = {
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; Esri',
    },
  };

  const config = tileLayerConfig[terrain];

  return (
    <MapContainer
      center={[39.8283, -98.5795] as [number, number]}
      zoom={5}
      className="h-full w-full rounded"
      zoomControl={true}
    >
      <TileLayer
        url={config.url}
        attribution={config.attribution}
      />

      <MapController locations={locations} selectedLocation={selectedLocation} />

      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude] as [number, number]}
          icon={createCustomIcon(
            location.category,
            selectedLocation?.id === location.id,
            getColorBySlug(location.category)
          )}
          eventHandlers={{
            click: () => {
              onLocationClick(location);
            },
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{location.name}</p>
              <p className="text-xs text-muted-foreground">
                {location.city}, {location.state}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export function HomeMapSection() {
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("all");
  const [terrain, setTerrain] = useState<"standard" | "satellite">("standard");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  const { data: locations = [], isLoading, error } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/locations"));
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  const { categories: apiCategories = [] } = useCategoryColors();

  console.log("HomeMapSection - Loading:", isLoading, "Error:", error, "Locations:", locations.length);

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="text-center py-12 bg-white p-6 rounded border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-amber-700">Loading map...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-12">
        <div className="text-center py-12 bg-white p-6 rounded border text-red-600">
          <p>Error loading locations: {error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </section>
    );
  }

  const filteredLocations = useMemo(() => {
    let filtered = locations;

    if (category !== "all") {
      filtered = filtered.filter((loc) => loc.category === category);
    }

    if (state !== "all") {
      filtered = filtered.filter((loc) => loc.state === state);
    }

    return filtered;
  }, [locations, category, state]);

  const states = useMemo(
    () => Array.from(new Set(locations.map((l) => l.state))).sort(),
    [locations]
  );

  const categories = useMemo(
    () => [
      { id: "all", label: "All Categories" },
      ...apiCategories.map((cat) => ({ id: cat.slug, label: cat.name })),
    ],
    [apiCategories]
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="h-full w-full flex flex-col">
          {/* Header */}
          <div className="bg-background border-b p-4 flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATE_NAMES[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={terrain} onValueChange={(val) => setTerrain(val as "standard" | "satellite")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>

              {(category !== "all" || state !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategory("all");
                    setState("all");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsExpanded(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Map */}
          <div className="flex-1 overflow-hidden">
            <InteractiveMap
              locations={filteredLocations}
              selectedLocation={selectedLocation}
              onLocationClick={setSelectedLocation}
              terrain={terrain}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold flex items-center gap-2 luckiest-guy-regular" style={{ color: '#fff' }}>
          <MapIcon className="h-7 w-7 text-orange-500" />
          Roadside Map
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {STATE_NAMES[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={terrain} onValueChange={(val) => setTerrain(val as "standard" | "satellite")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="satellite">Satellite</SelectItem>
          </SelectContent>
        </Select>

        {(category !== "all" || state !== "all") && (
          <Button
            variant="outline"
            onClick={() => {
              setCategory("all");
              setState("all");
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(true)}
          className="ml-auto"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Container */}
      <Card className="border-2 border-amber-200 overflow-hidden">
        <div style={{ height: "700px", width: "100%" }}>
          <InteractiveMap
            locations={filteredLocations}
            selectedLocation={selectedLocation}
            onLocationClick={setSelectedLocation}
            terrain={terrain}
          />
        </div>
      </Card>

      {/* Results Info */}
      <div className="mt-4 text-sm text-amber-700">
        Showing {filteredLocations.length} location
        {filteredLocations.length !== 1 ? "s" : ""}
        {category !== "all" && ` • ${categories.find(c => c.id === category)?.label}`}
        {state !== "all" && ` • ${STATE_NAMES[state]}`}
      </div>

      {/* Photo Panel Modal */}
      <PhotoPanel
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </section>
  );
}