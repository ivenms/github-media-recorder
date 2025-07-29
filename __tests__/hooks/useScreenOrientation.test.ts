import { renderHook, act } from '@testing-library/react';
import { useScreenOrientation } from '../../src/hooks/useScreenOrientation';

describe('useScreenOrientation', () => {
  let mockMediaQuery: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    // Reset mock
    mockMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => mockMediaQuery),
    });
    
    // Clear all mock call counts
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns portrait by default when landscape media query does not match', () => {
    mockMediaQuery.matches = false;

    const { result } = renderHook(() => useScreenOrientation());

    expect(result.current).toBe('portrait');
    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
  });

  it('returns landscape when landscape media query matches', () => {
    mockMediaQuery.matches = true;

    const { result } = renderHook(() => useScreenOrientation());

    expect(result.current).toBe('landscape');
    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
  });

  it('adds event listener for orientation changes on mount', () => {
    renderHook(() => useScreenOrientation());

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('removes event listener on unmount', () => {
    const { unmount } = renderHook(() => useScreenOrientation());

    unmount();

    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('updates orientation when media query changes to landscape', () => {
    mockMediaQuery.matches = false;

    const { result } = renderHook(() => useScreenOrientation());

    // Initially portrait
    expect(result.current).toBe('portrait');

    // Simulate orientation change to landscape
    mockMediaQuery.matches = true;
    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];

    act(() => {
      changeHandler();
    });

    expect(result.current).toBe('landscape');
  });

  it('updates orientation when media query changes to portrait', () => {
    mockMediaQuery.matches = true;

    const { result } = renderHook(() => useScreenOrientation());

    // Initially landscape
    expect(result.current).toBe('landscape');

    // Simulate orientation change to portrait
    mockMediaQuery.matches = false;
    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];

    act(() => {
      changeHandler();
    });

    expect(result.current).toBe('portrait');
  });

  it('handles multiple orientation changes correctly', () => {
    mockMediaQuery.matches = false;

    const { result } = renderHook(() => useScreenOrientation());

    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];

    // Start portrait
    expect(result.current).toBe('portrait');

    // Change to landscape
    mockMediaQuery.matches = true;
    act(() => {
      changeHandler();
    });
    expect(result.current).toBe('landscape');

    // Change back to portrait
    mockMediaQuery.matches = false;
    act(() => {
      changeHandler();
    });
    expect(result.current).toBe('portrait');

    // Change to landscape again
    mockMediaQuery.matches = true;
    act(() => {
      changeHandler();
    });
    expect(result.current).toBe('landscape');
  });

  it('performs initial orientation check on mount', () => {
    // Setup initial landscape state
    mockMediaQuery.matches = true;

    const { result } = renderHook(() => useScreenOrientation());

    // Should detect initial landscape orientation
    expect(result.current).toBe('landscape');
  });

  it('calls matchMedia and expects it to be available', () => {
    // The hook expects matchMedia to be available
    // This test verifies it works with the mock
    const { result } = renderHook(() => useScreenOrientation());
    
    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
    expect(result.current).toBe('portrait'); // default when matches is false
  });

  it('handles edge case where matches property changes without event', () => {
    mockMediaQuery.matches = false;

    const { result, rerender } = renderHook(() => useScreenOrientation());

    // Initially portrait
    expect(result.current).toBe('portrait');

    // Change matches property without triggering event
    mockMediaQuery.matches = true;
    
    // Rerender the hook (simulates component re-render)
    rerender();

    // Should still be portrait because no change event was fired
    expect(result.current).toBe('portrait');

    // Now trigger the change event
    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];
    act(() => {
      changeHandler();
    });

    // Now should be landscape
    expect(result.current).toBe('landscape');
  });

  it('uses same event listener instance for add and remove', () => {
    const { unmount } = renderHook(() => useScreenOrientation());

    const addedHandler = mockMediaQuery.addEventListener.mock.calls[0][1];

    unmount();

    const removedHandler = mockMediaQuery.removeEventListener.mock.calls[0][1];

    // Should be the same function reference
    expect(addedHandler).toBe(removedHandler);
  });

  it('calls matchMedia with correct media query string', () => {
    renderHook(() => useScreenOrientation());

    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
    // The hook calls matchMedia twice: once in getOrientation() and once for the mediaQuery variable
    expect(window.matchMedia).toHaveBeenCalledTimes(2);
  });

  it('handles rapid orientation changes without state inconsistency', () => {
    mockMediaQuery.matches = false;

    const { result } = renderHook(() => useScreenOrientation());

    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];

    // Rapid changes
    act(() => {
      mockMediaQuery.matches = true;
      changeHandler();
      mockMediaQuery.matches = false;
      changeHandler();
      mockMediaQuery.matches = true;
      changeHandler();
    });

    // Should end up in landscape state
    expect(result.current).toBe('landscape');
  });
});