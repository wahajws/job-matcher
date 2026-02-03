import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { uploadCvs } from '@/api';
import { FileDropzone } from '@/components/FileDropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { UploadProgress, UploadResult } from '@/types';

export default function CvUpload() {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadProgress[]>([]);
  const [batchTag, setBatchTag] = useState('Jan 2026 Batch');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (fileObjects: File[]) => uploadCvs(fileObjects, batchTag),
    onSuccess: (result) => {
      setUploadResult(result);
      setFiles(result.files);
      toast({
        title: 'Upload Complete',
        description: `${result.successful} files uploaded successfully${result.duplicates > 0 ? `, ${result.duplicates} duplicates skipped` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: 'Upload Failed',
        description: 'An error occurred while uploading files',
        variant: 'destructive',
      });
    },
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    const newFiles: UploadProgress[] = acceptedFiles.map((file) => ({
      filename: file.name,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setPendingFiles((prev) => [...prev, ...acceptedFiles]);
  };

  const handleRemoveFile = (filename: string) => {
    setFiles((prev) => prev.filter((f) => f.filename !== filename));
    setPendingFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  const handleUpload = () => {
    // Use the actual File objects from pendingFiles, not empty File objects
    const filesToUpload = pendingFiles.filter((file) => {
      const fileStatus = files.find((f) => f.filename === file.name)?.status;
      return fileStatus === 'pending';
    });

    // Simulate updating progress
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 50 } : f
      )
    );

    uploadMutation.mutate(filesToUpload);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const canUpload = pendingCount > 0 && !uploadMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/cvs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload CVs</h1>
          <p className="text-muted-foreground">Bulk upload candidate CVs for processing</p>
        </div>
      </div>

      {!uploadResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload PDF Files</CardTitle>
            <CardDescription>
              Drag and drop multiple PDF files or click to browse. Duplicate files will be detected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileDropzone
              onFilesAccepted={handleFilesAccepted}
              files={files}
              onRemoveFile={handleRemoveFile}
              disabled={uploadMutation.isPending}
            />

            <div className="space-y-2">
              <Label htmlFor="batchTag">Batch Tag (Optional)</Label>
              <Input
                id="batchTag"
                placeholder="e.g., Jan 2026 Batch"
                value={batchTag}
                onChange={(e) => setBatchTag(e.target.value)}
                data-testid="input-batch-tag"
              />
              <p className="text-xs text-muted-foreground">
                Tag to group this batch of uploads for easy filtering later
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {pendingCount} file{pendingCount !== 1 ? 's' : ''} ready to upload
              </p>
              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                className="gap-2"
                data-testid="button-start-upload"
              >
                {uploadMutation.isPending ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ingestion Report</CardTitle>
            <CardDescription>Summary of the upload batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {uploadResult.successful}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Successful</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {uploadResult.duplicates}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Duplicates</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {uploadResult.failed}
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400">Failed</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">File Details</h4>
              <div className="max-h-60 overflow-auto space-y-1 custom-scrollbar">
                {uploadResult.files.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <span className="truncate">{file.filename}</span>
                    <span
                      className={
                        file.status === 'success'
                          ? 'text-emerald-600'
                          : file.status === 'duplicate'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }
                    >
                      {file.status === 'success'
                        ? 'Uploaded'
                        : file.status === 'duplicate'
                        ? 'Duplicate'
                        : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Link href="/admin/cvs">
                <Button variant="outline" data-testid="button-view-cvs">
                  View All CVs
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setFiles([]);
                  setPendingFiles([]);
                  setUploadResult(null);
                }}
                data-testid="button-upload-more"
              >
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
