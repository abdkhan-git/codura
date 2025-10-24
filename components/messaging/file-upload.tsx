"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Upload as UploadIcon, 
  Image, 
  File, 
  X, 
  Download,
  Eye,
  Trash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadProps {
  conversationId: string;
  onFileUploaded: (attachment: any, messageType: string) => void;
  disabled?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  attachment?: any;
}

export function FileUpload({ conversationId, onFileUploaded, disabled }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        return false;
      }

      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }

      return true;
    });

    // Create preview files
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'uploading'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files
    newFiles.forEach(uploadFile);
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('conversation_id', conversationId);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, progress: 100, status: 'completed', attachment: data.attachment }
          : f
      ));

      // Notify parent component
      onFileUploaded(data.attachment, data.messageType);

      toast.success(`${uploadedFile.file.name} uploaded successfully`);

    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'error' }
          : f
      ));

      toast.error(`Failed to upload ${uploadedFile.file.name}`);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    return File;
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
        >
          <UploadIcon className="w-4 h-4" />
          Upload Files
        </Button>
        <span className="text-xs text-muted-foreground">
          Images, PDFs, Documents (max 10MB)
        </span>
      </div>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((uploadedFile) => {
            const FileIcon = getFileIcon(uploadedFile.file.type);
            
            return (
              <div
                key={uploadedFile.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  uploadedFile.status === 'completed' 
                    ? "bg-green-500/10 border-green-500/30"
                    : uploadedFile.status === 'error'
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                )}
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {uploadedFile.status === 'uploading' && (
                    <Progress value={uploadedFile.progress} className="mt-1" />
                  )}
                  
                  {/* Status */}
                  {uploadedFile.status === 'completed' && (
                    <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                  )}
                  
                  {uploadedFile.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">✗ Failed</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {uploadedFile.status === 'completed' && uploadedFile.attachment && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(uploadedFile.attachment.url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
