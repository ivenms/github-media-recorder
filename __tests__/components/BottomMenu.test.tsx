import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BottomMenu from '../../src/components/BottomMenu';

// Mock icon components to avoid complex SVG rendering in tests
jest.mock('../../src/components/icons/MicIcon', () => {
  return function MockMicIcon() {
    return <div data-testid="mic-icon">MicIcon</div>;
  };
});

jest.mock('../../src/components/icons/LibraryIcon', () => {
  return function MockLibraryIcon() {
    return <div data-testid="library-icon">LibraryIcon</div>;
  };
});

jest.mock('../../src/components/icons/SettingsIcon', () => {
  return function MockSettingsIcon() {
    return <div data-testid="settings-icon">SettingsIcon</div>;
  };
});

jest.mock('../../src/components/icons/VideoRecorderIcon', () => {
  return function MockVideoRecorderIcon() {
    return <div data-testid="video-recorder-icon">VideoRecorderIcon</div>;
  };
});

describe('BottomMenu', () => {
  const menuItems = [
    { key: 'library', label: 'Library', testId: 'library-icon' },
    { key: 'home', label: 'Audio', testId: 'mic-icon' },
    { key: 'record', label: 'Video', testId: 'video-recorder-icon' },
    { key: 'settings', label: 'Settings', testId: 'settings-icon' }
  ];

  describe('Component Rendering', () => {
    it('renders navigation container with correct structure', () => {
      render(<BottomMenu />);
      
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'w-full', 'z-50');
    });

    it('renders with default props (active="library")', () => {
      render(<BottomMenu />);
      
      // Library should be active by default
      const libraryButton = screen.getByRole('button', { name: /library/i });
      expect(libraryButton).toBeInTheDocument();
      
      // Check for active state styling (floating icon with purple background)
      const floatingIcon = document.querySelector('.absolute.-top-8.w-12.h-12.bg-purple-600');
      expect(floatingIcon).toBeInTheDocument();
      
      // Check for purple text label in active state
      const activeLabel = document.querySelector('.text-purple-600');
      expect(activeLabel).toHaveTextContent('Library');
    });

    it('renders all 4 menu items with correct labels', () => {
      render(<BottomMenu />);
      
      menuItems.forEach(item => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
        expect(screen.getByTestId(item.testId)).toBeInTheDocument();
      });
    });

    it('renders buttons with correct CSS classes and structure', () => {
      render(<BottomMenu />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
      
      buttons.forEach(button => {
        expect(button).toHaveClass(
          'flex', 'flex-col', 'items-center', 'justify-center', 
          'min-w-0', 'flex-1', 'transition-all', 'duration-300', 
          'relative', 'bg-transparent', 'border-0', 'outline-none', 
          'focus:outline-none'
        );
      });
    });

    it('applies correct inline styles to main container', () => {
      render(<BottomMenu />);
      
      const container = document.querySelector('.bg-white.rounded-t-3xl');
      expect(container).toHaveStyle({ borderWidth: '0.5px' });
      expect(container).toHaveStyle({ 
        boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.15), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' 
      });
    });
  });

  describe('Active State Rendering', () => {
    menuItems.forEach(item => {
      it(`renders ${item.key} in active state correctly`, () => {
        render(<BottomMenu active={item.key} />);
        
        // Check floating active icon container
        const floatingIcon = document.querySelector('.absolute.-top-8.w-12.h-12.bg-purple-600.rounded-full');
        expect(floatingIcon).toBeInTheDocument();
        expect(floatingIcon).toHaveStyle({
          boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        });
        
        // Check white icon container within floating state
        const iconContainer = floatingIcon?.querySelector('.w-6.h-6.flex.items-center.justify-center.text-white');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer).toHaveStyle({
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
        });
        
        // Check for spacer div
        const spacer = document.querySelector('.h-6.mb-2');
        expect(spacer).toBeInTheDocument();
        
        // Check active label styling
        const activeLabel = document.querySelector('.text-xs.font-medium.text-purple-600');
        expect(activeLabel).toBeInTheDocument();
        expect(activeLabel).toHaveTextContent(item.label);
        expect(activeLabel).toHaveStyle({
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        });
        
        // Verify the correct icon is rendered
        expect(screen.getByTestId(item.testId)).toBeInTheDocument();
      });
    });
  });

  describe('Inactive State Rendering', () => {
    menuItems.forEach(item => {
      // Test each item in inactive state by making a different item active
      const otherItem = menuItems.find(other => other.key !== item.key)!;
      
      it(`renders ${item.key} in inactive state correctly`, () => {
        render(<BottomMenu active={otherItem.key} />);
        
        // Find the specific button for this item
        const button = screen.getByRole('button', { name: new RegExp(item.label, 'i') });
        
        // Check inactive icon container
        const iconContainer = button.querySelector('.w-6.h-6.flex.items-center.justify-center.mb-2.text-gray-400');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer).toHaveStyle({
          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
        });
        
        // Check inactive label styling
        const inactiveLabel = button.querySelector('.text-xs.font-normal.text-gray-400');
        expect(inactiveLabel).toBeInTheDocument();
        expect(inactiveLabel).toHaveTextContent(item.label);
        expect(inactiveLabel).toHaveStyle({
          textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)'
        });
        
        // Verify the correct icon is rendered
        expect(screen.getByTestId(item.testId)).toBeInTheDocument();
        
        // Ensure no floating active state elements are present for this item
        expect(button.querySelector('.absolute.-top-8')).not.toBeInTheDocument();
        expect(button.querySelector('.text-purple-600')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click Handler Functionality', () => {
    it('calls onNavigate with correct key when menu items are clicked', () => {
      const mockOnNavigate = jest.fn();
      render(<BottomMenu onNavigate={mockOnNavigate} />);
      
      menuItems.forEach(item => {
        const button = screen.getByRole('button', { name: new RegExp(item.label, 'i') });
        fireEvent.click(button);
        expect(mockOnNavigate).toHaveBeenCalledWith(item.key);
      });
      
      expect(mockOnNavigate).toHaveBeenCalledTimes(4);
    });

    it('calls onNavigate with correct parameters for each individual item', () => {
      const mockOnNavigate = jest.fn();
      render(<BottomMenu onNavigate={mockOnNavigate} />);
      
      // Test library button
      fireEvent.click(screen.getByRole('button', { name: /library/i }));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('library');
      
      // Test audio button
      fireEvent.click(screen.getByRole('button', { name: /audio/i }));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('home');
      
      // Test video button
      fireEvent.click(screen.getByRole('button', { name: /video/i }));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('record');
      
      // Test settings button
      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('settings');
    });

    it('does not crash when onNavigate is not provided (optional prop)', () => {
      render(<BottomMenu />);
      
      menuItems.forEach(item => {
        const button = screen.getByRole('button', { name: new RegExp(item.label, 'i') });
        expect(() => fireEvent.click(button)).not.toThrow();
      });
    });

    it('does not call any function when onNavigate is undefined', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      render(<BottomMenu onNavigate={undefined} />);
      
      const button = screen.getByRole('button', { name: /library/i });
      fireEvent.click(button);
      
      // Should not cause any errors
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Conditional Rendering Logic', () => {
    it('renders only one active state at a time', () => {
      render(<BottomMenu active="home" />);
      
      // Only one floating icon should exist
      const floatingIcons = document.querySelectorAll('.absolute.-top-8.w-12.h-12.bg-purple-600');
      expect(floatingIcons).toHaveLength(1);
      
      // Only one purple text label should exist  
      const activeLabels = document.querySelectorAll('.text-purple-600');
      expect(activeLabels).toHaveLength(1);
      expect(activeLabels[0]).toHaveTextContent('Audio');
    });

    it('renders three inactive states when one is active', () => {
      render(<BottomMenu active="record" />);
      
      // Three gray text labels should exist
      const inactiveLabels = document.querySelectorAll('.text-gray-400');
      expect(inactiveLabels).toHaveLength(6); // 3 icons + 3 labels = 6 elements
      
      // Check that the correct labels are inactive
      const inactiveTextLabels = Array.from(inactiveLabels).filter(el => 
        el.classList.contains('text-xs')
      );
      expect(inactiveTextLabels).toHaveLength(3);
      
      const inactiveTexts = inactiveTextLabels.map(el => el.textContent);
      expect(inactiveTexts).toContain('Library');
      expect(inactiveTexts).toContain('Audio');  
      expect(inactiveTexts).toContain('Settings');
      expect(inactiveTexts).not.toContain('Video');
    });

    it('switches active state correctly when active prop changes', () => {
      const { rerender } = render(<BottomMenu active="library" />);
      
      // Initially library is active
      expect(screen.getByText('Library')).toHaveClass('text-purple-600');
      
      // Change to settings active
      rerender(<BottomMenu active="settings" />);
      
      // Now settings should be active
      expect(screen.getByText('Settings')).toHaveClass('text-purple-600');
      
      // Library should now be inactive
      const libraryButton = screen.getByRole('button', { name: /library/i });
      const libraryLabel = libraryButton.querySelector('.text-xs');
      expect(libraryLabel).toHaveClass('text-gray-400');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid active prop gracefully', () => {
      render(<BottomMenu active="nonexistent" />);
      
      // All items should be in inactive state
      const activeLabels = document.querySelectorAll('.text-purple-600');
      expect(activeLabels).toHaveLength(0);
      
      // All items should be in inactive state
      const inactiveLabels = document.querySelectorAll('.text-gray-400');
      expect(inactiveLabels).toHaveLength(8); // 4 icons + 4 labels = 8 elements
    });

    it('handles empty string active prop', () => {
      render(<BottomMenu active="" />);
      
      // All items should be in inactive state
      const activeLabels = document.querySelectorAll('.text-purple-600');
      expect(activeLabels).toHaveLength(0);
    });

    it('handles null active prop', () => {
      render(<BottomMenu active={null as unknown as string} />);
      
      // All items should be in inactive state  
      const activeLabels = document.querySelectorAll('.text-purple-600');
      expect(activeLabels).toHaveLength(0);
    });
  });

  describe('Accessibility and Structure', () => {
    it('renders semantic navigation element', () => {
      render(<BottomMenu />);
      
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('renders all menu items as buttons', () => {
      render(<BottomMenu />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
      
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('provides accessible button names via text content', () => {
      render(<BottomMenu />);
      
      expect(screen.getByRole('button', { name: /library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /audio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('maintains proper focus management', () => {
      render(<BottomMenu />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none');
      });
    });
  });

  describe('Menu Item Configuration', () => {
    it('uses correct menu item configuration', () => {
      render(<BottomMenu />);
      
      // Verify all expected menu items are present with correct order
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('Library');
      expect(buttons[1]).toHaveTextContent('Audio');
      expect(buttons[2]).toHaveTextContent('Video');
      expect(buttons[3]).toHaveTextContent('Settings');
    });

    it('maps menu keys to correct labels', () => {
      const mockOnNavigate = jest.fn();
      render(<BottomMenu onNavigate={mockOnNavigate} />);
      
      // Click each button and verify the correct key is passed
      fireEvent.click(screen.getByText('Library'));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('library');
      
      fireEvent.click(screen.getByText('Audio'));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('home');
      
      fireEvent.click(screen.getByText('Video'));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('record');
      
      fireEvent.click(screen.getByText('Settings'));
      expect(mockOnNavigate).toHaveBeenLastCalledWith('settings');
    });

    it('renders correct icons for each menu item', () => {
      render(<BottomMenu />);
      
      // Verify each icon is rendered
      expect(screen.getByTestId('library-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
      expect(screen.getByTestId('video-recorder-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });
});