// Utility for uploading files to GitHub
// - Uses GitHub REST API to upload to a repo
// - Gets configuration from Zustand stores
// - Uploads to configured directory
// - Supports progress callback

import type { GitHubConfig, CreateTreeBody, CreateCommitBody } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

function getUploadConfig() {
  const authState = useAuthStore.getState();
  const settingsState = useSettingsStore.getState();
  
  if (!authState.isAuthenticated || !authState.githubConfig || !settingsState.appSettings) {
    return null;
  }
  
  const { githubConfig } = authState;
  const { appSettings } = settingsState;
  
  if (!githubConfig.token || !githubConfig.owner || !appSettings.repo) {
    return null;
  }
  
  return {
    token: githubConfig.token,
    owner: githubConfig.owner,
    repo: appSettings.repo,
    path: appSettings.path.endsWith('/') ? appSettings.path : appSettings.path + '/',
    thumbnailPath: appSettings.thumbnailPath.endsWith('/') ? appSettings.thumbnailPath : appSettings.thumbnailPath + '/',
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailHeight: appSettings.thumbnailHeight
  };
}

async function getLatestCommitSha(config: GitHubConfig, branch = 'main') {
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (res.status === 404) {
    // Branch doesn't exist (empty repo)
    return null;
  }
  if (res.status === 409) {
    // Git Repository is empty (GitHub returns 409 for empty repos)
    return null;
  }
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to get latest commit SHA: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.object.sha;
}

async function getTreeSha(config: GitHubConfig, commitSha: string) {
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/commits/${commitSha}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!res.ok) throw new Error('Failed to get tree SHA');
  const data = await res.json();
  return data.tree.sha;
}

async function createBlob(config: GitHubConfig, file: Blob) {
  const content = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(content);
  
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/blobs`;
  console.log('Creating blob at:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: base64, encoding: 'base64' }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Blob creation failed:', res.status, errorText);
    throw new Error(`Failed to create blob: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.sha;
}

async function createTree(config: GitHubConfig, baseTreeSha: string | null, filePath: string, blobSha: string) {
  const body: CreateTreeBody = {
    tree: [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobSha,
      },
    ],
  };
  
  // Only include base_tree if we have one (not for initial commit)
  if (baseTreeSha) {
    body.base_tree = baseTreeSha;
  }
  
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create tree');
  const data = await res.json();
  return data.sha;
}

async function createCommit(config: GitHubConfig, message: string, treeSha: string, parentSha: string | null) {
  const body: CreateCommitBody = {
    message,
    tree: treeSha,
  };
  
  // Only include parents if we have a parent (not for initial commit)
  if (parentSha) {
    body.parents = [parentSha];
  }
  
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create commit');
  const data = await res.json();
  return data.sha;
}


async function updateRef(config: GitHubConfig, commitSha: string, branch = 'main', force = false) {
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      sha: commitSha,
      force: force
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update ref: ${res.status} ${errorText}`);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

async function uploadFileContentsAPI(config: GitHubConfig, file: Blob, filePath: string, fileName: string) {
  const content = await file.arrayBuffer();
  
  console.log('Converting file to base64...');
  const base64 = arrayBufferToBase64(content);
  console.log('Base64 conversion complete, length:', base64.length);
  
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
  console.log('Uploading via Contents API to:', url);
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Upload ${fileName}`,
      content: base64,
      branch: 'main'
    }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Contents API upload failed:', res.status, errorText);
    throw new Error(`Failed to upload file: ${res.status} ${errorText}`);
  }
  
  const data = await res.json();
  console.log('Upload successful via Contents API');
  return data;
}

export async function uploadFile(file: Blob, onProgress?: (p: number) => void, fileName?: string): Promise<void> {
  return uploadFileToPath(file, 'media', onProgress, fileName);
}

export async function uploadThumbnail(file: Blob, onProgress?: (p: number) => void, fileName?: string): Promise<void> {
  return uploadFileToPath(file, 'thumbnail', onProgress, fileName);
}

async function uploadFileToPath(file: Blob, pathType: 'media' | 'thumbnail', onProgress?: (p: number) => void, fileName?: string): Promise<void> {
  const config = getUploadConfig();
  if (!config) {
    throw new Error('Upload configuration is missing. Please configure your GitHub token and repository in Settings.');
  }
  
  console.log('Upload config:', { 
    owner: config.owner, 
    repo: config.repo, 
    path: config.path, 
    thumbnailPath: config.thumbnailPath,
    thumbnailDimensions: `${config.thumbnailWidth}x${config.thumbnailHeight}`
  });
  
  const branch = 'main';
  const finalFileName = fileName || `media-${Date.now()}`;
  const uploadPath = pathType === 'thumbnail' ? config.thumbnailPath : config.path;
  const filePath = `${uploadPath}${finalFileName}`;
  
  console.log('Upload details:', { branch, fileName: finalFileName, filePath });
  
  // Check if repository is empty
  if (onProgress) onProgress(0.1);
  console.log('Step 1: Getting latest commit SHA...');
  const latestCommitSha = await getLatestCommitSha(config, branch);
  console.log('Latest commit SHA:', latestCommitSha || 'null (empty repo)');
  
  if (!latestCommitSha) {
    // Empty repository - use Contents API for simplicity
    console.log('Using Contents API for empty repository');
    if (onProgress) onProgress(0.5);
    await uploadFileContentsAPI(config, file, filePath, finalFileName);
    if (onProgress) onProgress(1);
    return;
  }
  
  // Existing repository - use Git Data API
  console.log('Using Git Data API for existing repository');
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Upload attempt ${4 - retries}/3`);
      
      // Get fresh commit SHA for each retry attempt
      const currentCommitSha = await getLatestCommitSha(config, branch);
      console.log('Current commit SHA:', currentCommitSha);
      
      if (onProgress) onProgress(0.2);
      console.log('Step 2: Getting base tree SHA...');
      const baseTreeSha = await getTreeSha(config, currentCommitSha);
      console.log('Base tree SHA:', baseTreeSha);
      
      if (onProgress) onProgress(0.3);
      console.log('Step 3: Creating blob...');
      const blobSha = await createBlob(config, file);
      console.log('Blob SHA:', blobSha);
      
      if (onProgress) onProgress(0.6);
      console.log('Step 4: Creating tree...');
      const treeSha = await createTree(config, baseTreeSha, filePath, blobSha);
      console.log('Tree SHA:', treeSha);
      
      if (onProgress) onProgress(0.8);
      console.log('Step 5: Creating commit...');
      const commitSha = await createCommit(config, `Upload ${finalFileName}`, treeSha, currentCommitSha);
      console.log('Commit SHA:', commitSha);
      
      if (onProgress) onProgress(0.9);
      console.log('Step 6: Updating existing reference...');
      await updateRef(config, commitSha, branch);
      
      console.log('Upload successful!');
      if (onProgress) onProgress(1);
      return; // Success, exit retry loop
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error:', errorMessage);
      retries--;
      if ((errorMessage.includes('409') || errorMessage.includes('422')) && retries > 0) {
        console.log(`Conflict detected (${errorMessage.includes('409') ? '409' : '422'}), retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error; // Re-throw if not a conflict or out of retries
    }
  }
} 