import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParseResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (fileContent: string) => {
      try {
        const response = await fetch(getApiUrl("/api/locations/bulk-upload"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fileContent }),
          credentials: "include",
        });
        
        if (!response.ok) {
          // Try to parse error message from response
          let errorMessage = "Failed to upload locations";
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = `${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Network error: Unable to connect to server. Please check your connection.");
        }
        throw error;
      }
    },
    onSuccess: (data: ParseResult) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setParseResult(data);
      toast({
        title: "Upload Complete",
        description: `Successfully created ${data.success} location(s). ${data.failed} failed.`,
      });
    },
    onError: (error: Error) => {
      console.error("Bulk upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".txt")) {
        toast({
          title: "Invalid File",
          description: "Please select a .txt file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setParseResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      const content = await file.text();
      uploadMutation.mutate(content);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Locations</DialogTitle>
          <DialogDescription>
            Upload a .txt file with locations (one per line). Format: City, State, Category, Visit Date (MM/DD/YYYY), Name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
                id="bulk-upload-file"
              />
              <label
                htmlFor="bulk-upload-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    {file ? file.name : "Click to select a .txt file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    One location per line
                  </p>
                </div>
              </label>
            </div>

            {/* Format Example */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Example format:</p>
              <code className="text-xs block space-y-1">
                <div>Chicago, IL, muffler-men, 01/15/2024, Giant Paul Bunyan</div>
                <div>Austin, TX, worlds-largest, 02/20/2024, World's Largest Cowboy Boots</div>
                <div>Portland, OR, unique-finds, 03/10/2024, Fremont Troll</div>
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Valid categories: muffler-men, worlds-largest, unique-finds
              </p>
            </div>

            {/* Upload Result */}
            {parseResult && (
              <div className="space-y-2">
                {parseResult.success > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        Successfully created {parseResult.success} location(s)
                      </p>
                    </div>
                  </div>
                )}

                {parseResult.failed > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Failed to create {parseResult.failed} location(s)
                      </p>
                      {parseResult.errors.length > 0 && (
                        <ul className="text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
                          {parseResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {parseResult ? "Close" : "Cancel"}
          </Button>
          {!parseResult && (
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}