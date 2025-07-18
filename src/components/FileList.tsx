import React, { useEffect, useState } from 'react';
import { listFiles, deleteFile } from '../utils/fileUtils';
import { uploadFile, uploadThumbnail } from '../utils/uploadUtils';
import { fetchRemoteFiles, extractDateFromFilename } from '../utils/githubUtils';
import { formatReadableDate } from '../utils/date';
import { processThumbnailForUpload } from '../utils/imageUtils';
import DefaultThumbnail from './icons/DefaultThumbnail';
import EyeIcon from './icons/EyeIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import UploadIcon from './icons/UploadIcon';
import CheckIcon from './icons/CheckIcon';
import AudioIcon from './icons/AudioIcon';
import VideoIcon from './icons/VideoIcon';
import EditFileModal from './EditFileModal';

// Helper to parse metadata from file name
function parseMediaFileName(name: string) {
  // Expected: Category_Title_Author_Date.extension
  const match = name.match(/^([^_]+)_([^_]+)_([^_]+)_([0-9]{4}-[0-9]{2}-[0-9]{2})\.[^.]+$/);
  if (!match) return null;
  return {
    category: match[1],
    title: match[2],
    author: match[3],
    date: match[4],
  };
}

const FileList: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any | null>(null);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [uploadState, setUploadState] = useState<Record<string, { status: string; progress: number; error?: string }>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Fetch local files
      const localFiles = await listFiles();
      const localMedia = localFiles.filter((f: any) => f.type === 'audio' || f.type === 'video');
      const localThumbs = localFiles.filter((f: any) => f.type === 'thumbnail');
      
      // Fetch remote files
      const remoteFiles = await fetchRemoteFiles();
      const remoteMedia = remoteFiles.filter((f: any) => f.type === 'audio' || f.type === 'video');
      const remoteThumbs = remoteFiles.filter((f: any) => f.type === 'thumbnail');
      
      // Create sets for quick lookup
      const remoteMediaNames = new Set(remoteMedia.map(f => f.name));
      const remoteThumbnailNames = new Set(remoteThumbs.map(f => f.name));
      
      // Separate local files: keep only those NOT uploaded yet
      const localOnlyMedia = localMedia.filter((localFile: any) => !remoteMediaNames.has(localFile.name));
      const localOnlyThumbs = localThumbs.filter((localThumb: any) => !remoteThumbnailNames.has(localThumb.name));
      
      // Clean up local files that have been uploaded
      const uploadedLocalMedia = localMedia.filter((localFile: any) => remoteMediaNames.has(localFile.name));
      const uploadedLocalThumbs = localThumbs.filter((localThumb: any) => remoteThumbnailNames.has(localThumb.name));
      
      // Remove uploaded files from local storage
      for (const uploadedFile of [...uploadedLocalMedia, ...uploadedLocalThumbs]) {
        try {
          await deleteFile(uploadedFile.id);
          console.log('Cleaned up uploaded local file:', uploadedFile.name);
        } catch (error) {
          console.error('Failed to clean up local file:', uploadedFile.name, error);
        }
      }
      
      // Mark local files as not uploaded
      const enrichedLocalMedia = localOnlyMedia.map((localFile: any) => ({
        ...localFile,
        uploaded: false,
        isLocal: true
      }));
      
      // Mark remote files as uploaded
      const enrichedRemoteMedia = remoteMedia.map((remoteFile: any) => ({
        ...remoteFile,
        uploaded: true,
        isLocal: false
      }));
      
      // Combine all media files
      const allMediaFiles = [...enrichedLocalMedia, ...enrichedRemoteMedia];
      
      // Sort by date (descending)
      allMediaFiles.sort((a: any, b: any) => {
        const dateA = extractDateFromFilename(a.name);
        const dateB = extractDateFromFilename(b.name);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Map thumbnails by base name (without extension)
      const thumbMap: Record<string, any> = {};
      
      // Add local thumbnails (for local files only)
      localOnlyThumbs.forEach((thumb: any) => {
        const base = thumb.name.replace(/\.[^.]+$/, '');
        thumbMap[base] = { ...thumb, isLocal: true };
      });
      
      // Add remote thumbnails (for remote files)
      remoteThumbs.forEach((thumb: any) => {
        const base = thumb.name.replace(/\.[^.]+$/, '');
        thumbMap[base] = { ...thumb, isLocal: false };
      });
      
      console.log('Files loaded:', { 
        localMedia: enrichedLocalMedia.length, 
        remoteMedia: enrichedRemoteMedia.length,
        localThumbs: localOnlyThumbs.length,
        remoteThumbs: remoteThumbs.length 
      });
      
      setMediaFiles(allMediaFiles);
      setThumbnails(thumbMap);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    loadFiles();
  };

  const handleEdit = (file: any) => {
    setEditingFile(file);
  };

  const handleUpload = async (file: any) => {
    if (!file.file) {
      alert('File data not available for upload.');
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      [file.id]: { status: 'uploading', progress: 0 }
    }));

    try {
      // Upload the main media file
      await uploadFile(file.file, (progress) => {
        setUploadState((prev) => ({
          ...prev,
          [file.id]: { status: 'uploading', progress: progress * 0.7 } // 70% for main file
        }));
      }, file.name);

      // Check if there's a thumbnail to upload
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const thumbnail = thumbnails[baseName];
      
      if (thumbnail && thumbnail.file) {
        try {
          // Process thumbnail: crop, scale, convert to JPG
          const mediaFileName = file.name;
          const { blob: processedThumbnail, filename: processedFilename } = await processThumbnailForUpload(
            thumbnail.file,
            mediaFileName
          );
          
          console.log('Uploading processed thumbnail:', processedFilename);
          await uploadThumbnail(processedThumbnail, (progress) => {
            setUploadState((prev) => ({
              ...prev,
              [file.id]: { status: 'uploading', progress: 0.7 + (progress * 0.3) } // 30% for thumbnail
            }));
          }, processedFilename);
        } catch (error) {
          console.error('Error processing thumbnail:', error);
          // Continue without thumbnail if processing fails
        }
      }

      setUploadState((prev) => ({
        ...prev,
        [file.id]: { status: 'success', progress: 1 }
      }));
      
      // Refresh file list to show updated state and clean up local files
      setTimeout(() => {
        loadFiles();
      }, 1000);
    } catch (error: any) {
      setUploadState((prev) => ({
        ...prev,
        [file.id]: { status: 'error', progress: 0, error: error.message }
      }));
    }
  };

  const retryUpload = (file: any) => {
    handleUpload(file);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Files</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="text-sm text-gray-500">Loading files from repository...</div>
          )}
          <button
            onClick={loadFiles}
            disabled={loading}
            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {mediaFiles.map((file) => {
          const meta: any = parseMediaFileName(file.name) || {};
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const thumb = thumbnails[baseName];
          const upload = uploadState[file.id] || { status: 'pending', progress: 0 };
          
          return (
            <div key={file.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {/* Main File Info */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {thumb && ((file.isLocal && thumb.isLocal) || (!file.isLocal && !thumb.isLocal)) ? (
                        <img
                          src={thumb.url}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <DefaultThumbnail className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base truncate">
                      {meta.title || file.name}
                    </h3>
                    {meta.author && (
                      <p className="text-sm text-gray-600 mt-1">by {meta.author}</p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button 
                      onClick={() => setPreview(file)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Preview"
                    >
                      <EyeIcon width={16} height={16} />
                    </button>
                    
                    {!file.uploaded && (
                      <>
                        <button 
                          onClick={() => handleEdit(file)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        
                        <button 
                          onClick={() => handleDelete(file.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <DeleteIcon width={16} height={16} />
                        </button>
                      </>
                    )}
                    
                    {file.uploaded && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <CheckIcon width={12} height={12} className="mr-1" />
                        Uploaded
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Metadata Row - Full Width */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {meta.category || file.type}
                    </span>
                    {meta.date && (
                      <span className="text-xs text-gray-500">{formatReadableDate(meta.date)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {file.type === 'audio' ? (
                      <AudioIcon className="text-gray-600" width={14} height={14} />
                    ) : (
                      <VideoIcon className="text-gray-600" width={14} height={14} />
                    )}
                    <span className="text-xs text-gray-600 capitalize">{file.type}</span>
                  </div>
                </div>
              </div>
              
              {/* Upload Section - Only show for non-uploaded files */}
              {!file.uploaded && (
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UploadIcon className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Upload to GitHub</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {upload.status === 'pending' && (
                        <button 
                          onClick={() => handleUpload(file)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Upload
                        </button>
                      )}
                      
                      {upload.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${upload.progress * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-blue-600 font-medium">
                            {Math.round(upload.progress * 100)}%
                          </span>
                        </div>
                      )}
                      
                      {upload.status === 'success' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckIcon />
                          <span className="text-sm font-medium">Uploaded</span>
                        </div>
                      )}
                      
                      {upload.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => retryUpload(file)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Retry
                          </button>
                          {upload.error && (
                            <span className="text-xs text-red-500 max-w-[120px] truncate" title={upload.error}>
                              {upload.error}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => setPreview(null)}
            >
              ×
            </button>
            <h3 className="font-bold mb-4 pr-8">{preview.name}</h3>
            {preview.type === 'audio' ? (
              <audio src={preview.url} controls className="w-full" />
            ) : (
              <video src={preview.url} controls className="w-full max-h-64 rounded" />
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <EditFileModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={() => {
            loadFiles();
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
};

export default FileList; 