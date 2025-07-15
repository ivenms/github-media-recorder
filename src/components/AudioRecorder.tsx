import React, { useState } from 'react';

const AudioRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  // Placeholder for timer
  React.useEffect(() => {
    let timer: any;
    if (recording) {
      timer = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [recording]);

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-lg font-bold mb-2">Audio Recorder</h2>
      <div className="w-full h-16 bg-gray-200 rounded mb-4 flex items-center justify-center">
        {/* Waveform placeholder */}
        <span className="text-gray-500">[Waveform]</span>
      </div>
      <div className="text-2xl font-mono mb-4">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
      <button
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${recording ? 'bg-red-600' : 'bg-green-600'} text-white text-2xl`}
        onClick={() => setRecording((r) => !r)}
      >
        {recording ? '■' : '●'}
      </button>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={recording || duration === 0}
      >
        Save
      </button>
    </div>
  );
};

export default AudioRecorder; 