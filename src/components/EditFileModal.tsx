import React, { useState } from 'react';
import { getMediaCategories } from '../utils/appConfig';
import { getTodayDateString, isFutureDate } from '../utils/date';
import { parseMediaFileName } from '../utils/fileUtils';
import { validateFileSize, formatBytes, FILE_LIMITS } from '../utils/storageQuota';
import { useFilesStore } from '../stores/filesStore';
import Modal from './Modal';
import InputField from './InputField';
import { useUIStore } from '../stores/uiStore';
import CloseIcon from './icons/CloseIcon';
import type { ParsedMediaFileName, EditFileModalProps } from '../types';

const EditFileModal: React.FC<EditFileModalProps> = ({ file, onClose, onSave, thumbnail }) => {
  const { modal, openModal, closeModal } = useUIStore();
  const { updateFileWithThumbnail } = useFilesStore();
  const meta: ParsedMediaFileName | null = parseMediaFileName(file.name);
  const [formData, setFormData] = useState({
    title: meta?.title || '',
    author: meta?.author || '',
    date: meta?.date || getTodayDateString(),
    category: meta?.category || 'Music',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    thumbnail || null
  );

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
    
    try {
      // Create new filename with updated metadata
      const extension = file.name.split('.').pop();
      const newName = `${formData.category}_${formData.title}_${formData.author}_${formData.date}.${extension}`;
      
      // Update the file using store method
      await updateFileWithThumbnail(file.id, newName, thumbnailFile);
      
      openModal({ type: 'success', message: 'File metadata updated successfully!', title: 'Success' });
      onSave(file.id);
    } catch (error) {
      console.error('Error updating file:', error);
      openModal({ type: 'error', message: 'Failed to update file metadata. Please try again.', title: 'Error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit File</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          
          <InputField
            label="Author"
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
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
              label="Thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
            />
            <div className="space-y-2 mt-2">
              {thumbnailPreview && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    {thumbnailFile ? 'New thumbnail preview:' : 'Current thumbnail:'}
                  </p>
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
                {thumbnail ? 'Upload a new thumbnail to replace the current one (optional)' : 'Upload a thumbnail image (optional)'}<br/>
                Max size: {formatBytes(FILE_LIMITS.MAX_THUMBNAIL_SIZE)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-400 transition-colors"
            >
              Save Changes
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

export default EditFileModal;