// Component props and component-related type definitions
import React from 'react';
import type { FileRecord } from './index';

// AddMediaModal component
export interface AddMediaModalProps {
  onClose: () => void;
  onSave: () => void;
}

// Modal component
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
}

// Header component
export interface HeaderProps {
  title: string;
  children?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

// Waveform component
export interface WaveformProps {
  data?: number[]; // Array of amplitude values (0-1)
  color?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
  stream?: MediaStream;
}

// Base icon component props (shared interface for all icons)
export interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

// Specific icon props (extending base IconProps for future extensibility)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AudioIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VideoIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UploadIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DeleteIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EditIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CheckIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CloseIconProps extends IconProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EyeIconProps extends IconProps {}

// Props for AudioRecorder
export interface AudioRecorderProps {
  audioFormat: 'mp3' | 'wav';
}

// Props for VideoRecorder
export type VideoRecorderProps = object;

// Props for FileList
export interface FileListProps {
  highlightId?: string;
}

// Props for Settings
export interface SettingsProps {
  audioFormat: 'mp3' | 'wav';
  setAudioFormat: (format: 'mp3' | 'wav') => void;
  onLogout: () => void;
}

// Props for TokenSetup
export interface TokenSetupProps {
  onSuccess: () => void;
}

// Props for EditFileModal
export interface EditFileModalProps {
  file: FileRecord;
  onClose: () => void;
  onSave: (fileId?: string) => void;
  thumbnail?: string;
}