import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Location } from "@shared/schema";

interface CategorySlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTitle: string;
  images: Location[];
}

type SortOrder = "original" | "name" | "city" | "date" | "random";

export function CategorySlideshowModal({
  isOpen,
  onClose,
  categoryTitle,
  images,
}: CategorySlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("original");

  const sortedImages = useMemo(() => {
    let result = [...images];
    
    switch (sortOrder) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "city":
        result.sort((a, b) => a.city.localeCompare(b.city));
        break;
      case "date":
        result.sort((a, b) => new Date(b.taggedDate).getTime() - new Date(a.taggedDate).getTime());
        break;
      case "random":
        result = result.sort(() => Math.random() - 0.5);
        break;
      case "original":
      default:
        break;
    }
    
    return result;
  }, [images, sortOrder]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [sortOrder]);

  useEffect(() => {
    if (!isAutoPlaying || sortedImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, sortedImages.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  if (sortedImages.length === 0) {
    return null;
  }

  const currentLocation = sortedImages[currentIndex];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 right-0 z-[1000] transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-card border-b border-border shadow-lg">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="luckiest-guy-regular text-2xl font-bold text-foreground">
                {categoryTitle}
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button
                    variant={sortOrder === "original" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("original")}
                    className="text-xs"
                  >
                    Original
                  </Button>
                  <Button
                    variant={sortOrder === "name" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("name")}
                    className="text-xs"
                  >
                    Name
                  </Button>
                  <Button
                    variant={sortOrder === "city" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("city")}
                    className="text-xs"
                  >
                    City
                  </Button>
                  <Button
                    variant={sortOrder === "date" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("date")}
                    className="text-xs"
                  >
                    Date
                  </Button>
                  <Button
                    variant={sortOrder === "random" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("random")}
                    className="text-xs"
                  >
                    Random
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-foreground hover:bg-accent"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="relative w-full h-96 bg-background rounded-lg overflow-hidden group">
              <img
                src={currentLocation.photoUrl}
                alt={currentLocation.name}
                className="w-full h-full object-contain transition-opacity duration-500"
                loading="lazy"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white hover:scale-110 transition-all duration-200 h-10 w-10 md:h-12 md:w-12"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-slate-700 group-hover:text-slate-600" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white hover:scale-110 transition-all duration-200 h-10 w-10 md:h-12 md:w-12"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-slate-700 group-hover:text-slate-600" />
              </Button>

              <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 overflow-x-auto max-w-xs">
                {sortedImages.map((_, index) => (
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

            <div className="mt-4 text-muted-foreground">
              <p className="text-sm">
                <strong>{currentLocation.name}</strong>
                {currentLocation.city && `, ${currentLocation.city}`}
                {currentLocation.state && `, ${currentLocation.state}`}
              </p>
              {currentLocation.description && (
                <p className="text-sm mt-1">{currentLocation.description}</p>
              )}
              <p className="text-xs mt-2">
                {currentIndex + 1} / {sortedImages.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
