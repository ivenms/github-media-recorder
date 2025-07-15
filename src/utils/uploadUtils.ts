// Utility for uploading files to GitHub
// - Uses GitHub REST API to upload to a repo
// - Reads token, owner, repo from localStorage
// - Uploads to 'media/' directory
// - Supports progress callback

import type { GitHubSettings } from '../types';

function getGitHubSettings(): GitHubSettings | null {
  const raw = localStorage.getItem('githubSettings');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getLatestCommitSha(settings: GitHubSettings, branch = 'main') {
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/refs/heads/${branch}`, {
    headers: { Authorization: `token ${settings.token}` },
  });
  if (!res.ok) throw new Error('Failed to get latest commit SHA');
  const data = await res.json();
  return data.object.sha;
}

async function getTreeSha(settings: GitHubSettings, commitSha: string) {
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/commits/${commitSha}`, {
    headers: { Authorization: `token ${settings.token}` },
  });
  if (!res.ok) throw new Error('Failed to get tree SHA');
  const data = await res.json();
  return data.tree.sha;
}

async function createBlob(settings: GitHubSettings, file: Blob) {
  const content = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(content)));
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/blobs`, {
    method: 'POST',
    headers: {
      Authorization: `token ${settings.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: base64, encoding: 'base64' }),
  });
  if (!res.ok) throw new Error('Failed to create blob');
  const data = await res.json();
  return data.sha;
}

async function createTree(settings: GitHubSettings, baseTreeSha: string, filePath: string, blobSha: string) {
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `token ${settings.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobSha,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error('Failed to create tree');
  const data = await res.json();
  return data.sha;
}

async function createCommit(settings: GitHubSettings, message: string, treeSha: string, parentSha: string) {
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `token ${settings.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });
  if (!res.ok) throw new Error('Failed to create commit');
  const data = await res.json();
  return data.sha;
}

async function updateRef(settings: GitHubSettings, commitSha: string, branch = 'main') {
  const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${settings.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sha: commitSha }),
  });
  if (!res.ok) throw new Error('Failed to update ref');
}

export async function uploadFile(file: Blob, onProgress?: (p: number) => void): Promise<void> {
  const settings = getGitHubSettings();
  if (!settings || !settings.token || !settings.owner || !settings.repo) {
    throw new Error('GitHub settings are missing. Please configure them in Settings.');
  }
  const branch = 'main';
  const fileName = (file as any).name || `media-${Date.now()}`;
  const filePath = `media/${fileName}`;
  if (onProgress) onProgress(0.1);
  const latestCommitSha = await getLatestCommitSha(settings, branch);
  if (onProgress) onProgress(0.2);
  const baseTreeSha = await getTreeSha(settings, latestCommitSha);
  if (onProgress) onProgress(0.3);
  const blobSha = await createBlob(settings, file);
  if (onProgress) onProgress(0.6);
  const treeSha = await createTree(settings, baseTreeSha, filePath, blobSha);
  if (onProgress) onProgress(0.8);
  const commitSha = await createCommit(settings, `Upload ${fileName}`, treeSha, latestCommitSha);
  if (onProgress) onProgress(0.9);
  await updateRef(settings, commitSha, branch);
  if (onProgress) onProgress(1);
} 