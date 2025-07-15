import React, { useEffect, useState } from 'react';
import { listFiles, deleteFile } from '../utils/fileUtils';

const FileList: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadFiles = async () => {
    const f = await listFiles();
    setFiles(f);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    loadFiles();
  };

  const handleShare = async (file: any) => {
    setSharing(true);
    try {
      if (navigator.share && file.file) {
        const shareData: any = {
          title: file.name,
          files: [new File([file.file], file.name, { type: file.mimeType })],
        };
        await navigator.share(shareData);
      } else {
        alert('Web Share API not supported.');
      }
    } catch (e) {
      alert('Share failed.');
    }
    setSharing(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Files</h2>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between bg-gray-100 rounded px-3 py-2">
            <div>
              <span className="font-mono text-sm">{file.name}</span>
              <span className="ml-2 text-xs text-gray-500">[{file.type}]</span>
            </div>
            <div className="flex gap-2">
              <button className="text-blue-600 hover:underline text-xs" onClick={() => setPreview(file)}>Preview</button>
              <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(file.id)}>Delete</button>
              <button className="text-green-600 hover:underline text-xs" onClick={() => handleShare(file)} disabled={sharing}>Share</button>
            </div>
          </li>
        ))}
      </ul>
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-lg" onClick={() => setPreview(null)}>&times;</button>
            <h3 className="font-bold mb-2">{preview.name}</h3>
            {preview.type === 'audio' ? (
              <audio src={preview.url} controls className="w-full" />
            ) : (
              <video src={preview.url} controls className="w-full max-h-64" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList; 