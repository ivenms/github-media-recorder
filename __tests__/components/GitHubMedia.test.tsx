import React from 'react';
import { render, screen, act } from '@testing-library/react';
import GitHubMedia from '../../src/components/GitHubMedia';

const mockGetUrl = jest.fn();
const mockIsLoading = jest.fn();

jest.mock('../../src/hooks/useGitHubUrl', () => ({
  useGitHubUrl: () => ({
    getUrl: mockGetUrl,
    isLoading: mockIsLoading,
  }),
}));

describe('GitHubMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the fallback when filePath is empty', () => {
    render(<GitHubMedia filePath="" type="audio" fallback={<div>Fallback</div>} />);
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render the fallback on error', async () => {
    mockGetUrl.mockRejectedValue(new Error('Failed to load'));
    await act(async () => {
      render(<GitHubMedia filePath="test.mp3" type="audio" fallback={<div>Fallback</div>} />);
    });
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render the loading state', async () => {
    mockIsLoading.mockReturnValue(true);
    render(<GitHubMedia filePath="test.mp3" type="audio" />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should render the audio element on success', async () => {
    const mediaUrl = 'http://localhost/audio.mp3';
    mockGetUrl.mockResolvedValue(mediaUrl);
    mockIsLoading.mockReturnValue(false);
    await act(async () => {
      render(<GitHubMedia filePath="test.mp3" type="audio" />);
    });
    const audio = screen.getByTestId('github-media-audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', mediaUrl);
  });

  it('should render the video element on success', async () => {
    const mediaUrl = 'http://localhost/video.mp4';
    mockGetUrl.mockResolvedValue(mediaUrl);
    mockIsLoading.mockReturnValue(false);
    await act(async () => {
      render(<GitHubMedia filePath="test.mp4" type="video" />);
    });
    const video = screen.getByTestId('github-media-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mediaUrl);
  });
});
