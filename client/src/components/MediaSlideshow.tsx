import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

interface Location {
  id: string;
  name: string;
  photoUrl: string;
  photoId: string;
  city: string;
  state: string;
  category: string;
}

export function MediaSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch location images (public endpoint)
  const { data: images = [] } = useQuery<Location[]>({
    queryKey: ["slideshow-images"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/locations"));
      if (!response.ok) return [];
      const data = await response.json();
      // Filter only locations with images
      const locationsWithImages = data.filter((loc: Location) => loc.photoUrl);
      // Sort by newest location first
      return locationsWithImages.sort((a, b) => new Date(b.taggedDate).getTime() - new Date(a.taggedDate).getTime());
    },
  });

  // Auto-advance slideshow
  useEffect(() => {
    if (!isAutoPlaying || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds (medium pace)

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length, currentIndex]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  if (images.length === 0) {
    return (
      <div className="relative w-full h-52 md:h-80 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600 text-lg">No images available</p>
      </div>
    );
  }

  const currentLocation = images[currentIndex];

  return (
    <div className="relative w-full h-52 md:h-80 lg:h-[450px] bg-transparent rounded-lg overflow-hidden group">
      {/* Main Image */}
      <div className="relative w-full h-full">
        <img
          src={currentLocation.photoUrl}
          alt={currentLocation.name}
          className="w-full h-full object-contain transition-opacity duration-500"
          loading="lazy"
        />
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevious}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white hover:scale-110 text-amber-900 transition-all duration-200 h-10 w-10 md:h-12 md:w-12"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white hover:scale-110 text-amber-900 transition-all duration-200 h-10 w-10 md:h-12 md:w-12"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      {/* Dot Indicators */}
      <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 overflow-x-auto max-w-xs">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 md:h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "w-6 md:w-8 bg-white"
                : "w-2 md:w-2.5 bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Pause/Play Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleAutoPlay}
        className="absolute top-3 md:top-4 left-3 md:left-4 bg-black/60 hover:bg-black/80 text-white h-8 w-8 md:h-10 md:w-10 rounded-full"
        aria-label={isAutoPlaying ? "Pause slideshow" : "Resume slideshow"}
      >
        {isAutoPlaying ? (
          <Pause className="h-4 w-4 md:h-5 md:w-5" />
        ) : (
          <Play className="h-4 w-4 md:h-5 md:w-5" />
        )}
      </Button>
    </div>
  );
}