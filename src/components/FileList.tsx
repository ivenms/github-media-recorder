import React, { useEffect, useState } from 'react';
import { listFiles, deleteFile } from '../utils/fileUtils';
import Waveform from './Waveform';
import MicIcon from './icons/MicIcon';
import DefaultThumbnail from './icons/DefaultThumbnail';

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

const FileList: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadFiles = async () => {
    const allFiles = await listFiles();
    // Separate media and thumbnails
    const media = allFiles.filter((f: any) => f.type === 'audio' || f.type === 'video');
    const thumbs = allFiles.filter((f: any) => f.type === 'thumbnail');
    // Map thumbnails by base name (without extension)
    const thumbMap: Record<string, any> = {};
    thumbs.forEach((thumb: any) => {
      // Remove extension for matching
      const base = thumb.name.replace(/\.[^.]+$/, '');
      thumbMap[base] = thumb;
    });
    setMediaFiles(media);
    setThumbnails(thumbMap);
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
      <ul className="space-y-4">
        {mediaFiles.map((file) => {
          const meta: any = parseMediaFileName(file.name) || {};
          // Find thumbnail by base name
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const thumb = thumbnails[baseName];
          return (
            <li key={file.id} className="flex items-center justify-between bg-white/70 rounded-2xl shadow-neumorph px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-xl overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb.url}
                      alt="thumbnail"
                      className="w-12 h-12 object-cover rounded-xl"
                    />
                  ) : (
                    <DefaultThumbnail className="w-12 h-12" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-gray-800 text-sm truncate max-w-[10rem] block">{meta.title || file.name}</span>
                  <span className="text-xs text-gray-500">{meta.author ? `by ${meta.author}` : ''}</span>
                  <span className="text-xs text-gray-400">{meta.category || file.type}</span>
                  <span className="text-xs text-gray-400">{meta.date ? `Date: ${meta.date}` : ''}</span>
                  <div className="w-32 h-6 mt-1">
                    {file.type === 'audio' && <Waveform height={24} />}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button className="text-blue-600 hover:bg-blue-100 rounded-full p-2 transition" onClick={() => setPreview(file)} title="Preview">
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="#3B82F6" strokeWidth="2"/><polygon points="8,6 15,10 8,14" fill="#3B82F6"/></svg>
                </button>
                <button className="text-red-500 hover:bg-red-100 rounded-full p-2 transition" onClick={() => handleDelete(file.id)} title="Delete">
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="5" y="8" width="10" height="7" rx="2" stroke="#EF4444" strokeWidth="2"/><rect x="8" y="4" width="4" height="4" rx="2" fill="#EF4444"/></svg>
                </button>
                <button className="text-green-600 hover:bg-green-100 rounded-full p-2 transition" onClick={() => handleShare(file)} disabled={sharing} title="Share">
                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3" stroke="#22C55E" strokeWidth="2"/><path d="M10 13l5-5m0 0l-5-5m5 5H5" stroke="#22C55E" strokeWidth="2"/></svg>
                </button>
              </div>
            </li>
          );
        })}
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