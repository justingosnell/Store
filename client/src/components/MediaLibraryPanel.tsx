import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Search, Trash2, Edit2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getApiUrl } from "@/lib/api";
import imageCompression from "browser-image-compression";
import type { Media } from "@shared/schema";

interface MediaLibraryPanelProps {
  onSelect?: (media: Media) => void;
  mode?: "select" | "manage";
}

export function MediaLibraryPanel({ onSelect, mode = "manage" }: MediaLibraryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Media | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [selectedTab, setSelectedTab] = useState<"library" | "upload">("library");

  // Fetch all media
  const { data: allMedia = [], isLoading } = useQuery<Media[]>({
    queryKey: ["media"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/media"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch media");
      return response.json();
    },
  });
  const { data: performanceSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to fetch performance settings");
      return response.json();
    },
  });
  const lazyLoadImages = performanceSettings.lazy_load_below_fold_images === "true";

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Upload mutation for single file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
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
      const response = await fetch(getApiUrl(`/api/media/${id}`), {
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
      const response = await fetch(getApiUrl(`/api/media/${id}`), {
        method: "DELETE",
        headers: { "X-Confirm-Action": "delete-media" },
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
      toast({ title: "Image deleted", description: "The file was removed from the media library." });
      setDeleteCandidate(null);
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
    <>
    <Card className="flex w-full min-w-0 flex-col overflow-hidden border-[#dfe3e6] p-0 shadow-none">
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "library" | "upload")} className="flex min-w-0 flex-col">
        <div className="flex flex-col gap-4 border-b border-[#dfe3e6] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid w-full grid-cols-2 bg-[#f1f2f3] sm:w-72">
          <TabsTrigger value="library">Library ({allMedia.length})</TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload New
          </TabsTrigger>
        </TabsList>
        {selectedTab === "library" && (
          <Button className="bg-[#008060] text-white hover:bg-[#006e52]" onClick={() => setSelectedTab("upload")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload files
          </Button>
        )}
        </div>

        <TabsContent value="library" className="m-0 flex min-w-0 flex-col p-4 sm:p-5">
          <div className="relative mb-5 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by filename, alt text, or caption..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 bg-white pl-10 pr-10"
              aria-label="Search image library"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => handleSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading media...</div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No media found matching your search" : "No media uploaded yet"}
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredMedia.map((media) => (
                  <Card
                    key={media.id}
                    className={`group relative min-w-0 overflow-hidden border-[#dfe3e6] bg-white transition-all hover:border-[#8c9196] hover:shadow-md ${
                      editingMedia?.id === media.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => mode === "select" && handleSelect(media)}
                  >
                    <div className="relative aspect-square bg-[#f6f6f7]">
                      <img
                        src={media.url}
                        alt={media.alt?.trim() || ""}
                        className="h-full w-full object-contain p-2"
                        loading={lazyLoadImages ? "lazy" : "eager"}
                        decoding="async"
                      />
                      {!media.alt?.trim() && (
                        <span className="absolute left-2 top-2 rounded-full bg-[#b54708] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          No Alt
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-2 border-t border-[#e5e8ea] p-3">
                      <p className="truncate text-xs font-semibold text-[#34363a]" title={media.originalName || media.filename}>
                        {media.originalName || media.filename}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#6d7175]">
                        <span>{formatFileSize(media.size)}</span>
                        {media.width && media.height && <span>{media.width}×{media.height}</span>}
                      </div>
                      <p className="text-[11px] text-[#6d7175]">{formatDate(media.uploadedAt)}</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {mode === "select" ? (
                          <Button size="sm" className="col-span-2 bg-[#008060] text-white" onClick={() => handleSelect(media)}>
                            <Check className="mr-1 h-3.5 w-3.5" /> Select
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); handleEdit(media); }}>
                            <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className={mode === "select" ? "col-span-2 border-red-200 text-red-700 hover:bg-red-50" : "border-red-200 text-red-700 hover:bg-red-50"}
                          onClick={(event) => { event.stopPropagation(); setDeleteCandidate(media); }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {editingMedia && mode === "manage" && (
            <div className="mt-4 rounded-lg border border-[#dfe3e6] bg-[#fafbfb] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Edit Media Details</h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingMedia(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-alt" className="text-sm">Alt Text</Label>
                  <Input id="edit-alt" value={editAlt} onChange={(e) => setEditAlt(e.target.value)} placeholder="Describe the image" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-caption" className="text-sm">Caption</Label>
                  <Textarea id="edit-caption" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder="Add a caption" rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} size="sm">
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingMedia(null)} size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="m-0 flex flex-1 flex-col items-center justify-center overflow-hidden p-5">
          <div className="w-full max-w-xl space-y-4">
            <div className="space-y-4 rounded-lg border-2 border-dashed border-[#8c9196] bg-[#fafbfb] p-8 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="h-8 w-8 text-[#008060]" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Upload Images</h3>
                <p className="text-sm text-muted-foreground mb-4">Select one or multiple image files to upload</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  multiple
                />
                <Button className="bg-[#008060] text-white hover:bg-[#006e52]" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? (uploadProgress.total > 0 ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : "Uploading...") : "Select Images"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Supported formats: JPEG, PNG, GIF, WebP (max 10MB per file)</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
    <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg gap-6 rounded-2xl border border-[#dfe3e6] bg-white p-0 text-[#202223] shadow-2xl">
        <AlertDialogHeader className="space-y-4 px-5 pb-0 pt-6 text-left sm:px-7 sm:pt-7">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fdecea] text-[#b42318]">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <AlertDialogTitle className="text-xl font-black leading-7 text-[#202223]">
                Delete this image permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm leading-6 text-[#6d7175]">
                This file will be removed from the media library and underlying file storage. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogDescription asChild>
            <div className="rounded-xl border border-[#fed7d7] bg-[#fff5f5] p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#b42318]">Image selected for deletion</p>
              <p className="mt-1 max-h-24 overflow-y-auto break-all text-sm font-semibold leading-6 text-[#4a4f54]">
                {deleteCandidate?.originalName || deleteCandidate?.filename}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 border-t border-[#dfe3e6] bg-[#fafbfb] px-5 py-4 sm:flex-row sm:justify-end sm:space-x-0 sm:px-7">
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            className="mt-0 min-h-11 rounded-lg border-[#c9cccf] bg-white px-5 font-semibold text-[#202223] hover:bg-[#f6f6f7]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11 rounded-lg bg-[#b42318] px-5 font-semibold text-white hover:bg-[#8f1d14] focus-visible:ring-[#b42318]"
            disabled={deleteMutation.isPending}
            onClick={() => deleteCandidate && deleteMutation.mutate(deleteCandidate.id)}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete image"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
