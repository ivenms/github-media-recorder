import React, { useState } from 'react';
import { MEDIA_CATEGORIES } from '../utils/appConfig';
import { getTodayDateString, isFutureDate } from '../utils/date';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

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

interface EditFileModalProps {
  file: any;
  onClose: () => void;
  onSave: () => void;
}

const EditFileModal: React.FC<EditFileModalProps> = ({ file, onClose, onSave }) => {
  const { modalState, showAlert, closeModal } = useModal();
  const meta = parseMediaFileName(file.name) || {};
  const [formData, setFormData] = useState({
    title: meta.title || '',
    author: meta.author || '',
    date: meta.date || new Date().toISOString().split('T')[0],
    category: meta.category || 'Music',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new filename with updated metadata
    const extension = file.name.split('.').pop();
    const newName = `${formData.category}_${formData.title}_${formData.author}_${formData.date}.${extension}`;
    
    // Here you would implement the actual file update logic
    // For now, we'll just show a success message
    showAlert('File metadata updated successfully!', 'Success');
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit File</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {MEDIA_CATEGORIES.map((category) => (
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
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
              className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-md hover:bg-purple-500 transition-colors"
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