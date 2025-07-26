import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextInput from '../../../src/components/InputField/TextInput';

describe('TextInput', () => {
  it('renders text input with default type', () => {
    render(
      <TextInput
        name="test-input"
        value="test value"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('test value');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('name', 'test-input');
  });

  it('renders email input type', () => {
    render(
      <TextInput
        type="email"
        name="email-input"
        value="test@example.com"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('test@example.com');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders password input type', () => {
    render(
      <TextInput
        type="password"
        name="password-input"
        value="secret"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('secret');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders date input type', () => {
    render(
      <TextInput
        type="date"
        name="date-input"
        value="2023-12-25"
        max="2024-12-31"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('2023-12-25');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('max', '2024-12-31');
  });

  it('renders number input type', () => {
    render(
      <TextInput
        type="number"
        name="number-input"
        value="42"
        max="100"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('42');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('max', '100');
  });

  it('handles placeholder text', () => {
    render(
      <TextInput
        name="placeholder-test"
        placeholder="Enter text here"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  it('handles required attribute', () => {
    render(
      <TextInput
        name="required-test"
        required={true}
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('handles disabled attribute', () => {
    render(
      <TextInput
        name="disabled-test"
        disabled={true}
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('handles maxLength attribute', () => {
    render(
      <TextInput
        name="maxlength-test"
        maxLength={10}
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '10');
  });

  it('applies error styling when error is provided', () => {
    render(
      <TextInput
        name="error-test"
        error="This field has an error"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('applies normal styling when no error', () => {
    render(
      <TextInput
        name="normal-test"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-gray-300');
    expect(input).not.toHaveClass('border-red-500');
  });

  it('handles onChange events', () => {
    const mockOnChange = jest.fn();
    
    render(
      <TextInput
        name="change-test"
        value=""
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies custom input className when provided', () => {
    render(
      <TextInput
        name="custom-class-test"
        inputClassName="custom-input-class"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input-class');
  });

  it('renders without name attribute when not provided', () => {
    render(
      <TextInput
        value="test"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByDisplayValue('test');
    expect(input).not.toHaveAttribute('name');
  });

  it('handles null value gracefully', () => {
    render(
      <TextInput
        name="null-value-test"
        value={null}
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });
});