// Utility for initializing FFmpeg and converting media files
// - Convert audio to MP3
// - Convert video to MP4
// - Handle progress and errors

import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();
await ffmpeg.load();

export async function convertToMp3(input: Uint8Array, onProgress?: (p: number) => void): Promise<Uint8Array> {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => onProgress(progress));
  }
  await ffmpeg.writeFile('input.webm', input);
  await ffmpeg.exec(['-i', 'input.webm', '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', 'output.mp3']);
  const fileData = await ffmpeg.readFile('output.mp3');
  return fileData instanceof Uint8Array ? fileData : new Uint8Array([...fileData].map(c => c.charCodeAt(0)));
}

export async function convertToMp4(input: Uint8Array, onProgress?: (p: number) => void): Promise<Uint8Array> {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => onProgress(progress));
  }
  await ffmpeg.writeFile('input.webm', input);
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-movflags', 'faststart',
    '-pix_fmt', 'yuv420p',
    'output.mp4',
  ]);
  const fileData = await ffmpeg.readFile('output.mp4');
  return fileData instanceof Uint8Array ? fileData : new Uint8Array([...fileData].map(c => c.charCodeAt(0)));
} 