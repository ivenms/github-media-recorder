import React from 'react';
import type { InputFieldProps } from '../../types';
import TextInput from './TextInput';
import SelectInput from './SelectInput';
import FileInput from './FileInput';

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  max,
  accept,
  multiple = false,
  options = [],
  error,
  onChange,
  className = '',
  inputClassName = '',
}) => {
  const renderInput = () => {
    // Select appropriate specialized component based on input type
    if (type === 'select' && options.length > 0) {
      return (
        <SelectInput
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          options={options}
          error={error}
          onChange={onChange}
          inputClassName={inputClassName}
        />
      );
    }

    if (type === 'file') {
      return (
        <FileInput
          name={name}
          required={required}
          disabled={disabled}
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          inputClassName={inputClassName}
        />
      );
    }

    // For text, email, password, date, number inputs
    return (
      <TextInput
        type={type as 'text' | 'email' | 'password' | 'date' | 'number'}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        max={max}
        error={error}
        onChange={onChange}
        inputClassName={inputClassName}
      />
    );
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {renderInput()}
      {error && (
        <div className="text-red-600 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default InputField;