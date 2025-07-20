import React, { useEffect } from 'react';
import { uploadFile } from '../utils/uploadUtils';
import { useFilesStore } from '../stores/filesStore';
import { useUIStore } from '../stores/uiStore';
import type { FileRecord } from '../types';

const UploadManager: React.FC = () => {
  const { files, uploadState, loadFiles, setUploadProgress } = useFilesStore();
  const { openModal } = useUIStore();

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const startUpload = async (file: FileRecord) => {
    setUploadProgress(file.id, { status: 'uploading', progress: 0 });
    
    try {
      await uploadFile(file.file!, (p) => {
        setUploadProgress(file.id, { status: 'uploading', progress: p });
      });
      setUploadProgress(file.id, { status: 'success', progress: 1 });
    } catch (e: unknown) {
      setUploadProgress(file.id, { 
        status: 'error', 
        progress: uploadState[file.id]?.progress || 0, 
        error: e instanceof Error ? e.message : 'Upload failed' 
      });
    }
  };

  const retryUpload = (file: FileRecord) => {
    startUpload(file);
  };

  const showErrorDetails = (error: string) => {
    openModal({
      type: 'error',
      title: 'Upload Error',
      message: error,
      confirmText: 'OK'
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Upload Manager</h2>
      <ul className="space-y-4">
        {files.map((file) => {
          const state = uploadState[file.id] || { status: 'pending', progress: 0 };
          return (
            <li key={file.id} className="bg-white/70 rounded-2xl shadow-neumorph px-4 py-3 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800 text-sm">{file.name}</span>
                <span className={`text-xs font-medium ${state.status === 'success' ? 'text-green-600' : state.status === 'error' ? 'text-red-500' : 'text-purple-500'}`}>{state.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all ${state.status === 'error' ? 'bg-red-400' : state.status === 'success' ? 'bg-green-400' : 'bg-purple-400'}`}
                  style={{ width: `${(state.progress || 0) * 100}%` }}
                />
              </div>
              <div className="flex gap-2 justify-end mt-1">
                {state.status === 'pending' && (
                  <button className={`text-xs text-purple-600 hover:bg-purple-400 rounded-full px-3 py-1 transition bg-purple-500 text-white`} onClick={() => startUpload(file)}>
                    Upload
                  </button>
                )}
                {state.status === 'error' && (
                  <>
                    <button className="text-xs text-red-600 hover:bg-red-100 rounded-full px-3 py-1 transition" onClick={() => retryUpload(file)}>
                      Retry
                    </button>
                    <button 
                      className="text-xs text-red-500 ml-2 underline hover:text-red-700" 
                      onClick={() => showErrorDetails(state.error || 'Unknown error')}
                      title="Click to see error details"
                    >
                      View Error
                    </button>
                  </>
                )}
                {state.status === 'success' && (
                  <span className="text-green-600 text-lg">&#10003;</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UploadManager; 