import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { Location } from "@shared/schema";
import { useCategoryColors } from "@/hooks/useCategoryColors";

interface USMapProps {
  locations: Location[];
  activeCategory: string;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
}

function createCustomIcon(category: string, isSelected: boolean, color: string) {
  let markerColor = color;
  
  if (isSelected) {
    markerColor = "#a855f7"; // Purple for selected
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

function MapController({ locations, selectedLocation }: { locations: Location[], selectedLocation: Location | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 8, {
        animate: true,
      });
    } else if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedLocation, locations, map]);

  return null;
}

export function USMap({ locations, activeCategory, selectedLocation, onLocationClick }: USMapProps) {
  const { getColorBySlug } = useCategoryColors();

  return (
    <MapContainer
      center={[39.8283, -98.5795] as [number, number]}
      zoom={4}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
              console.log("Location clicked:", location.name);
              onLocationClick(location);
            },
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{location.name}</p>
              <p className="text-xs text-muted-foreground">{location.state}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
