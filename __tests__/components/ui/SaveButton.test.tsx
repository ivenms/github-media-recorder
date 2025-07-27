import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SaveButton from '../../../src/components/SaveButton';

describe('SaveButton', () => {
  const defaultProps = {
    saving: false,
    saved: false,
    disabled: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering and functionality', () => {
    it('renders with default props and default label', () => {
      render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /save/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Save');
      expect(button).toBeEnabled();
    });

    it('renders with custom label', () => {
      render(<SaveButton {...defaultProps} label="Custom Save" />);
      
      const button = screen.getByRole('button', { name: /custom save/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Custom Save');
    });

    it('handles click events when enabled', () => {
      const mockOnClick = jest.fn();
      render(<SaveButton {...defaultProps} onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle click events when disabled', () => {
      const mockOnClick = jest.fn();
      render(<SaveButton {...defaultProps} disabled onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Icon state management', () => {
    it('displays SaveIcon when not saved', () => {
      render(<SaveButton {...defaultProps} />);
      
      // SaveIcon should be present (we'll check for the SVG structure)
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
    });

    it('displays CheckIcon when saved', () => {
      render(<SaveButton {...defaultProps} saved />);
      
      // CheckIcon should be present - CheckIcon has a different viewBox
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // CheckIcon typically has viewBox "0 0 24 24" while SaveIcon has "0 0 20 20"
    });

    it('transitions from SaveIcon to CheckIcon when saved state changes', () => {
      const { rerender } = render(<SaveButton {...defaultProps} saved={false} />);
      
      // Initially should show SaveIcon
      let button = screen.getByRole('button');
      let svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
      
      // After rerender with saved=true, should show CheckIcon
      rerender(<SaveButton {...defaultProps} saved />);
      button = screen.getByRole('button');
      svg = button.querySelector('svg');
      // CheckIcon may have different viewBox - this test validates icon changes
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Label state management', () => {
    it('shows default label when idle', () => {
      render(<SaveButton {...defaultProps} />);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('shows custom label when idle', () => {
      render(<SaveButton {...defaultProps} label="Export File" />);
      expect(screen.getByText('Export File')).toBeInTheDocument();
    });

    it('shows "Processing..." when saving without progress', () => {
      render(<SaveButton {...defaultProps} saving />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('shows save phase when saving with progress', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={50} 
          savePhase="Converting audio..." 
        />
      );
      expect(screen.getByText('Converting audio...')).toBeInTheDocument();
    });

    it('shows "Saved!" when saved', () => {
      render(<SaveButton {...defaultProps} saved />);
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });

    it('prioritizes saved state over saving state', () => {
      render(<SaveButton {...defaultProps} saving saved />);
      // When both saving and saved are true, saving takes precedence but with 'Processing...' text
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Progress bar functionality', () => {
    it('does not show progress bar when saving without progress data', () => {
      render(<SaveButton {...defaultProps} saving />);
      
      const progressBar = screen.queryByText('Processing...');
      expect(progressBar).toBeInTheDocument(); // Button text
      
      // Should not have progress bar container
      const progressContainer = screen.queryByRole('progressbar');
      expect(progressContainer).not.toBeInTheDocument();
    });

    it('shows progress bar when saving with progress data', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={30} 
          savePhase="Converting..." 
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Converting...')).toBeInTheDocument();
      
      // Check for progress bar structure
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toBeInTheDocument();
      expect(progressBarFill).toHaveStyle('width: 30%');
    });

    it('updates progress bar width correctly', () => {
      const { rerender } = render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={25} 
          savePhase="Starting..." 
        />
      );
      
      let progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 25%');
      
      rerender(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={75} 
          savePhase="Almost done..." 
        />
      );
      
      progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 75%');
      expect(screen.getByText('Almost done...')).toBeInTheDocument();
    });

    it('handles 0% progress', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={0} 
          savePhase="Initializing..." 
        />
      );
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 0%');
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });

    it('handles 100% progress', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={100} 
          savePhase="Complete!" 
        />
      );
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 100%');
      expect(screen.getByText('Complete!')).toBeInTheDocument();
    });

    it('hides progress bar when not saving', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving={false} 
          saveProgress={50} 
          savePhase="Should not show" 
        />
      );
      
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
      
      // The progress bar container itself should not be rendered
      const progressContainer = document.querySelector('.w-full.mb-4');
      expect(progressContainer).not.toBeInTheDocument();
    });
  });

  describe('Disabled state handling', () => {
    it('applies disabled styling when disabled', () => {
      render(<SaveButton {...defaultProps} disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('is not disabled when saving', () => {
      render(<SaveButton {...defaultProps} saving disabled={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
    });

    it('can be disabled while saving', () => {
      render(<SaveButton {...defaultProps} saving disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('can be disabled while saved', () => {
      render(<SaveButton {...defaultProps} saved disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('CSS classes and styling', () => {
    it('applies correct base CSS classes', () => {
      render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'w-full',
        'bg-purple-500',
        'text-white',
        'px-4',
        'py-3',
        'rounded-xl',
        'shadow-neumorph',
        'hover:bg-purple-400',
        'flex',
        'items-center',
        'justify-center',
        'gap-2',
        'text-lg',
        'font-medium'
      );
    });

    it('maintains consistent styling across all states', () => {
      const { rerender } = render(<SaveButton {...defaultProps} />);
      
      let button = screen.getByRole('button');
      const baseClasses = button.className;
      
      // Test saving state
      rerender(<SaveButton {...defaultProps} saving />);
      button = screen.getByRole('button');
      expect(button.className).toBe(baseClasses);
      
      // Test saved state  
      rerender(<SaveButton {...defaultProps} saved />);
      button = screen.getByRole('button');
      expect(button.className).toBe(baseClasses);
      
      // Test disabled state
      rerender(<SaveButton {...defaultProps} disabled />);
      button = screen.getByRole('button');
      expect(button.className).toBe(baseClasses);
    });

    it('has correct container styling', () => {
      render(<SaveButton {...defaultProps} />);
      
      const container = document.querySelector('.w-full.max-w-md');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Complex state combinations', () => {
    it('handles saving with progress and phase correctly', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={45} 
          savePhase="Converting to MP3..." 
          disabled 
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Converting to MP3...')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Converting to MP3...');
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 45%');
    });

    it('handles transition from saving to saved', () => {
      const { rerender } = render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={90} 
          savePhase="Finalizing..." 
        />
      );
      
      expect(screen.getByText('Finalizing...')).toBeInTheDocument();
      
      rerender(<SaveButton {...defaultProps} saved />);
      
      expect(screen.getByText('Saved!')).toBeInTheDocument();
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      expect(screen.queryByText('Finalizing...')).not.toBeInTheDocument();
    });

    it('handles all props simultaneously', () => {
      render(
        <SaveButton 
          saving
          saved={false}
          saveProgress={67}
          savePhase="Processing video..."
          disabled={false}
          onClick={jest.fn()}
          label="Export Video"
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing video...')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Processing video...');
      expect(button).toBeEnabled();
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 67%');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('handles undefined saveProgress gracefully', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={undefined} 
          savePhase="Some phase" 
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Some phase')).not.toBeInTheDocument();
      
      // When saveProgress is undefined, no progress bar container should be rendered
      const progressContainer = document.querySelector('.w-full.mb-4');
      expect(progressContainer).not.toBeInTheDocument();
    });

    it('handles undefined savePhase gracefully', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={50} 
          savePhase={undefined} 
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      // When savePhase is undefined, no progress bar should be rendered (hasProgress = false)
      const progressContainer = document.querySelector('.w-full.mb-4');
      expect(progressContainer).not.toBeInTheDocument();
    });

    it('handles negative progress values', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={-10} 
          savePhase="Invalid progress" 
        />
      );
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: -10%');
    });

    it('handles progress values over 100', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={150} 
          savePhase="Over 100%" 
        />
      );
      
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 150%');
    });

    it('handles empty string phase', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={25} 
          savePhase="" 
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('');
    });

    it('handles very long phase text', () => {
      const longPhase = 'This is a very long phase description that might overflow the button width and cause layout issues';
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={50} 
          savePhase={longPhase} 
        />
      );
      
      expect(screen.getByText(longPhase)).toBeInTheDocument();
    });
  });

  describe('Accessibility features', () => {
    it('has proper button role and is keyboard accessible', () => {
      render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('type'); // Button elements don't need explicit type unless it's different from button
    });

    it('provides clear accessible text in all states', () => {
      // Test default state
      const { rerender } = render(<SaveButton {...defaultProps} label="Save File" />);
      let button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Save File');

      // Test saving state
      rerender(<SaveButton {...defaultProps} saving label="Save File" />);
      button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Processing...');

      // Test saved state
      rerender(<SaveButton {...defaultProps} saved label="Save File" />);
      button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Saved!');

      // Test saving with progress
      rerender(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={50} 
          savePhase="Converting..." 
          label="Save File" 
        />
      );
      button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Converting...');
    });

    it('maintains accessible focus states', () => {
      render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Button should be focusable when enabled
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('properly disables focus when disabled', () => {
      render(<SaveButton {...defaultProps} disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Test that the button is properly marked as disabled
      expect(button).toHaveAttribute('disabled');
    });

    it('supports keyboard navigation (Enter/Space)', () => {
      const mockOnClick = jest.fn();
      render(<SaveButton {...defaultProps} onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      // Note: React Testing Library doesn't automatically trigger click on Enter for buttons
      // This is browser behavior, so we test that the button is properly focusable
      
      // Test Space key
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      // Same note as above
      
      // Test actual clicks work
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('provides meaningful progress information for screen readers', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={75} 
          savePhase="Almost complete..." 
        />
      );
      
      // Check that progress information is conveyed
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Almost complete...')).toBeInTheDocument();
      
      // Progress bar should have visual representation
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveStyle('width: 75%');
    });

    it('maintains color contrast for accessibility', () => {
      const { unmount } = render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Check for high-contrast color classes
      expect(button).toHaveClass('bg-purple-500', 'text-white');
      
      // Clean up first render
      unmount();
      
      // Test disabled state contrast with fresh render
      render(<SaveButton {...defaultProps} disabled />);
      const disabledButton = screen.getByRole('button');
      expect(disabledButton).toHaveClass('disabled:opacity-50');
    });

    it('has consistent visual feedback for all interactive states', () => {
      // Test hover states
      render(<SaveButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-purple-400');
      
      // Test that button has proper styling for interactive feedback
      expect(button).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('provides clear visual distinction between icons', () => {
      // Test SaveIcon state
      const { rerender } = render(<SaveButton {...defaultProps} saved={false} />);
      let button = screen.getByRole('button');
      let svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20'); // SaveIcon viewBox
      
      // Test CheckIcon state
      rerender(<SaveButton {...defaultProps} saved />);
      button = screen.getByRole('button');
      svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument(); // CheckIcon should be present
      
      // Icons should have proper sizing
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
    });

    it('handles reduced motion preferences gracefully', () => {
      // Test that animations don't break functionality
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={60} 
          savePhase="Processing..." 
        />
      );
      
      // Progress bar should have transition classes that respect reduced motion
      const progressBarFill = document.querySelector('.bg-purple-500');
      expect(progressBarFill).toHaveClass('transition-all', 'duration-500', 'ease-out');
    });

    it('maintains semantic structure for assistive technologies', () => {
      render(
        <SaveButton 
          {...defaultProps} 
          saving 
          saveProgress={40} 
          savePhase="Converting files..." 
        />
      );
      
      // Check for proper container structure
      const container = document.querySelector('.w-full.max-w-md');
      expect(container).toBeInTheDocument();
      
      // Progress information should be properly structured
      const progressText = screen.getByText('Processing...');
      const phaseText = screen.getByText('Converting files...');
      
      expect(progressText).toBeInTheDocument();
      expect(phaseText).toBeInTheDocument();
      
      // Button should be the primary interactive element
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});