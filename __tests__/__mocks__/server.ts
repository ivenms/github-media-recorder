// MSW server for API mocking
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// GitHub API handlers
const githubHandlers = [
  // Get user info
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({
      login: 'testuser',
      id: 12345,
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://github.com/images/error/testuser_happy.gif',
    });
  }),

  // Get repository info
  http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
    return HttpResponse.json({
      id: 1,
      name: params.repo,
      full_name: `${params.owner}/${params.repo}`,
      owner: {
        login: params.owner,
        id: 1,
      },
      private: false,
      permissions: {
        admin: true,
        push: true,
        pull: true,
      },
    });
  }),

  // List repository contents
  http.get('https://api.github.com/repos/:owner/:repo/contents/:path*', ({ params }) => {
    const path = params.path || '';
    return HttpResponse.json([
      {
        name: 'test-audio.mp3',
        path: `${path}/test-audio.mp3`,
        sha: 'abc123',
        size: 1000,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/test/test/main/test-audio.mp3',
      },
      {
        name: 'test-video.mp4',
        path: `${path}/test-video.mp4`,
        sha: 'def456',
        size: 5000,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/test/test/main/test-video.mp4',
      },
    ]);
  }),

  // Upload file
  http.put('https://api.github.com/repos/:owner/:repo/contents/:path*', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      content: {
        name: body.message.split(' ')[1] || 'uploaded-file',
        path: request.url.split('/contents/')[1],
        sha: 'new-sha-' + Math.random().toString(36).substr(2, 9),
        size: 1000,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/test/test/main/' + request.url.split('/contents/')[1],
      },
      commit: {
        sha: 'commit-sha-' + Math.random().toString(36).substr(2, 9),
        message: body.message,
      },
    });
  }),

  // Get file content
  http.get('https://api.github.com/repos/:owner/:repo/contents/:path*', ({ params }) => {
    return HttpResponse.json({
      name: params.path?.split('/').pop() || 'file',
      path: params.path,
      sha: 'file-sha-123',
      size: 1000,
      type: 'file',
      content: btoa('mock file content'),
      encoding: 'base64',
      download_url: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/main/${params.path}`,
    });
  }),

  // Create/update file
  http.put('https://api.github.com/repos/:owner/:repo/contents/:path*', async ({ request }) => {
    return HttpResponse.json({
      content: {
        name: 'updated-file',
        path: request.url.split('/contents/')[1],
        sha: 'updated-sha-123',
        size: 1500,
      },
      commit: {
        sha: 'commit-updated-123',
        message: 'Updated file',
      },
    });
  }),

  // Delete file
  http.delete('https://api.github.com/repos/:owner/:repo/contents/:path*', () => {
    return HttpResponse.json({
      commit: {
        sha: 'delete-commit-123',
        message: 'Deleted file',
      },
    });
  }),

  // Error cases
  http.get('https://api.github.com/error-test', () => {
    return HttpResponse.json(
      { message: 'API rate limit exceeded' },
      { status: 403 }
    );
  }),
];

// Raw GitHub content handlers
const rawGithubHandlers = [
  http.get('https://raw.githubusercontent.com/:owner/:repo/:ref/:path*', () => {
    return new HttpResponse('mock file content', {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  }),
];

// Setup MSW server
export const server = setupServer(...githubHandlers, ...rawGithubHandlers);

// Utility functions for testing
export const mockGithubResponses = {
  // Mock successful upload
  mockSuccessfulUpload: (filename: string, size: number = 1000) => {
    server.use(
      http.put('https://api.github.com/repos/:owner/:repo/contents/:path*', () => {
        return HttpResponse.json({
          content: {
            name: filename,
            path: `uploads/${filename}`,
            sha: 'mock-sha-' + Math.random().toString(36).substr(2, 9),
            size,
            type: 'file',
            download_url: `https://raw.githubusercontent.com/test/test/main/uploads/${filename}`,
          },
          commit: {
            sha: 'commit-sha-' + Math.random().toString(36).substr(2, 9),
            message: `Upload ${filename}`,
          },
        });
      })
    );
  },

  // Mock upload failure
  mockUploadFailure: (errorCode: number = 422, message: string = 'Upload failed') => {
    server.use(
      http.put('https://api.github.com/repos/:owner/:repo/contents/:path*', () => {
        return HttpResponse.json(
          { message },
          { status: errorCode }
        );
      })
    );
  },

  // Mock rate limit error
  mockRateLimit: () => {
    server.use(
      http.get('https://api.github.com/*', () => {
        return HttpResponse.json(
          { 
            message: 'API rate limit exceeded',
            documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
          },
          { status: 403 }
        );
      })
    );
  },

  // Mock network error
  mockNetworkError: () => {
    server.use(
      http.get('https://api.github.com/*', () => {
        return HttpResponse.error();
      })
    );
  },

  // Reset to default handlers
  resetToDefaults: () => {
    server.resetHandlers(...githubHandlers, ...rawGithubHandlers);
  },
};