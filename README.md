# Mobile Recorder PWA

A Progressive Web App (PWA) for recording audio and video, converting to MP3/MP4, and uploading to a server. Installable, offline-capable, and optimized for mobile devices.

## Features
- Audio and video recording (WebM, MP3/MP4 conversion)
- File management (list, preview, delete, share)
- Upload with progress and retry
- PWA: installable, offline, responsive
- Mobile-first UI, accessibility, and performance optimizations

## Tech Stack
- React 18+ (TypeScript)
- Vite
- Tailwind CSS
- FFmpeg.js
- Service Worker, Web App Manifest

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## PWA
- Add to home screen on mobile for standalone experience
- Works offline and supports background sync

## Folder Structure
```
src/
  components/
  hooks/
  utils/
  types/
public/
  icons/
```

## License
MIT
