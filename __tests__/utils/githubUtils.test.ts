import { extractDateFromFilename } from '../../src/utils/githubUtils';
import { generateFreshDownloadUrl, fetchRemoteThumbnails } from '../../src/utils/githubUtils';

jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: { getState: jest.fn() }
}));
jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: { getState: jest.fn() }
}));

// Mock setTimeout globally to avoid delays in fetchWithRetry
const originalSetTimeout = global.setTimeout;
let timeoutCallCount = 0;
// @ts-expect-error: Mocking setTimeout for tests, __promisify__ is not needed here
global.setTimeout = jest.fn((cb: () => void, __delay: number): unknown => {
  timeoutCallCount++;
  // Execute immediately in tests to avoid delays
  if (typeof cb === 'function') {
    if (timeoutCallCount > 20) {
      throw new Error('Too many timeout calls - likely infinite retry loop');
    }
    cb();
  }
  return 123 as unknown; // Mock timer ID
});

describe('extractDateFromFilename', () => {
  it('should extract date from filename with date', () => {
    expect(extractDateFromFilename('AUDIO_TITLE_AUTHOR_2023-12-01.mp3')).toEqual(new Date('2023-12-01'));
    expect(extractDateFromFilename('video_2022-01-15.mp4')).toEqual(new Date('2022-01-15'));
  });

  it('should return epoch date if no date found', () => {
    expect(extractDateFromFilename('no_date_here.mp3')).toEqual(new Date(0));
  });
});

describe('generateFreshDownloadUrl', () => {
  beforeEach(() => {
    require('../../src/stores/authStore').useAuthStore.getState.mockReturnValue({
      isAuthenticated: true,
      githubConfig: { token: 'token', owner: 'owner' }
    });
    require('../../src/stores/settingsStore').useSettingsStore.getState.mockReturnValue({
      appSettings: { repo: 'repo', path: 'media/', thumbnailPath: 'thumbnails/', thumbnailWidth: 320, thumbnailHeight: 240 }
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns download_url from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ download_url: 'https://github.com/owner/repo/file.mp3' })
    });
    const url = await generateFreshDownloadUrl('file.mp3');
    expect(url).toBe('https://github.com/owner/repo/file.mp3');
  });

  it('falls back to raw URL if API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const url = await generateFreshDownloadUrl('file.mp3');
    expect(url).toBe('https://raw.githubusercontent.com/owner/repo/main/file.mp3');
  });

  it('throws if config is missing', async () => {
    require('../../src/stores/authStore').useAuthStore.getState.mockReturnValue({ isAuthenticated: false });
    await expect(generateFreshDownloadUrl('file.mp3')).rejects.toThrow('GitHub configuration not available');
  });
});

describe('fetchRemoteThumbnails', () => {
  beforeEach(() => {
    timeoutCallCount = 0; // Reset timeout counter for each test
    require('../../src/stores/authStore').useAuthStore.getState.mockReturnValue({
      isAuthenticated: true,
      githubConfig: { token: 'token', owner: 'owner' }
    });
    require('../../src/stores/settingsStore').useSettingsStore.getState.mockReturnValue({
      appSettings: { repo: 'repo', path: 'media/', thumbnailPath: 'thumbnails/', thumbnailWidth: 320, thumbnailHeight: 240 }
    });
    global.fetch = jest.fn();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    // Restore original setTimeout after all tests
    global.setTimeout = originalSetTimeout;
  });

  it('returns thumbnails for valid files', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ([
        { name: 'thumb1.jpg', type: 'file', path: 'thumbnails/thumb1.jpg' },
        { name: 'notimage.txt', type: 'file', path: 'thumbnails/notimage.txt' }
      ])
    });
    const result = await fetchRemoteThumbnails();
    expect(result).toHaveProperty('thumb1');
    expect(result.thumb1.url).toBe('thumbnails/thumb1.jpg');
    expect(result.thumb1.isLocal).toBe(false);
    expect(result).not.toHaveProperty('notimage');
  });

}); 