import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Category, Media } from "@shared/schema";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

const categorySettingsSchema = z.object({
  backgroundImageUrl: z.string().optional(),
  overlayColor: z.string().default("#000000"),
  overlayOpacity: z.string().default("0.5"),
  textColor: z.string().default("#ffffff"),
  customIconUrl: z.string().optional(),
});

type CategorySettings = {
  backgroundImageUrl?: string;
  overlayColor: string;
  overlayOpacity: string;
  textColor: string;
  customIconUrl?: string;
};

interface CategorySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSave: (settings: CategorySettings) => void;
  isLoading?: boolean;
}

export function CategorySettingsDialog({
  open,
  onOpenChange,
  category,
  onSave,
  isLoading = false,
}: CategorySettingsDialogProps) {
  const { toast } = useToast();
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [customIconFile, setCustomIconFile] = useState<File | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [bgMediaTab, setBgMediaTab] = useState<"upload" | "library">("upload");
  const [iconMediaTab, setIconMediaTab] = useState<"upload" | "library">("upload");
  const [bgSelectorOpen, setBgSelectorOpen] = useState(false);
  const [iconSelectorOpen, setIconSelectorOpen] = useState(false);
  const fileInputRefBg = useRef<HTMLInputElement>(null);
  const fileInputRefIcon = useRef<HTMLInputElement>(null);

  const { data: allMedia = [] } = useQuery<Media[]>({
    queryKey: ["media"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/media"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch media");
      return response.json();
    },
  });

  const form = useForm<CategorySettings>({
    resolver: zodResolver(categorySettingsSchema),
    defaultValues: {
      backgroundImageUrl: category.backgroundImageUrl || "",
      overlayColor: category.overlayColor || "#000000",
      overlayOpacity: category.overlayOpacity || "0.5",
      textColor: category.textColor || "#ffffff",
      customIconUrl: category.customIconUrl || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        backgroundImageUrl: category.backgroundImageUrl || "",
        overlayColor: category.overlayColor || "#000000",
        overlayOpacity: category.overlayOpacity || "0.5",
        textColor: category.textColor || "#ffffff",
        customIconUrl: category.customIconUrl || "",
      });
    }
  }, [open, category]);

  const handleBackgroundImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBackgroundImageFile(file);
    setUploadingBg(true);

    try {
      let compressedFile = file;
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        compressedFile = await imageCompression(file, options);
      } catch (compressionError) {
        console.warn("Image compression failed, using original file:", compressionError);
      }

      const formData = new FormData();
      formData.append("image", compressedFile);

      const response = await fetch(getApiUrl("/api/upload"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const data = await response.json();
      const url = data.url || data.publicUrl;
      form.setValue("backgroundImageUrl", url);
      toast({ title: "Success", description: "Background image uploaded" });
      setBgSelectorOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      console.error("Error uploading background image:", error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleCustomIconUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomIconFile(file);
    setUploadingIcon(true);

    try {
      let compressedFile = file;
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        compressedFile = await imageCompression(file, options);
      } catch (compressionError) {
        console.warn("Image compression failed, using original file:", compressionError);
      }

      const formData = new FormData();
      formData.append("image", compressedFile);

      const response = await fetch(getApiUrl("/api/upload"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload icon");
      }

      const data = await response.json();
      const url = data.url || data.publicUrl;
      form.setValue("customIconUrl", url);
      toast({ title: "Success", description: "Custom icon uploaded" });
      setIconSelectorOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload icon";
      console.error("Error uploading custom icon:", error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = (data: CategorySettings) => {
    onSave(data);
    onOpenChange(false);
  };

  const previewBackgroundImage = form.watch("backgroundImageUrl");
  const previewCustomIcon = form.watch("customIconUrl");
  const previewOverlayColor = form.watch("overlayColor");
  const previewOverlayOpacity = parseFloat(form.watch("overlayOpacity"));
  const previewTextColor = form.watch("textColor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Category: {category.name}</DialogTitle>
          <DialogDescription>
            Add custom background images, adjust overlays, and customize icon colors
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Background Image</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBgSelectorOpen(true)}
                    className="w-full justify-start"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {previewBackgroundImage ? "Change Background Image" : "Select Background Image"}
                  </Button>
                  
                  {previewBackgroundImage && (
                    <div className="flex items-center gap-2 mt-3">
                      <img
                        src={previewBackgroundImage}
                        alt="Background preview"
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => form.setValue("backgroundImageUrl", "")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Custom Icon/Image</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIconSelectorOpen(true)}
                    className="w-full justify-start"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {previewCustomIcon ? "Change Custom Icon" : "Select Custom Icon"}
                  </Button>
                  
                  {previewCustomIcon && (
                    <div className="flex items-center gap-2 mt-3">
                      <img
                        src={previewCustomIcon}
                        alt="Icon preview"
                        className="h-20 w-20 object-contain rounded border"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => form.setValue("customIconUrl", "")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="overlayColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overlay Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            {...field}
                            className="w-12 h-10 rounded cursor-pointer border"
                          />
                          <input
                            type="text"
                            {...field}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Color for the card overlay</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overlayOpacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Overlay Opacity: {Math.round(parseFloat(field.value) * 100)}%
                      </FormLabel>
                      <FormControl>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        0 = transparent, 1 = completely opaque
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            {...field}
                            className="w-12 h-10 rounded cursor-pointer border"
                          />
                          <input
                            type="text"
                            {...field}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Color for card text</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Preview</h3>
              <div
                className="relative w-full h-40 rounded-lg overflow-hidden border"
                style={{
                  backgroundImage: previewBackgroundImage
                    ? `url(${previewBackgroundImage})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: previewOverlayColor,
                    opacity: previewOverlayOpacity,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">
                    {previewCustomIcon ? (
                      <img
                        src={previewCustomIcon}
                        alt="Icon preview"
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      category.icon.startsWith("http") ||
                      category.icon.startsWith("/") ? (
                        <img
                          src={category.icon}
                          alt="Icon"
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        category.icon
                      )
                    )}
                  </div>
                  <div
                    className="text-sm font-semibold text-center"
                    style={{ color: previewTextColor }}
                  >
                    {category.name}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Background Image Selection Dialog */}
        <Dialog open={bgSelectorOpen} onOpenChange={setBgSelectorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Background Image</DialogTitle>
            </DialogHeader>
            
            <Tabs value={bgMediaTab} onValueChange={(v) => setBgMediaTab(v as "upload" | "library")} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload New</TabsTrigger>
                <TabsTrigger value="library">From Library</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-2">
                <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload background image</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    disabled={uploadingBg}
                  />
                </label>
              </TabsContent>
              
              <TabsContent value="library" className="space-y-2 max-h-[60vh] overflow-y-auto">
                {allMedia.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No media in library</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {allMedia.map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => {
                          form.setValue("backgroundImageUrl", media.url);
                          setBgSelectorOpen(false);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-80 ${
                          previewBackgroundImage === media.url ? "border-primary border-4" : "border-gray-200"
                        }`}
                      >
                        <img src={media.url} alt={media.originalName} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Custom Icon Selection Dialog */}
        <Dialog open={iconSelectorOpen} onOpenChange={setIconSelectorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Custom Icon</DialogTitle>
            </DialogHeader>
            
            <Tabs value={iconMediaTab} onValueChange={(v) => setIconMediaTab(v as "upload" | "library")} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload New</TabsTrigger>
                <TabsTrigger value="library">From Library</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-2">
                <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload custom icon</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCustomIconUpload}
                    disabled={uploadingIcon}
                  />
                </label>
              </TabsContent>
              
              <TabsContent value="library" className="space-y-2 max-h-[60vh] overflow-y-auto">
                {allMedia.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No media in library</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {allMedia.map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => {
                          form.setValue("customIconUrl", media.url);
                          setIconSelectorOpen(false);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-80 bg-gray-100 ${
                          previewCustomIcon === media.url ? "border-primary border-4" : "border-gray-200"
                        }`}
                      >
                        <img src={media.url} alt={media.originalName} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
