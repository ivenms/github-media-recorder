export interface PWAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criteria: {
    https: boolean;
    manifest: boolean;
    serviceWorker: boolean;
    icons: boolean;
    startUrl: boolean;
    display: boolean;
    name: boolean;
  };
}

export async function validatePWACriteria(loc: Location = location): Promise<PWAValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criteria = {
    https: false,
    manifest: false,
    serviceWorker: false,
    icons: false,
    startUrl: false,
    display: false,
    name: false,
  };

  // Check HTTPS
  criteria.https = loc.protocol === 'https:' || loc.hostname === 'localhost';
  if (!criteria.https) {
    errors.push('HTTPS is required for PWA installation');
  }

  // Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (manifestLink) {
    try {
      const response = await fetch(manifestLink.href);
      if (response.ok) {
        const manifest = await response.json();
        criteria.manifest = true;

        // Check manifest properties
        criteria.name = !!(manifest.name || manifest.short_name);
        if (!criteria.name) {
          errors.push('Manifest must have a name or short_name');
        }

        criteria.startUrl = !!manifest.start_url;
        if (!criteria.startUrl) {
          errors.push('Manifest must have a start_url');
        }

        criteria.display = manifest.display === 'standalone' || manifest.display === 'fullscreen';
        if (!criteria.display) {
          errors.push('Manifest display must be "standalone" or "fullscreen"');
        }

        // Check icons
        const hasRequiredIcons = manifest.icons && Array.isArray(manifest.icons) && 
          manifest.icons.some((icon: { sizes?: string; type?: string }) => {
            const size = parseInt(icon.sizes?.split('x')[0] || '0');
            return size >= 192 && icon.type?.includes('png');
          });
        
        criteria.icons = !!hasRequiredIcons;
        if (!criteria.icons) {
          errors.push('Manifest must have at least one PNG icon ≥192x192');
        }

        // Check for maskable icons (warning only)
        const hasMaskableIcon = manifest.icons && Array.isArray(manifest.icons) && 
          manifest.icons.some((icon: { purpose?: string }) => 
            icon.purpose?.includes('maskable')
          );
        if (!hasMaskableIcon) {
          warnings.push('Consider adding maskable icons for better Android integration');
        }

      } else {
        errors.push(`Manifest file could not be loaded: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Error loading manifest: ${error}`);
    }
  } else {
    errors.push('No manifest link found in HTML');
  }

  // Check service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      criteria.serviceWorker = registrations.length > 0 && 
        registrations.some(reg => reg.active);
      
      if (!criteria.serviceWorker) {
        errors.push('No active service worker found');
      }
    } catch (error) {
      errors.push(`Error checking service worker: ${error}`);
    }
  } else {
    errors.push('Service Worker not supported in this browser');
  }

  const isValid = criteria.https && criteria.manifest && criteria.serviceWorker && 
                  criteria.icons && criteria.startUrl && criteria.display && criteria.name;

  return {
    isValid,
    errors,
    warnings,
    criteria,
  };
}

export function logPWAValidation(result: PWAValidationResult): void {
  console.group('🔍 PWA Installation Criteria Validation');
  
  console.log('✅ Valid for installation:', result.isValid);
  console.log('📋 Criteria Status:');
  console.table(result.criteria);
  
  if (result.errors.length > 0) {
    console.group('❌ Errors (must fix for PWA installation):');
    result.errors.forEach(error => console.error(`• ${error}`));
    console.groupEnd();
  }
  
  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings (recommended improvements):');
    result.warnings.forEach(warning => console.warn(`• ${warning}`));
    console.groupEnd();
  }
  
  console.groupEnd();
}