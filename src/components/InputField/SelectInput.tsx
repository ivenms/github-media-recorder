import React from 'react';
import type { InputFieldProps } from '../../types';

interface SelectInputProps extends Omit<InputFieldProps, 'type' | 'placeholder' | 'maxLength' | 'max' | 'accept' | 'multiple'> {
  options: Array<{ id: string; name: string }>;
}

const SelectInput: React.FC<SelectInputProps> = ({
  name,
  value,
  required = false,
  disabled = false,
  options,
  error,
  onChange,
  inputClassName = '',
}) => {
  // Bootstrap-style consistent form field styling for mobile-first design
  const getInputStyles = () => {
    if (inputClassName) {
      return inputClassName;
    }
    
    // Standard select styling - consistent across all components
    const errorStyles = error 
      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500';
    
    // Safari/iOS select specific styling to maintain consistent height and appearance
    const selectStyles = 'appearance-none -webkit-appearance-none bg-white';
    
    // Bootstrap-style form control with good mobile touch targets
    return `w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 text-base ${errorStyles} ${selectStyles}`;
  };

  return (
    <select
      {...(name && { name })}
      value={value || ''}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={getInputStyles()}
    >
      {options.length === 0 ? (
        <option value="" disabled>
          No options available
        </option>
      ) : (
        options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))
      )}
    </select>
  );
};

export default SelectInput;