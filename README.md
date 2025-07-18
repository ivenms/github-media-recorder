# Mobile Recorder PWA

A Progressive Web App (PWA) for recording audio and video, converting to MP3/MP4, and uploading to a GitHub repository. Features secure GitHub Personal Access Token authentication, installable PWA functionality, and automatic deployment to GitHub Pages.

## Features
- **GitHub Personal Access Token Authentication**
  - Secure authentication using GitHub Personal Access Tokens
  - Token validation and expiration handling
  - Comprehensive setup instructions
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
  - Upload files to your GitHub repositories using Personal Access Tokens
  - Upload progress bar, status (pending, uploading, success, error), and retry on failure
  - Configurable upload path in repository settings
- **Settings**
  - Configure repository and upload path
  - Choose preferred audio format (MP3/WAV)
  - Settings are persisted in localStorage
- **PWA & Mobile-First**
  - Installable as a PWA, with offline support and background sync
  - Mobile-first UI with a fixed bottom navigation bar (Home, Record, Library, Settings)
  - Responsive and accessible design

## Tech Stack
- React 19+ (TypeScript)
- Vite
- Tailwind CSS
- FFmpeg.js (for media conversion)
- GitHub API
- Service Worker, Web App Manifest

## Development Setup

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
# Base URL for deployment (optional, defaults to '/')
VITE_BASE_URL=/your-repo-name/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. GitHub Personal Access Token Setup

The app will guide you through creating a Personal Access Token on first launch:

1. The app will show detailed instructions when you first run it
2. You'll need to create a token with `repo` scope
3. The token is stored securely in your browser's local storage

## Deployment

### GitHub Pages Deployment

This project includes automated GitHub Actions deployment to GitHub Pages.

#### 1. Repository Secrets Setup

Add this secret in your GitHub repository (**Settings** → **Secrets and variables** → **Actions**):

- `VITE_BASE_URL`: Your deployment path (e.g., `/github-media-recorder/`)

#### 2. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"

#### 3. Deploy

Push to the `main` branch to trigger automatic deployment:

```bash
git push origin main
```

The app will be available at: `https://yourusername.github.io/your-repo-name/`

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

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
