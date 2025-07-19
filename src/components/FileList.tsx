import React, { useEffect, useState } from 'react';
import { listFiles, deleteFile, saveFile, parseMediaFileName } from '../utils/fileUtils';
import { uploadFile, uploadThumbnail } from '../utils/uploadUtils';
import { fetchRemoteFiles, extractDateFromFilename } from '../utils/githubUtils';
import { formatReadableDate } from '../utils/date';
import { processThumbnailForUpload } from '../utils/imageUtils';
import DefaultThumbnail from './icons/DefaultThumbnail';
import PlayIcon from './icons/PlayIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import UploadIcon from './icons/UploadIcon';
import CheckIcon from './icons/CheckIcon';
import AudioIcon from './icons/AudioIcon';
import VideoIcon from './icons/VideoIcon';
import CloseIcon from './icons/CloseIcon';
import EditFileModal from './EditFileModal';
import AddMediaModal from './AddMediaModal';
import Modal from './Modal';
import Header from './Header';
import { useModal } from '../hooks/useModal';
import type { FileListProps } from '../types';

const FileList: React.FC<FileListProps> = ({ highlightId }) => {
  const { modalState, showAlert, closeModal } = useModal();
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any | null>(null);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [showAddMediaModal, setShowAddMediaModal] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<Record<string, { status: string; progress: number; error?: string }>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId || null);

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
      
      // Sort by date (descending), then by creation timestamp for same-day files
      allMediaFiles.sort((a: any, b: any) => {
        const dateA = extractDateFromFilename(a.name);
        const dateB = extractDateFromFilename(b.name);
        
        // Primary sort: by date (descending)
        const dateDiff = dateB.getTime() - dateA.getTime();
        if (dateDiff !== 0) return dateDiff;
        
        // Secondary sort: by creation timestamp (descending) for same-day files
        const createdA = a.created || 0;
        const createdB = b.created || 0;
        return createdB - createdA;
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

  // Update highlighted ID when prop changes
  useEffect(() => {
    setHighlightedId(highlightId || null);
  }, [highlightId]);

  // Scroll to highlighted item when it becomes available
  useEffect(() => {
    if (highlightedId && mediaFiles.length > 0) {
      const element = document.getElementById(`file-${highlightedId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedId, mediaFiles]);

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    loadFiles();
  };

  const handleEdit = (file: any) => {
    setEditingFile(file);
  };

  const handleUpload = async (file: any) => {
    if (!file.file) {
      showAlert('File data not available for upload.', 'Upload Error');
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

  const handleAddMedia = () => {
    setShowAddMediaModal(true);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Media Library" />
      
      {/* Action Buttons Row - Hide when loading */}
      {!loading && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={loadFiles}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md transition-all shadow-sm border border-gray-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleAddMedia}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/95 backdrop-blur-sm text-white hover:bg-purple-600 hover:shadow-lg transition-all shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Media
            </button>
          </div>
        </div>
      )}
      
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <div className="text-gray-600 font-medium">Loading files from repository...</div>
          </div>
        ) : (
          <div className="space-y-4">
        {mediaFiles.map((file) => {
          const meta: any = parseMediaFileName(file.name) || {};
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const thumb = thumbnails[baseName];
          const upload = uploadState[file.id] || { status: 'pending', progress: 0 };
          
          const isHighlighted = highlightedId === file.id;
          
          return (
            <div 
              key={file.id} 
              id={`file-${file.id}`}
              className={`bg-white rounded-xl shadow-md border overflow-hidden transition-all duration-500 ${
                isHighlighted 
                  ? 'border-purple-500 bg-purple-50 shadow-lg ring-2 ring-purple-200' 
                  : 'border-gray-100'
              }`}
            >
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
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                      title="Preview"
                    >
                      <PlayIcon width={16} height={16} />
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
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
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
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-500 text-white hover:bg-purple-400 transition-colors"
                        >
                          Upload
                        </button>
                      )}
                      
                      {upload.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${upload.progress * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-purple-600 font-medium">
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
        )}
      </div>
      
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <button 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setPreview(null)}
              title="Close"
            >
              <CloseIcon width={20} height={20} />
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
          thumbnail={thumbnails[editingFile.name.replace(/\.[^.]+$/, '')]}
          onClose={() => setEditingFile(null)}
          onSave={(fileId) => {
            loadFiles();
            setEditingFile(null);
            if (fileId) {
              setHighlightedId(fileId);
            }
          }}
        />
      )}

      {/* Add Media Modal */}
      {showAddMediaModal && (
        <AddMediaModal
          onClose={() => setShowAddMediaModal(false)}
          onSave={() => {
            loadFiles();
            setShowAddMediaModal(false);
          }}
        />
      )}
      
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default FileList; 