import React, { useEffect, useState } from 'react';
import { listFiles } from '../utils/fileUtils';
import { uploadFile } from '../utils/uploadUtils';
import type { UploadState } from '../types';

const UploadManager: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({});

  const loadFiles = async () => {
    const f = await listFiles();
    setFiles(f);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const startUpload = async (file: any) => {
    setUploadState((s) => ({
      ...s,
      [file.id]: { status: 'uploading', progress: 0 },
    }));
    try {
      await uploadFile(file.file, (p) => {
        setUploadState((s) => ({
          ...s,
          [file.id]: { ...s[file.id], progress: p, status: 'uploading' },
        }));
      });
      setUploadState((s) => ({
        ...s,
        [file.id]: { status: 'success', progress: 1 },
      }));
    } catch (e: any) {
      setUploadState((s) => ({
        ...s,
        [file.id]: { status: 'error', progress: s[file.id]?.progress || 0, error: e.message || 'Upload failed' },
      }));
    }
  };

  const retryUpload = (file: any) => {
    startUpload(file);
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
                <span className={`text-xs font-medium ${state.status === 'success' ? 'text-green-600' : state.status === 'error' ? 'text-red-500' : 'text-blue-500'}`}>{state.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all ${state.status === 'error' ? 'bg-red-400' : state.status === 'success' ? 'bg-green-400' : 'bg-blue-400'}`}
                  style={{ width: `${(state.progress || 0) * 100}%` }}
                />
              </div>
              <div className="flex gap-2 justify-end mt-1">
                {state.status === 'pending' && (
                  <button className="text-xs text-blue-600 hover:bg-blue-100 rounded-full px-3 py-1 transition" onClick={() => startUpload(file)}>
                    Upload
                  </button>
                )}
                {state.status === 'error' && (
                  <>
                    <button className="text-xs text-red-600 hover:bg-red-100 rounded-full px-3 py-1 transition" onClick={() => retryUpload(file)}>
                      Retry
                    </button>
                    <span className="text-xs text-red-500 ml-2">{state.error}</span>
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