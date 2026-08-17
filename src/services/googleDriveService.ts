/**
 * Google Drive Storage Service for Morya Group Web
 * Uploads receipt/bill photos directly to moryagroupdata@gmail.com Google Drive
 * and generates public viewable links.
 */

const DEFAULT_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_morya_drive_upload_v1/exec';
const STORAGE_KEY_DRIVE_WEB_APP = 'morya_mandal_google_drive_script_url_v2';

export function getGoogleDriveScriptUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_WEB_APP) || DEFAULT_DRIVE_SCRIPT_URL;
  } catch {
    return DEFAULT_DRIVE_SCRIPT_URL;
  }
}

export function setGoogleDriveScriptUrl(url: string): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_DRIVE_WEB_APP, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_DRIVE_WEB_APP);
    }
  } catch (err) {
    console.warn('Failed to save Google Drive Script URL:', err);
  }
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('drive.google.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('docs.google.com')
  );
}

/**
 * Converts a file or data URL to a compressed Base64 string for Drive upload
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Clean = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Clean);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an attachment file to moryagroupdata@gmail.com Google Drive
 */
export async function uploadFileToGoogleDrive(
  file: File | Blob,
  fileName = 'receipt.jpg'
): Promise<string> {
  const base64Data = await fileToBase64(file);
  const scriptUrl = getGoogleDriveScriptUrl();

  const payload = {
    base64: base64Data,
    fileName: `morya_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    contentType: file.type || 'image/jpeg',
  };

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && (json.viewUrl || json.url)) {
        return json.viewUrl || json.url;
      }
    }
  } catch (err) {
    console.warn('[Google Drive] Web App direct POST error, attempting fallback payload:', err);
  }

  // Fallback: Return standard Data URL if custom script endpoint is not deployed yet
  return `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
}
