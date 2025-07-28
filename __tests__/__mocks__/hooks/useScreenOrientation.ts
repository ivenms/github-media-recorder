// Mock for useScreenOrientation hook
type Orientation = 'portrait' | 'landscape';

export const useScreenOrientation = jest.fn((): Orientation => {
  return 'portrait'; // Default to portrait in tests
});