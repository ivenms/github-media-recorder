// Utility for image processing: crop, scale, convert to JPG, and app icon handling
import { useSettingsStore } from '../stores/settingsStore';
import type { ImageProcessOptions } from '../types';

/**
 * Process an image: crop to aspect ratio, scale to dimensions, convert to JPG
 * @param imageFile - The source image file (Blob)
 * @param options - Processing options (width, height, quality)
 * @returns Promise<Blob> - Processed JPG image
 */
export async function processImage(imageFile: Blob, options: ImageProcessOptions): Promise<Blob> {
  const { width, height, quality = 0.9 } = options;
  
  return new Promise((resolve, reject) => {
    // Create image element
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        
        // Calculate aspect ratios
        const sourceAspect = img.width / img.height;
        const targetAspect = width / height;
        
        // Calculate crop dimensions (center crop)
        let cropX = 0;
        let cropY = 0;
        let cropWidth = img.width;
        let cropHeight = img.height;
        
        if (sourceAspect > targetAspect) {
          // Source is wider, crop horizontally
          cropWidth = img.height * targetAspect;
          cropX = (img.width - cropWidth) / 2;
        } else if (sourceAspect < targetAspect) {
          // Source is taller, crop vertically  
          cropHeight = img.width / targetAspect;
          cropY = (img.height - cropHeight) / 2;
        }
        
        // Set canvas dimensions to target size
        canvas.width = width;
        canvas.height = height;
        
        // Draw the cropped and scaled image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight, // Source rectangle (crop)
          0, 0, width, height // Destination rectangle (scale)
        );
        
        // Convert to JPG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create image blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Create a processed thumbnail filename with JPG extension
 * @param originalFilename - Original file name
 * @returns Processed filename with .jpg extension
 */
export function createThumbnailFilename(originalFilename: string): string {
  // Remove extension and add .jpg
  const baseName = originalFilename.replace(/\.[^.]+$/, '');
  return `${baseName}.jpg`;
}

/**
 * Get thumbnail dimensions from settings store
 * @returns Object with width and height from SettingsStore
 */
export function getThumbnailDimensions(): { width: number; height: number } {
  try {
    const settingsState = useSettingsStore.getState();
    
    if (settingsState.appSettings) {
      return {
        width: settingsState.appSettings.thumbnailWidth || 320,
        height: settingsState.appSettings.thumbnailHeight || 240
      };
    }
  } catch (error) {
    console.error('Error getting thumbnail dimensions:', error);
  }
  
  // Default dimensions
  return { width: 320, height: 240 };
}

/**
 * Check if a file is an image
 * @param file - File or Blob to check
 * @returns boolean indicating if it's an image
 */
export function isImage(file: Blob): boolean {
  return file.type.startsWith('image/');
}

/**
 * Process thumbnail for upload: crop, scale, convert to JPG
 * @param thumbnailFile - Original thumbnail file
 * @param targetFilename - Target filename for the processed thumbnail
 * @returns Promise<{blob: Blob, filename: string}> - Processed thumbnail
 */
export async function processThumbnailForUpload(
  thumbnailFile: Blob, 
  targetFilename: string
): Promise<{ blob: Blob; filename: string }> {
  if (!isImage(thumbnailFile)) {
    throw new Error('File is not an image');
  }
  
  const dimensions = getThumbnailDimensions();
  const processedBlob = await processImage(thumbnailFile, {
    width: dimensions.width,
    height: dimensions.height,
    quality: 0.9
  });
  
  const processedFilename = createThumbnailFilename(targetFilename);
  
  return {
    blob: processedBlob,
    filename: processedFilename
  };
}

// ============================================================================
// App Icon Utilities
// ============================================================================

/**
 * Gets the app icon URL with proper base path handling
 * @returns The full URL to the app icon
 */
export const getAppIconUrl = (): string => {
  return `${import.meta.env.BASE_URL}icon.svg`;
};

/**
 * Gets the app icon URL with fallback handling
 * @param fallback Optional fallback icon URL
 * @returns The app icon URL or fallback
 */
export const getAppIconUrlWithFallback = (fallback?: string): string => {
  try {
    return getAppIconUrl();
  } catch {
    return fallback || '/icon.svg';
  }
};