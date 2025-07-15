import React, { useState } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { saveFile } from '../utils/fileUtils';
import { useFileConverter } from '../hooks/useFileConverter';

const VideoRecorder: React.FC = () => {
  const {
    recording,
    paused,
    error,
    duration,
    audioUrl,
    audioBlob,
    start,
    stop,
    pause,
    resume,
    videoUrl,
    videoBlob,
  } = useMediaRecorder({ video: true, audio: true });

  const { convert, progress: convertProgress, error: convertError } = useFileConverter();

  // For video, use videoUrl/videoBlob if available, else fallback to audioUrl/audioBlob
  const mediaUrl = (videoUrl as string) || (audioUrl as string) || null;
  const mediaBlob = (videoBlob as Blob) || (audioBlob as Blob) || null;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!mediaBlob) return;
    setSaving(true);
    let outBlob = mediaBlob;
    let outName = `video-${Date.now()}.webm`;
    let outMime = mediaBlob.type;
    try {
      // Convert to MP4 using useFileConverter hook
      const arrayBuffer = await mediaBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const mp4Data = await convert('mp4', uint8);
      if (!mp4Data) throw new Error('MP4 conversion failed');
      outBlob = new Blob([mp4Data], { type: 'video/mp4' });
      outName = `video-${Date.now()}.mp4`;
      outMime = 'video/mp4';
    } catch (err) {
      // fallback: save original if conversion fails
      console.error('MP4 conversion failed:', err);
    }
    await saveFile(outBlob, {
      name: outName,
      type: 'video',
      mimeType: outMime,
      size: outBlob.size,
      duration,
      created: Date.now(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-lg font-bold mb-2">Video Recorder</h2>
      <div className="w-full h-48 bg-gray-300 rounded mb-4 flex items-center justify-center">
        {mediaUrl ? (
          <video src={mediaUrl} controls className="w-full h-48 object-contain rounded" />
        ) : (
          <span className="text-gray-500">{recording ? '[Recording...]' : '[Camera Preview]'}</span>
        )}
      </div>
      <div className="text-2xl font-mono mb-4">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {convertError && <div className="text-red-600 mb-2">{convertError}</div>}
      <div className="flex gap-2 mb-4">
        {!recording && (
          <button
            className="w-16 h-16 rounded-full bg-green-600 text-white text-2xl flex items-center justify-center"
            onClick={start}
          >
            ●
          </button>
        )}
        {recording && (
          <>
            <button
              className="w-16 h-16 rounded-full bg-red-600 text-white text-2xl flex items-center justify-center"
              onClick={stop}
            >
              ■
            </button>
            <button
              className="w-10 h-10 rounded-full bg-yellow-500 text-white text-lg flex items-center justify-center"
              onClick={paused ? resume : pause}
            >
              {paused ? '▶' : '⏸'}
            </button>
          </>
        )}
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={recording || !mediaBlob || saving}
        onClick={handleSave}
      >
        {saving ? (convertProgress > 0 && convertProgress < 1 ? `Converting... ${(convertProgress * 100).toFixed(0)}%` : 'Saving...') : saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  );
};

export default VideoRecorder; 