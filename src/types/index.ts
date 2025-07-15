// Media file types
export type MediaType = 'audio' | 'video';

export interface RecordingFile {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  size: number;
  duration: number;
  created: number;
  url: string;
  thumbnailUrl?: string;
  uploaded?: boolean;
  uploadProgress?: number;
}

export interface UploadStatus {
  fileId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
} 