import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SelectInput from '../../../src/components/InputField/SelectInput';

describe('SelectInput', () => {
  const mockOptions = [
    { id: 'option1', name: 'Option 1' },
    { id: 'option2', name: 'Option 2' },
    { id: 'option3', name: 'Option 3' }
  ];

  it('renders select with options', () => {
    render(
      <SelectInput
        name="test-select"
        value="option1"
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByDisplayValue('Option 1');
    expect(select).toHaveAttribute('name', 'test-select');
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders all option elements', () => {
    render(
      <SelectInput
        name="options-test"
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('option1');
    expect(options[0]).toHaveTextContent('Option 1');
    expect(options[1]).toHaveValue('option2');
    expect(options[1]).toHaveTextContent('Option 2');
    expect(options[2]).toHaveValue('option3');
    expect(options[2]).toHaveTextContent('Option 3');
  });

  it('handles value selection', () => {
    render(
      <SelectInput
        name="value-test"
        value="option2"
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByDisplayValue('Option 2');
    expect(select).toHaveValue('option2');
  });

  it('handles empty value', () => {
    const emptyOptions = [
      { id: '', name: 'Select an option' },
      ...mockOptions
    ];
    
    render(
      <SelectInput
        name="empty-value-test"
        value=""
        options={emptyOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
  });

  it('handles null value', () => {
    const emptyOptions = [
      { id: '', name: 'Select an option' },
      ...mockOptions
    ];
    
    render(
      <SelectInput
        name="null-value-test"
        value={null}
        options={emptyOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
  });

  it('handles required attribute', () => {
    render(
      <SelectInput
        name="required-test"
        options={mockOptions}
        required={true}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toBeRequired();
  });

  it('handles disabled attribute', () => {
    render(
      <SelectInput
        name="disabled-test"
        options={mockOptions}
        disabled={true}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('applies error styling when error is provided', () => {
    render(
      <SelectInput
        name="error-test"
        options={mockOptions}
        error="This field has an error"
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('applies normal styling when no error', () => {
    render(
      <SelectInput
        name="normal-test"
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-gray-300');
    expect(select).not.toHaveClass('border-red-500');
  });

  it('handles onChange events', () => {
    const mockOnChange = jest.fn();
    
    render(
      <SelectInput
        name="onChange-test"
        options={mockOptions}
        onChange={mockOnChange}
      />
    );
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies custom input className when provided', () => {
    render(
      <SelectInput
        name="custom-class-test"
        options={mockOptions}
        inputClassName="custom-select-class"
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-select-class');
  });

  it('renders without name attribute when not provided', () => {
    render(
      <SelectInput
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).not.toHaveAttribute('name');
  });

  it('handles empty options array', () => {
    render(
      <SelectInput
        name="empty-options-test"
        options={[]}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('No options available')).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('No options available');
    expect(options[0]).toBeDisabled();
  });

  it('applies full width styling', () => {
    render(
      <SelectInput
        name="width-test"
        options={mockOptions}
        onChange={jest.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('w-full');
  });
});