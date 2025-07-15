# Mobile Recorder PWA

A Progressive Web App (PWA) for recording audio and video, converting to MP3/MP4, and uploading to a GitHub repository. Installable, offline-capable, and optimized for mobile devices.

## Features
- **Audio & Video Recording**
  - Record audio (WebM, convert to MP3/WAV) and video (WebM, convert to MP4)
  - Add metadata: title, author, category, date, and optional thumbnail
  - Real-time waveform visualization for audio
  - Input validation for metadata fields
- **File Management**
  - Files are stored in IndexedDB for offline access
  - List, preview (modal for audio/video), delete, and share files (Web Share API)
  - Thumbnails supported for both audio and video files
- **Upload to GitHub**
  - Upload files to a user-specified GitHub repository (requires personal access token, owner, repo)
  - Upload progress bar, status (pending, uploading, success, error), and retry on failure
  - Uploads to a `media/` directory in the repo
- **Settings**
  - Configure GitHub token, owner, repo, and preferred audio format (MP3/WAV)
  - Settings are persisted in localStorage
- **PWA & Mobile-First**
  - Installable as a PWA, with offline support and background sync
  - Mobile-first UI with a fixed bottom navigation bar (Home, Record, Library, Settings)
  - Responsive and accessible design

## Tech Stack
- React 18+ (TypeScript)
- Vite
- Tailwind CSS
- FFmpeg.js (for media conversion)
- Service Worker, Web App Manifest

## Getting Started

```bash
npm install
npm run dev
```

1. Open the app in your browser.
2. Go to **Settings** and enter your GitHub Personal Access Token, repository owner, and repository name to enable uploads.
3. Choose your preferred audio format (MP3 or WAV).

## Build for Production

```bash
npm run build
```

## PWA Usage
- Add to home screen on mobile for a standalone, native-like experience
- Works offline and supports background sync

## Folder Structure
```
src/
  components/      # UI components (recorders, file list, upload manager, settings, navigation, icons, waveform)
  hooks/           # Custom React hooks (media recording, file conversion, PWA install)
  utils/           # Utilities (file management, media conversion, upload logic)
  types/           # TypeScript types (files, settings, upload state)
public/
  icons/
```

## Main Components & Hooks
- `AudioRecorder` – Record audio, add metadata, convert and save
- `VideoRecorder` – Record video, add metadata, convert and save
- `FileList` – List, preview, delete, and share files
- `UploadManager` – Upload files to GitHub with progress and retry
- `Settings` – Configure GitHub and audio format
- `BottomMenu` – Mobile navigation bar
- `Waveform` – Audio waveform visualization
- `useMediaRecorder` – Custom hook for media recording
- `useFileConverter` – Custom hook for file conversion (FFmpeg.js)
- `usePWAInstall` – (Planned) Custom hook for PWA install prompt

## Configuration
- **GitHub Settings:**
  - Personal Access Token (with repo permissions)
  - Repository Owner
  - Repository Name
- **Audio Format:**
  - Choose between MP3 and WAV for audio recordings

## License
MIT
