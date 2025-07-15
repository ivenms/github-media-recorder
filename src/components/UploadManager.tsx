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
      <ul className="space-y-2">
        {files.map((file) => {
          const state = uploadState[file.id] || { status: 'pending', progress: 0 };
          return (
            <li key={file.id} className="bg-gray-100 rounded px-3 py-2 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">{state.status}</span>
              </div>
              <div className="w-full bg-gray-300 rounded h-2 mb-1">
                <div
                  className={`h-2 rounded ${state.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${(state.progress || 0) * 100}%` }}
                />
              </div>
              {state.status === 'pending' && (
                <button className="text-xs text-blue-600 hover:underline self-end" onClick={() => startUpload(file)}>
                  Upload
                </button>
              )}
              {state.status === 'error' && (
                <button className="text-xs text-red-600 hover:underline self-end" onClick={() => retryUpload(file)}>
                  Retry
                </button>
              )}
              {state.status === 'error' && (
                <div className="text-xs text-red-600">{state.error}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UploadManager; 