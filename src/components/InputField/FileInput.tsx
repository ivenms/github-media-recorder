import React from 'react';
import type { InputFieldProps } from '../../types';

interface FileInputProps extends Omit<InputFieldProps, 'type' | 'value' | 'placeholder' | 'maxLength' | 'max' | 'options'> {
  accept?: string;
  multiple?: boolean;
}

const FileInput: React.FC<FileInputProps> = ({
  name,
  required = false,
  disabled = false,
  accept,
  multiple = false,
  onChange,
  inputClassName = '',
}) => {
  // File input styling - mobile-friendly with consistent purple theme
  const getInputStyles = () => {
    if (inputClassName) {
      return inputClassName;
    }
    
    // File input has special styling for better mobile experience
    return 'w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100';
  };

  return (
    <input
      type="file"
      {...(name && { name })}
      required={required}
      disabled={disabled}
      accept={accept}
      multiple={multiple}
      onChange={onChange}
      className={getInputStyles()}
    />
  );
};

export default FileInput;