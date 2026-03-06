export interface PresignedUrl {
  presignedUrl: string;
  offset?: number;
  chunkSize?: number;
}

export interface UploadData {
  chunks: number;
  presignedUrls: PresignedUrl[];
  key?: string;
  uploadId?: string;
}
