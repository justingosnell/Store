import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Search, Image as ImageIcon, Trash2, Edit2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiUrl } from "@/lib/api";
import type { Media } from "@shared/schema";

interface MediaLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (media: Media) => void;
  mode?: "select" | "manage";
}

export function MediaLibrary({ open, onOpenChange, onSelect, mode = "select" }: MediaLibraryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [selectedTab, setSelectedTab] = useState<"library" | "upload">("library");

  // Fetch all media
  const { data: allMedia = [], isLoading, error } = useQuery<Media[]>({
    queryKey: ["media"],
    queryFn: async () => {
      console.log("Fetching media from:", getApiUrl("/api/media"));
      const response = await fetch(getApiUrl("/api/media"), {
        credentials: "include",
      });
      console.log("Media fetch response status:", response.status);
      if (!response.ok) throw new Error("Failed to fetch media");
      const data = await response.json();
      console.log("Media fetched:", data.length, "items");
      return data;
    },
    enabled: open,
  });
  
  console.log("MediaLibrary - isLoading:", isLoading, "allMedia length:", allMedia.length, "error:", error);

  // Filter media based on search
  const filteredMedia = allMedia.filter((media) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      media.originalName.toLowerCase().includes(query) ||
      media.alt?.toLowerCase().includes(query) ||
      media.caption?.toLowerCase().includes(query)
    );
  });

  // Upload mutation for single file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(getApiUrl("/api/media"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, alt, caption }: { id: string; alt: string; caption: string }) => {
      const response = await fetch(`/api/media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt, caption }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Update failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Success", description: "Media updated successfully" });
      setEditingMedia(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Success", description: "Media deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Convert FileList to Array
    const fileArray = Array.from(files);
    
    // Validate all files first
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];
    
    fileArray.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (invalid type)`);
      } else if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (too large)`);
      } else {
        validFiles.push(file);
      }
    });
    
    // Show validation errors
    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were skipped",
        description: `Invalid files: ${invalidFiles.join(", ")}`,
        variant: "destructive",
      });
    }
    
    if (validFiles.length === 0) return;
    
    // Upload files sequentially
    setUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < validFiles.length; i++) {
      try {
        setUploadProgress({ current: i + 1, total: validFiles.length });
        await uploadMutation.mutateAsync(validFiles[i]);
        successCount++;
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to upload ${validFiles[i].name}:`, error);
        toast({
          title: "Upload failed",
          description: `${validFiles[i].name}: ${errorMsg}`,
          variant: "destructive",
        });
      }
    }
    
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    
    // Refresh media list
    queryClient.invalidateQueries({ queryKey: ["media"] });
    
    // Show summary toast
    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${successCount} image${successCount > 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} failed` : ""}`,
      });
      setSelectedTab("library");
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelect = (media: Media) => {
    if (onSelect) {
      onSelect(media);
      onOpenChange(false);
    }
  };

  const handleEdit = (media: Media) => {
    setEditingMedia(media);
    setEditAlt(media.alt || "");
    setEditCaption(media.caption || "");
  };

  const handleSaveEdit = () => {
    if (editingMedia) {
      updateMutation.mutate({
        id: editingMedia.id,
        alt: editAlt,
        caption: editCaption,
      });
    }
  };

  const handleDelete = (media: Media) => {
    if (confirm(`Are you sure you want to delete "${media.originalName || media.filename}"?`)) {
      deleteMutation.mutate(media.id);
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            {mode === "select" 
              ? "Select an image from your library or upload a new one"
              : "Manage your media library"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "library" | "upload")} className="flex-1 flex flex-col overflow-hidden px-6 pb-6 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">
              <ImageIcon className="mr-2 h-4 w-4" />
              Library ({allMedia.length})
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by filename, alt text, or caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Media Grid */}
            <ScrollArea className="flex-1 h-[500px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading media...
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  Error loading media: {error instanceof Error ? error.message : String(error)}
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No media found matching your search" : "No media uploaded yet"}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4 pr-4">
                  {filteredMedia.map((media) => (
                    <Card
                      key={media.id}
                      className={`group relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                        editingMedia?.id === media.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => mode === "select" && handleSelect(media)}
                    >
                      <div className="aspect-square relative bg-muted">
                        <img
                          src={media.url}
                          alt={media.alt || media.originalName || media.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {mode === "select" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSelect(media)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Select
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(media);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(media);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(media);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Media Info */}
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-medium truncate" title={media.originalName || media.filename}>
                          {media.originalName || media.filename}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatFileSize(media.size)}</span>
                          {media.width && media.height && (
                            <span>{media.width}×{media.height}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(media.uploadedAt)}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Edit Panel */}
            {editingMedia && mode === "manage" && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <h3 className="font-semibold">Edit Media Details</h3>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="edit-alt">Alt Text</Label>
                    <Input
                      id="edit-alt"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-caption">Caption</Label>
                    <Textarea
                      id="edit-caption"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Add a caption"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingMedia(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 flex flex-col items-center justify-center mt-4">
            <div className="w-full max-w-md space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Upload Images</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select one or multiple image files to upload
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                    multiple
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      uploadProgress.total > 0 
                        ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                        : "Uploading..."
                    ) : "Select Images"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPEG, PNG, GIF, WebP (max 10MB per file)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}