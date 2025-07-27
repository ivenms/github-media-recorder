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

// Props for InputField component
export interface InputFieldProps {
  label?: string;
  name?: string; // Important for form handling
  type?: 'text' | 'email' | 'password' | 'date' | 'file' | 'select' | 'number';
  value?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  max?: string; // for date inputs
  accept?: string; // for file inputs
  multiple?: boolean; // for file inputs
  options?: Array<{ id: string; name: string }>; // for select inputs
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void;
  className?: string;
  inputClassName?: string;
}

// Props for SaveButton component
export interface SaveButtonProps {
  saving: boolean;
  saved: boolean;
  saveProgress?: number;
  savePhase?: string;
  disabled: boolean;
  onClick: () => void;
  label?: string;
}

