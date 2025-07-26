import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileInput from '../../../src/components/InputField/FileInput';

describe('FileInput', () => {
  it('renders file input with default attributes', () => {
    render(
      <FileInput
        name="test-file"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('name', 'test-file');
  });

  it('handles accept attribute', () => {
    render(
      <FileInput
        name="accept-test"
        accept=".jpg,.png,.gif"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.jpg,.png,.gif');
  });

  it('handles multiple attribute', () => {
    render(
      <FileInput
        name="multiple-test"
        multiple={true}
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('multiple');
  });

  it('handles required attribute', () => {
    render(
      <FileInput
        name="required-test"
        required={true}
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeRequired();
  });

  it('handles disabled attribute', () => {
    render(
      <FileInput
        name="disabled-test"
        disabled={true}
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeDisabled();
  });

  it('handles onChange events', () => {
    const mockOnChange = jest.fn();
    
    render(
      <FileInput
        name="onChange-test"
        onChange={mockOnChange}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(input!, { target: { files: [file] } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies default mobile-friendly styling', () => {
    render(
      <FileInput
        name="styling-test"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('file:mr-4');
    expect(input).toHaveClass('file:py-2');
    expect(input).toHaveClass('file:px-4');
    expect(input).toHaveClass('file:bg-purple-50');
    expect(input).toHaveClass('file:text-purple-700');
  });

  it('applies custom input className when provided', () => {
    render(
      <FileInput
        name="custom-class-test"
        inputClassName="custom-file-class"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveClass('custom-file-class');
  });

  it('renders without name attribute when not provided', () => {
    render(
      <FileInput
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toHaveAttribute('name');
  });

  it('handles single file selection by default', () => {
    render(
      <FileInput
        name="single-file-test"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toHaveAttribute('multiple');
  });

  it('has proper file input structure', () => {
    render(
      <FileInput
        name="structure-test"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
  });

  it('supports image file types', () => {
    render(
      <FileInput
        name="image-test"
        accept="image/*"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('supports document file types', () => {
    render(
      <FileInput
        name="document-test"
        accept=".pdf,.doc,.docx"
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.pdf,.doc,.docx');
  });

  it('maintains accessibility when disabled', () => {
    render(
      <FileInput
        name="accessibility-test"
        disabled={true}
        onChange={jest.fn()}
      />
    );
    
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeDisabled();
  });
});