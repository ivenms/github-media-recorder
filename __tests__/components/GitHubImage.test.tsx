import React from 'react';
import { render, screen, act } from '@testing-library/react';
import GitHubImage from '../../src/components/GitHubImage';

const mockGetUrl = jest.fn();
const mockIsLoading = jest.fn();

jest.mock('../../src/hooks/useGitHubUrl', () => ({
  useGitHubUrl: () => ({
    getUrl: mockGetUrl,
    isLoading: mockIsLoading,
  }),
}));

describe('GitHubImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the fallback when filePath is empty', () => {
    render(<GitHubImage filePath="" alt="test" fallback={<div>Fallback</div>} />);
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render the fallback on error', async () => {
    mockGetUrl.mockRejectedValue(new Error('Failed to load'));
    await act(async () => {
      render(<GitHubImage filePath="test.jpg" alt="test" fallback={<div>Fallback</div>} />);
    });
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render the loading state', async () => {
    mockIsLoading.mockReturnValue(true);
    render(<GitHubImage filePath="test.jpg" alt="test" />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should render the image on success', async () => {
    const imageUrl = 'http://localhost/image.jpg';
    mockGetUrl.mockResolvedValue(imageUrl);
    mockIsLoading.mockReturnValue(false);
    await act(async () => {
      render(<GitHubImage filePath="test.jpg" alt="test image" />);
    });
    const img = screen.getByTestId('github-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', imageUrl);
  });

  it('should call getUrl with the correct filePath', async () => {
    await act(async () => {
      render(<GitHubImage filePath="specific/path.jpg" alt="test" />);
    });
    expect(mockGetUrl).toHaveBeenCalledWith('specific/path.jpg');
  });
});
