import React, { useEffect, useState } from 'react';
import { parseMediaFileName } from '../utils/fileUtils';
import { formatReadableDate } from '../utils/date';
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
import GitHubImage from './GitHubImage';
import GitHubMedia from './GitHubMedia';
import { useUIStore } from '../stores/uiStore';
import { useCombinedFiles } from '../hooks/useCombinedFiles';
import { useUploadManager } from '../hooks/useUploadManager';
import type { FileListProps, FileRecord, EnhancedFileRecord } from '../types';

const FileList: React.FC<FileListProps> = ({ highlightId }) => {
  const { modal, closeModal, openModal } = useUIStore();
  const { 
    files: mediaFiles, 
    thumbnails,
    uploadState, 
    isLoading: loading, 
    remoteError,
    loadFilesWithThumbnails,
    refreshAllFiles,
    removeFile, 
    setRemoteError
  } = useCombinedFiles();
  
  // Use upload manager for all upload-related business logic
  const { uploadFile: uploadWithManagement, retryUpload } = useUploadManager();
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [showAddMediaModal, setShowAddMediaModal] = useState<boolean>(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId || null);

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

  // Show error modal when remoteError is set
  useEffect(() => {
    if (remoteError) {
      openModal({
        type: 'error',
        title: 'Repository Error',
        message: `${remoteError}\n\nShowing local files only. Check your GitHub settings to view remote files.`,
        confirmText: 'OK',
        onConfirm: () => {
          setRemoteError(null);
          closeModal();
        }
      });
    }
  }, [remoteError, openModal, closeModal, setRemoteError]);

  const handleDelete = async (id: string) => {
    await removeFile(id);
  };

  const handleEdit = (file: EnhancedFileRecord) => {
    setEditingFile(file);
  };

  const handleUpload = async (file: EnhancedFileRecord) => {
    await uploadWithManagement(file);
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
              onClick={refreshAllFiles}
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
          const meta = parseMediaFileName(file.name) || { title: '', author: '', category: '', date: '' };
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const thumb = thumbnails[baseName];
          const upload = uploadState[file.id] || { status: 'pending', progress: 0 };
          
          const isHighlighted = highlightedId === file.id;
          
          return (
            <div 
              key={`${file.id}-${file.isLocal ? 'local' : 'remote'}`} 
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
                      {thumb && ((file.isLocal && (thumb as FileRecord & {isLocal: boolean}).isLocal) || (!file.isLocal && !(thumb as FileRecord & {isLocal: boolean}).isLocal)) ? (
                        // For local thumbnails, use direct URL; for remote, use GitHubImage
                        file.isLocal ? (
                          <img
                            src={thumb.url}
                            alt="thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GitHubImage
                            filePath={thumb.url || ''}
                            alt="thumbnail"
                            className="w-full h-full object-cover"
                            fallback={<DefaultThumbnail className="w-8 h-8 text-gray-400" />}
                          />
                        )
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
      
      {/* Preview Modal - Mini Player */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
          {/* Backdrop - Click to close */}
          <div 
            className="absolute inset-0" 
            onClick={() => setPreview(null)}
          />
          
          {/* Mini Player - Bottom aligned, full width, above BottomMenu */}
          <div className="absolute bottom-0 left-0 right-0 pb-20 bg-gradient-to-t from-purple-900 via-purple-800 to-purple-700 text-white shadow-2xl">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-600/30">
              <div className="flex-1">
                <h3 className="font-semibold text-base truncate">
                  {(() => {
                    const meta = parseMediaFileName(preview.name);
                    return meta?.title || preview.name.replace(/\.[^.]+$/, '');
                  })()}
                </h3>
                {(() => {
                  const meta = parseMediaFileName(preview.name);
                  return meta?.author && (
                    <p className="text-sm text-purple-200 mt-0.5">by {meta.author}</p>
                  );
                })()}
              </div>
              <button 
                className="p-1.5 bg-white text-purple-600 hover:bg-gray-100 rounded-full transition-colors ml-3 flex items-center justify-center"
                onClick={() => setPreview(null)}
                title="Close"
              >
                <CloseIcon width={20} height={20} />
              </button>
            </div>
            
            {/* Media Player */}
            <div className="px-2 pt-0 pb-6">
              {/* Use GitHubMedia for remote files, direct src for local files */}
              {(preview as EnhancedFileRecord).isLocal ? (
                preview.type === 'audio' ? (
                  <audio 
                    src={preview.url} 
                    controls 
                    className="w-full h-12 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                ) : (
                  <video 
                    src={preview.url} 
                    controls 
                    className="w-full max-h-80 rounded-lg shadow-xl"
                  />
                )
              ) : (
                <GitHubMedia
                  filePath={preview.url || ''}
                  type={preview.type as 'audio' | 'video'}
                  className={preview.type === 'audio' ? 
                    "w-full h-12 rounded-lg" : 
                    "w-full max-h-80 rounded-lg shadow-xl"
                  }
                  fallback={
                    <div className="w-full h-32 bg-purple-600/30 rounded-lg flex items-center justify-center">
                      <span className="text-purple-200">Unable to load media</span>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <EditFileModal
          file={editingFile}
          thumbnail={thumbnails[editingFile.name.replace(/\.[^.]+$/, '')]?.url || undefined}
          onClose={() => setEditingFile(null)}
          onSave={(fileId) => {
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
            loadFilesWithThumbnails();
            setShowAddMediaModal(false);
          }}
        />
      )}
      
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message || ''}
        type={modal.type || 'alert'}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </div>
  );
};

export default FileList; 