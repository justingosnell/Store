import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MediaLibraryPanel } from "@/components/MediaLibraryPanel";
import { getApiUrl } from "@/lib/api";
import type { Media } from "@shared/schema";

interface LogoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLogoUrl?: string;
}

export function LogoSelectorDialog({
  open,
  onOpenChange,
  currentLogoUrl,
}: LogoSelectorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  // Mutation to update the logo setting
  const updateLogoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      const response = await fetch(getApiUrl("/api/settings/site_logo"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: logoUrl }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update logo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Success",
        description: "Logo updated successfully",
      });
      onOpenChange(false);
      setSelectedMedia(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove the logo
  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl("/api/settings/site_logo"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "" }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove logo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Success",
        description: "Logo removed successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMediaSelect = (media: Media) => {
    setSelectedMedia(media);
  };

  const handleConfirmSelection = () => {
    if (selectedMedia) {
      updateLogoMutation.mutate(selectedMedia.url);
    }
  };

  const handleRemoveLogo = () => {
    if (confirm("Are you sure you want to remove the current logo?")) {
      removeLogoMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Select Site Logo</DialogTitle>
          <DialogDescription>
            Choose an image from your media library to use as the site logo.
            {currentLogoUrl && " You can also remove the current logo to restore the default icon."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 min-h-0 flex flex-col">
          <MediaLibraryPanel mode="select" onSelect={handleMediaSelect} />
        </div>

        {selectedMedia && (
          <div className="mx-6 mb-4 p-3 bg-muted rounded-md shrink-0">
            <p className="text-sm font-medium mb-2">Selected Image:</p>
            <div className="flex items-center gap-3">
              <img
                src={selectedMedia.url}
                alt={selectedMedia.alt || selectedMedia.originalName}
                className="w-16 h-16 object-contain rounded border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedMedia.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedMedia.width}×{selectedMedia.height}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-6 pb-6 pt-4 border-t shrink-0">
          <div>
            {currentLogoUrl && (
              <Button
                variant="destructive"
                onClick={handleRemoveLogo}
                disabled={removeLogoMutation.isPending}
              >
                Remove Current Logo
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedMedia(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={!selectedMedia || updateLogoMutation.isPending}
            >
              {updateLogoMutation.isPending ? "Updating..." : "Set as Logo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}