import React from 'react';
import type { InputFieldProps } from '../../types';

interface TextInputProps extends Omit<InputFieldProps, 'type' | 'options' | 'accept' | 'multiple'> {
  type?: 'text' | 'email' | 'password' | 'date' | 'number';
}

const TextInput: React.FC<TextInputProps> = ({
  type = 'text',
  name,
  value,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  max,
  error,
  onChange,
  inputClassName = '',
}) => {
  // Bootstrap-style consistent form field styling for mobile-first design
  const getInputStyles = () => {
    if (inputClassName) {
      return inputClassName;
    }
    
    // Standard input styling - consistent across all components
    const errorStyles = error 
      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500';
    
    // Safari/iOS date input specific styling to maintain consistent width
    const dateInputStyles = type === 'date' 
      ? 'appearance-none -webkit-appearance-none' 
      : '';
    
    // Bootstrap-style form control with good mobile touch targets
    return `w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 text-base ${errorStyles} ${dateInputStyles}`;
  };

  return (
    <input
      type={type}
      {...(name && { name })}
      value={value || ''}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      maxLength={maxLength}
      max={max}
      onChange={onChange}
      className={getInputStyles()}
    />
  );
};

export default TextInput;