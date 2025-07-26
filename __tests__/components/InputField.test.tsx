import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputField from '../../src/components/InputField';

describe('InputField', () => {
  it('renders text input with label', () => {
    render(
      <InputField
        label="Test Label"
        type="text"
        name="test"
        value="test value"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test value')).toHaveAttribute('name', 'test');
  });

  it('renders select input with options', () => {
    const options = [
      { id: 'option1', name: 'Option 1' },
      { id: 'option2', name: 'Option 2' }
    ];
    
    render(
      <InputField
        label="Select Test"
        type="select"
        name="select-test"
        value="option1"
        options={options}
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Select Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(
      <InputField
        label="File Input"
        type="file"
        name="file-test"
        accept=".jpg,.png"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('File Input')).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', '.jpg,.png');
  });

  it('shows error message when provided', () => {
    render(
      <InputField
        label="Error Test"
        type="text"
        name="error-test"
        error="This field is required"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-red-600');
  });

  it('handles onChange events', () => {
    const mockOnChange = jest.fn();
    
    render(
      <InputField
        label="Change Test"
        type="text"
        name="change-test"
        value=""
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(
      <InputField
        label="Custom Class"
        type="text"
        name="custom-test"
        className="custom-wrapper"
        inputClassName="custom-input"
        onChange={jest.fn()}
      />
    );
    
    const wrapper = screen.getByRole('textbox').closest('div');
    expect(wrapper).toHaveClass('custom-wrapper');
  });

  it('renders without label when not provided', () => {
    render(
      <InputField
        type="text"
        name="no-label-test"
        value="test"
        onChange={jest.fn()}
      />
    );
    
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    expect(screen.queryByText('label')).not.toBeInTheDocument();
  });

  it('handles required attribute', () => {
    render(
      <InputField
        label="Required Test"
        type="text"
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
      <InputField
        label="Disabled Test"
        type="text"
        name="disabled-test"
        disabled={true}
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('renders number input with max attribute', () => {
    render(
      <InputField
        label="Number Test"
        type="number"
        name="number-test"
        max="100"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('max', '100');
  });

  it('renders email input', () => {
    render(
      <InputField
        label="Email Test"
        type="email"
        name="email-test"
        placeholder="Enter email"
        onChange={jest.fn()}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
  });

  it('renders disabled select when no options provided', () => {
    render(
      <InputField
        label="Select Without Options"
        type="select"
        name="select-no-options"
        options={[]}
        onChange={jest.fn()}
      />
    );
    
    // When select type has no options, it renders a disabled select with placeholder
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('name', 'select-no-options');
    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  it('auto-disables select when options are empty even if disabled=false', () => {
    render(
      <InputField
        label="Auto Disabled Select"
        type="select"
        name="auto-disabled"
        options={[]}
        disabled={false}
        onChange={jest.fn()}
      />
    );
    
    // Should be disabled despite disabled={false} because options.length === 0
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('enables select when options are provided and disabled=false', () => {
    const options = [
      { id: 'option1', name: 'Option 1' }
    ];
    
    render(
      <InputField
        label="Enabled Select"
        type="select"
        name="enabled-select"
        options={options}
        disabled={false}
        onChange={jest.fn()}
      />
    );
    
    // Should be enabled when options are provided and disabled=false
    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();
  });

  it('defaults to text input when no type provided', () => {
    render(
      <InputField
        label="Default Type"
        name="default-type"
        onChange={jest.fn()}
      />
    );
    
    // Should default to text input when type is not specified
    // This covers the default parameter assignment: type = 'text'
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('name', 'default-type');
  });
});