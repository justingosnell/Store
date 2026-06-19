import { useEffect, useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type InsertLocation, type Location, type Media, type Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import imageCompression from "browser-image-compression";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MediaLibrary } from "@/components/MediaLibrary";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  onSubmit: (data: InsertLocation) => void;
  isLoading: boolean;
}

const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" }
];

// Default categories as fallback
const DEFAULT_CATEGORIES = [
  { value: "muffler-men", label: "Muffler Men", icon: "🗿" },
  { value: "worlds-largest", label: "World's Largest", icon: "🏆" },
  { value: "unique-finds", label: "Unique Finds", icon: "✨" },
];

interface CustomField {
  key: string;
  value: string;
}

export function LocationDialog({
  open,
  onOpenChange,
  location,
  onSubmit,
  isLoading,
}: LocationDialogProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch categories from API
  const { data: categories = DEFAULT_CATEGORIES } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/categories"));
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Convert categories to the format needed for the select
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.slug,
        label: cat.name,
        icon: cat.icon,
      })),
    [categories]
  );
  
  const getLocalDateString = () => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
  };

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: "",
      latitude: 0,
      longitude: 0,
      category: "muffler-men",
      state: "",
      city: "",
      zipCode: "",
      photoUrl: "",
      photoId: "",
      taggedDate: getLocalDateString(),
      description: "",
      customFields: "{}",
    },
  });

  // Reset form when dialog opens/closes or location changes
  useEffect(() => {
    if (open) {
      if (location) {
        // Parse custom fields from location
        let parsedFields: CustomField[] = [];
        try {
          const fieldsObj = JSON.parse(location.customFields || "{}");
          parsedFields = Object.entries(fieldsObj).map(([key, value]) => ({
            key,
            value: String(value),
          }));
        } catch (e) {
          parsedFields = [];
        }
        setCustomFields(parsedFields);
        setPreviewUrl(location.photoUrl);
        
        form.reset({
          name: location.name,
          latitude: location.latitude ?? 0,
          longitude: location.longitude ?? 0,
          category: location.category,
          state: location.state,
          city: location.city ?? "",
          zipCode: location.zipCode ?? "",
          photoUrl: location.photoUrl,
          photoId: location.photoId,
          taggedDate: location.taggedDate,
          description: location.description ?? "",
          customFields: location.customFields ?? "{}",
        });
      } else {
        setCustomFields([]);
        setPreviewUrl("");
        form.reset({
          name: "",
          latitude: 0,
          longitude: 0,
          category: categoryOptions[0]?.value || "muffler-men",
          state: "",
          city: "",
          zipCode: "",
          photoUrl: "",
          photoId: "",
          taggedDate: getLocalDateString(),
          description: "",
          customFields: "{}",
        });
      }
    }
  }, [open, location, categoryOptions]);

  const handleSubmit = (data: InsertLocation) => {
    console.log("Form submitted with data:", data);
    console.log("Form validation state:", form.formState);
    
    // Convert custom fields array to JSON string
    const customFieldsObj: Record<string, string> = {};
    customFields.forEach((field) => {
      if (field.key.trim()) {
        customFieldsObj[field.key.trim()] = field.value;
      }
    });
    
    const submitData = {
      ...data,
      customFields: JSON.stringify(customFieldsObj),
    };
    
    console.log("Submitting data:", submitData);
    onSubmit(submitData);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...customFields];
    updated[index][field] = newValue;
    setCustomFields(updated);
  };

  const handleMediaSelect = (media: Media) => {
    form.setValue("photoUrl", media.url);
    setPreviewUrl(media.url);
    toast({
      title: "Image selected",
      description: "Image from library has been selected",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let compressedFile = file;
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        compressedFile = await imageCompression(file, options);
        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
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

      let errorData: any;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = null;
      }

      if (!response.ok) {
        const errorMessage = errorData?.message || errorData?.error || `Upload failed (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      const data = errorData;
      
      if (!data?.url) {
        throw new Error("Server response missing image URL");
      }

      form.setValue("photoUrl", data.url);
      setPreviewUrl(data.url);
      
      toast({
        title: "Upload successful",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      console.error("Upload error:", errorMessage, error);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>
            {location ? "Edit Location" : "Add New Location"}
          </DialogTitle>
          <DialogDescription>
            {location
              ? "Update the location details below"
              : "Fill in the details to create a new location"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit, (errors) => {
              console.error("Form validation errors:", errors);
            })} 
            className="space-y-4">
          
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.name} value={state.name}>
                            {state.abbr} {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Required for geocoding</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Required for geocoding" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief description of the location" />
                  </FormControl>
                  <FormDescription>
                    Optional description that will be displayed in the location details
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo</FormLabel>
                  <div className="space-y-3">
                    {/* Image Preview */}
                    {previewUrl && (
                      <div className="relative w-full rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-auto object-contain max-h-96"
                          onError={() => setPreviewUrl("")}
                        />
                      </div>
                    )}
                    
                    {/* Upload Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMediaLibraryOpen(true)}
                        disabled={uploading || isLoading}
                        className="flex-1"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Choose from Library
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading || isLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || isLoading}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload New"}
                      </Button>
                      {previewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPreviewUrl("");
                            form.setValue("photoUrl", "");
                          }}
                          disabled={uploading || isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Manual URL Input */}
                    <div className="space-y-2">
                      <FormLabel className="text-xs text-muted-foreground">Or enter URL manually</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setPreviewUrl(e.target.value);
                          }}
                          disabled={uploading || isLoading}
                        />
                      </FormControl>
                    </div>
                  </div>
                  <FormDescription>
                    Upload an image or enter a URL (max 10MB, JPEG/PNG/GIF/WebP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Facebook photo ID or reference identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taggedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tagged Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Custom Fields</CardTitle>
                    <CardDescription className="text-xs">
                      Add custom attributes for enhanced search (e.g., material, height, theme)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No custom fields added. Click "Add Field" to create searchable attributes.
                  </p>
                ) : (
                  customFields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={field.key}
                          onChange={(e) => updateCustomField(index, "key", e.target.value)}
                          disabled={isLoading}
                        />
                        <Input
                          value={field.value}
                          onChange={(e) => updateCustomField(index, "value", e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomField(index)}
                        disabled={isLoading}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : location ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>

      {/* Media Library Dialog */}
      <MediaLibrary
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        onSelect={handleMediaSelect}
        mode="select"
      />
    </Dialog>
  );
}