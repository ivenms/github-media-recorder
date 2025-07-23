import React, { useState } from 'react';
import type { MediaType, AddMediaModalProps } from '../types';
import { getMediaCategories } from '../utils/appConfig';
import { getTodayDateString, isFutureDate } from '../utils/date';
import { useFilesStore } from '../stores/filesStore';
import { formatMediaFileName } from '../utils/fileUtils';
import { convertImageToJpg } from '../utils/fileUtils';
import { validateMultipleFiles, validateFileSize, getFileType, formatBytes, FILE_LIMITS } from '../utils/storageQuota';
import Modal from './Modal';
import InputField from './InputField';
import { useUIStore } from '../stores/uiStore';
import CloseIcon from './icons/CloseIcon';

const AddMediaModal: React.FC<AddMediaModalProps> = ({ onClose, onSave }) => {
  const { modal, openModal, closeModal } = useUIStore();
  const { saveFile } = useFilesStore();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    date: getTodayDateString(),
    category: getMediaCategories()[0].id,
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const oversizedFiles: string[] = [];
      
      for (const file of Array.from(files)) {
        // Check for specific supported formats
        const isValidFormat = 
          file.type === 'audio/mp3' || 
          file.type === 'audio/mpeg' || 
          file.type === 'audio/wav' || 
          file.type === 'audio/wave' || 
          file.type === 'audio/x-wav' ||
          file.type === 'video/mp4' ||
          file.name.toLowerCase().endsWith('.mp3') ||
          file.name.toLowerCase().endsWith('.wav') ||
          file.name.toLowerCase().endsWith('.mp4');
        
        if (!isValidFormat) {
          invalidFiles.push(file.name);
          continue;
        }
        
        // Validate file size
        try {
          await validateFileSize(file, getFileType(file));
          validFiles.push(file);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'File validation failed';
          oversizedFiles.push(`${file.name}: ${errorMessage}`);
        }
      }
      
      // Validate total file selection
      if (validFiles.length > 0) {
        try {
          await validateMultipleFiles(validFiles, getFileType);
          setSelectedFiles(validFiles);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Storage validation failed';
          openModal({ type: 'alert', message: errorMessage, title: 'Storage Error' });
          return;
        }
      } else {
        setSelectedFiles([]);
      }
      
      // Show errors
      const errors: string[] = [];
      
      if (invalidFiles.length > 0) {
        errors.push(`Unsupported files: ${invalidFiles.join(', ')}. Only MP3, WAV, and MP4 files are allowed.`);
      }
      
      if (oversizedFiles.length > 0) {
        errors.push(`Files too large: ${oversizedFiles.join('; ')}`);
      }
      
      if (errors.length > 0) {
        openModal({ type: 'alert', message: errors.join('\n\n'), title: 'File Validation Error' });
      }
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        await validateFileSize(file, 'thumbnail');
        setThumbnailFile(file);
        const url = URL.createObjectURL(file);
        setThumbnailPreview(url);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Thumbnail validation failed';
        openModal({ type: 'alert', message: errorMessage, title: 'Thumbnail Error' });
        // Clear the file input
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      openModal({ type: 'alert', message: 'Please select at least one media file.', title: 'No Files Selected' });
      return;
    }

    if (!formData.title.trim() || !formData.author.trim()) {
      openModal({ type: 'alert', message: 'Title and Author are required.', title: 'Missing Information' });
      return;
    }

    setIsUploading(true);
    
    try {
      const mediaCategories = getMediaCategories();
      const catObj = mediaCategories.find(c => c.id === formData.category);
      const catName = catObj ? catObj.name : formData.category;

      for (const file of selectedFiles) {
        // Determine file extension based on file name and type
        let extension: string;
        const originalFileName = file.name.toLowerCase();
        
        if (originalFileName.endsWith('.mp3') || file.type === 'audio/mp3' || file.type === 'audio/mpeg') {
          extension = 'mp3';
        } else if (originalFileName.endsWith('.wav') || file.type === 'audio/wav' || file.type === 'audio/wave' || file.type === 'audio/x-wav') {
          extension = 'wav';
        } else if (originalFileName.endsWith('.mp4') || file.type === 'video/mp4') {
          extension = 'mp4';
        } else {
          // This shouldn't happen due to validation, but fallback
          extension = originalFileName.split('.').pop() || 'unknown';
        }
        
        // Generate filename
        const fileName = formatMediaFileName({
          category: catName,
          title: formData.title,
          author: formData.author,
          date: formData.date,
          extension: extension,
        });

        // Save the media file
        const fileData = {
          name: fileName,
          type: (extension === 'mp4' ? 'video' : 'audio') as MediaType,
          mimeType: file.type,
          size: file.size,
          duration: 0, // We don't have duration info for imported files
          created: Date.now(),
        };
        
        await saveFile(file, fileData);
        console.log('Imported file:', fileName);

        // Save thumbnail if provided (only for the first file to avoid duplicates)
        if (thumbnailFile && selectedFiles.indexOf(file) === 0) {
          try {
            const jpgBlob = await convertImageToJpg(thumbnailFile);
            const thumbName = fileName.replace(/\.[^.]+$/, '.jpg');
            await saveFile(jpgBlob, {
              name: thumbName,
              type: 'thumbnail',
              mimeType: 'image/jpeg',
              size: jpgBlob.size,
              duration: 0,
              created: Date.now(),
            });
          } catch (error) {
            console.error('Thumbnail conversion failed:', error);
          }
        }
      }
      
      openModal({ 
        type: 'success', 
        message: `Successfully imported ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}!`, 
        title: 'Import Complete' 
      });
      onSave();
    } catch (error) {
      console.error('Error importing files:', error);
      openModal({ type: 'error', message: 'Failed to import files. Please try again.', title: 'Import Error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add Media Files</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <InputField
              label="Select Media Files"
              type="file"
              accept=".mp3,.wav,.mp4,audio/mp3,audio/mpeg,audio/wav,audio/wave,audio/x-wav,video/mp4"
              multiple
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: MP3, WAV, MP4 only<br/>
              Max size: {formatBytes(FILE_LIMITS.MAX_AUDIO_SIZE)} for audio, {formatBytes(FILE_LIMITS.MAX_VIDEO_SIZE)} for video
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1">Selected files:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="truncate">• {file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <InputField
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter media title"
            maxLength={100}
            required
          />
          
          <InputField
            label="Author"
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="Enter author name"
            maxLength={50}
            required
          />
          
          <InputField
            label="Category"
            type="select"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={getMediaCategories()}
          />
          
          <InputField
            label="Date"
            type="date"
            value={formData.date}
            max={getTodayDateString()}
            onChange={(e) => {
              const selectedDate = e.target.value;
              if (!isFutureDate(selectedDate)) {
                setFormData({ ...formData, date: selectedDate });
              }
            }}
            required
          />
          
          <div>
            <InputField
              label="Thumbnail (Optional)"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
            />
            <div className="space-y-2 mt-2">
              {thumbnailPreview && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Thumbnail preview:</p>
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Upload a thumbnail image (will be applied to all imported files)<br/>
                Max size: {formatBytes(FILE_LIMITS.MAX_THUMBNAIL_SIZE)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-400 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Importing...' : 'Import Files'}
            </button>
          </div>
        </form>
      </div>
      
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

export default AddMediaModal;