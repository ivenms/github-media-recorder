import React, { useState } from 'react';
import { getMediaCategories } from '../utils/appConfig';
import { getTodayDateString, isFutureDate } from '../utils/date';
import { updateFile, saveFile, parseMediaFileName } from '../utils/fileUtils';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';
import CloseIcon from './icons/CloseIcon';
import type { ParsedMediaFileName, EditFileModalProps } from '../types';

const EditFileModal: React.FC<EditFileModalProps> = ({ file, onClose, onSave, thumbnail }) => {
  const { modalState, showAlert, closeModal } = useModal();
  const meta: ParsedMediaFileName | null = parseMediaFileName(file.name);
  const [formData, setFormData] = useState({
    title: meta?.title || '',
    author: meta?.author || '',
    date: meta?.date || new Date().toISOString().split('T')[0],
    category: meta?.category || 'Music',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    thumbnail || null
  );

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
      const url = URL.createObjectURL(file);
      setThumbnailPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create new filename with updated metadata
      const extension = file.name.split('.').pop();
      const newName = `${formData.category}_${formData.title}_${formData.author}_${formData.date}.${extension}`;
      
      // Update the file metadata in IndexedDB
      await updateFile(file.id, {
        name: newName
      });
      
      // Handle thumbnail update if a new file was selected
      if (thumbnailFile) {
        const baseName = newName.replace(/\.[^.]+$/, '');
        const thumbnailName = `${baseName}.jpg`;
        
        await saveFile(thumbnailFile, {
          name: thumbnailName,
          type: 'thumbnail',
          mimeType: 'image/jpeg',
          size: thumbnailFile.size,
          created: Date.now()
        });
      } else if (thumbnail && file.name !== newName) {
        // If filename changed but no new thumbnail uploaded, update existing thumbnail name to match
        const oldBaseName = file.name.replace(/\.[^.]+$/, '');
        const newBaseName = newName.replace(/\.[^.]+$/, '');
        
        if (oldBaseName !== newBaseName) {
          // Note: thumbnail update logic would need to be implemented
        }
      }
      
      showAlert('File metadata updated successfully!', 'Success');
      onSave(file.id);
    } catch (error) {
      console.error('Error updating file:', error);
      showAlert('Failed to update file metadata. Please try again.', 'Error');
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
            >
              {getMediaCategories().map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              max={getTodayDateString()}
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (!isFutureDate(selectedDate)) {
                  setFormData({ ...formData, date: selectedDate });
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail
            </label>
            <div className="space-y-2">
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
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-gray-500">
                {thumbnail ? 'Upload a new thumbnail to replace the current one (optional)' : 'Upload a thumbnail image (optional)'}
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

export default EditFileModal;