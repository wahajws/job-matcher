import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/utils/helpers';
import type { UploadProgress } from '@/types';

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  files: UploadProgress[];
  onRemoveFile: (filename: string) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function FileDropzone({
  onFilesAccepted,
  files,
  onRemoveFile,
  disabled = false,
  maxFiles = 50,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    disabled,
    maxFiles,
  });

  return (
    <div className="space-y-4" data-testid="file-dropzone">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} data-testid="input-file-upload" />
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">Drop the PDF files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium mb-1">
              Drag & drop PDF files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports multiple files (max {maxFiles})
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Files ({files.length})</h4>
          <div className="max-h-60 overflow-auto space-y-2 custom-scrollbar">
            {files.map((file) => (
              <div
                key={file.filename}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-md border',
                  file.status === 'success' && 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800',
                  file.status === 'failed' && 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800',
                  file.status === 'duplicate' && 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
                  (file.status === 'pending' || file.status === 'uploading') && 'bg-card border-border'
                )}
                data-testid={`file-item-${file.filename}`}
              >
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.filename}</p>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                  {file.error && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {file.status === 'failed' && (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  {file.status === 'duplicate' && (
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                  {file.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => onRemoveFile(file.filename)}
                      data-testid={`button-remove-file-${file.filename}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
