# Github Media Recorder App for Mobile

> **Note:** This application serves as the backend for the [@ivenms/react-github-media-library](https://github.com/ivenms/react-github-media-library) library. If you are looking for a React component library to integrate GitHub-based media recording and management into your app, please visit the [react-github-media-library repository](https://github.com/ivenms/react-github-media-library).

A Progressive Web App (PWA) for recording audio and video, converting to MP3/MP4, and uploading to a GitHub repository. Features secure GitHub Personal Access Token authentication, installable PWA functionality, and automatic deployment to GitHub Pages.

🌐 **Live Demo**: [https://ivenms.github.io/github-media-recorder/](https://ivenms.github.io/github-media-recorder/)

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
  - Settings are persisted using Zustand stores with automatic persistence
- **PWA & Mobile-First**
  - Installable as a PWA, with offline support and background sync
  - Mobile-first UI with a fixed bottom navigation bar (Home, Record, Library, Settings)
  - Responsive and accessible design

## Tech Stack
- React 19+ (TypeScript)
- Vite
- Tailwind CSS
- Zustand (state management with persistence)
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
3. The token is stored securely using Zustand's persistent storage

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
  components/      # UI components (recorders, file list, upload manager, settings, navigation, modals)
    icons/         # SVG icon components with consistent props
  hooks/           # Custom React hooks (media recording, file conversion, PWA install, audio form)
  services/        # Worker service management (audio/video processing services)
  stores/          # Zustand stores (auth, settings, files, UI, git state management)
  types/           # TypeScript types organized by feature (components, hooks, stores, utils, workers)
  utils/           # Utilities (file management, media conversion, GitHub API, device detection)
  workers/         # Web Workers (audio/video processing with FFmpeg.js)
public/
  icons/           # PWA icons and assets
```

## Main Components, Hooks & Stores

**Core Components:**
- `AudioRecorder` – Record audio, add metadata, convert and save
- `VideoRecorder` – Record video, add metadata, convert and save with iOS Safari orientation support
- `FileList` – List, preview, delete, and share files with thumbnails
- `UploadManager` – Upload files to GitHub with progress tracking and retry logic
- `Settings` – Configure GitHub repository, authentication, and audio format preferences
- `BottomMenu` – Mobile navigation bar with 4 tabs (home, video, library, settings)
- `Waveform` – Real-time audio waveform visualization during recording

**Modal Components:**
- `AddMediaModal` – Import external media files with metadata
- `EditFileModal` – Edit file metadata and thumbnails
- `Modal` – Global modal management with alert/confirm dialogs
- `TokenSetup` – GitHub Personal Access Token setup and validation
- `InstallPrompt` – PWA installation prompts

**Custom Hooks:**
- `useMediaRecorder` – MediaRecorder API abstraction with iOS-specific handling
- `useFileConverter` – FFmpeg.js conversion operations (audio/video)
- `useAudioRecorder`, `useAudioSave`, `useAudioForm` – Audio recording workflow management
- `useWaveformVisualizer` – Real-time audio visualization
- `useAuth` – Authentication flow with token validation
- `usePWAInstall` – PWA installation prompt management
- `useUploadManager` – File upload orchestration with progress tracking
- `useCombinedFiles` – Merge local and remote file listings

**Services:**
- `audioWorkerService` – Global audio processing service with Web Workers
- `videoWorkerService` – Global video processing service with Web Workers and background alerts

**Zustand Stores:**
- `useAuthStore` – GitHub authentication state and user management (persisted)
- `useSettingsStore` – App settings including audio format and repository configuration (persisted)
- `useFilesStore` – File management, upload progress, and local file operations
- `useUIStore` – Navigation state, current screen, modal state, and loading states
- `useGitStore` – GitHub repository state and remote file caching

## Configuration
All settings are managed through Zustand stores with automatic persistence:

- **Authentication (AuthStore):**
  - Personal Access Token (with repo permissions)
  - Repository Owner and Name
  - User information and token timestamp
- **App Settings (SettingsStore):**
  - Audio format preference (MP3/WAV)
  - Repository upload paths
  - Thumbnail dimensions
  - Custom media categories
- **File Management (FilesStore):**
  - Local file storage and metadata
  - Upload progress tracking
- **UI State (UIStore):**
  - Navigation state
  - Modal management

## License
MIT
