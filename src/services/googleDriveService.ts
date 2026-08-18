/**
 * Google Drive & Email Dispatch Storage Service for Morya Group Web
 * Uploads receipt/bill photos directly to moryagroupdata@gmail.com Google Drive
 * and sends email notifications via Google Apps Script Web App.
 */

export const TARGET_EMAIL = 'moryagroupdata@gmail.com';
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
 * Converts a file or Blob to a compressed Base64 string for Drive/Email payload
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
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
 * Tests connection to configured Google Apps Script Web App
 */
export async function testGoogleDriveConnection(customUrl?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const scriptUrl = customUrl || getGoogleDriveScriptUrl();
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'PING' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return { success: true, message: 'Google Apps Script जोडणी यशस्वी! (Connected)' };
      }
    }
    return { success: false, message: 'Google Apps Script कडून प्रतिसाद मिळाला नाही.' };
  } catch (err: any) {
    return {
      success: false,
      message: `जोडणी त्रुटी: ${err?.message || 'तपासा आणि पुन्हा प्रयत्न करा'}`,
    };
  }
}

export interface DispatchReceiptPayload {
  blob: Blob;
  fileName: string;
  subject: string;
  htmlBody: string;
  financialYear: string;
}

export interface DispatchReceiptResult {
  success: boolean;
  driveUrl?: string;
  message: string;
}

/**
 * Saves generated receipt to Google Drive and emails to moryagroupdata@gmail.com
 */
export async function uploadAndEmailTransactionReceipt(
  payload: DispatchReceiptPayload
): Promise<DispatchReceiptResult> {
  const base64Data = await fileToBase64(payload.blob);
  const scriptUrl = getGoogleDriveScriptUrl();

  const bodyData = {
    action: 'SAVE_AND_EMAIL',
    base64: base64Data,
    fileName: payload.fileName,
    contentType: payload.blob.type || 'image/jpeg',
    subject: payload.subject,
    htmlBody: payload.htmlBody,
    financialYear: payload.financialYear,
  };

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        return {
          success: true,
          driveUrl: json.viewUrl || json.url,
          message: `पावती moryagroupdata@gmail.com वर पाठवली व Google Drive मध्ये सेव्ह झाली.`,
        };
      }
    }
  } catch (err) {
    console.warn('[Transaction Dispatch] Google Apps Script dispatch error:', err);
  }

  return {
    success: false,
    message: 'Google Apps Script थेट कनेक्ट होऊ शकले नाही. स्थानिक स्वरूपात सेव्ह केले.',
  };
}

/**
 * Standard upload function for general files
 */
export async function uploadFileToGoogleDrive(
  file: File | Blob,
  fileName = 'receipt.jpg'
): Promise<string> {
  const base64Data = await fileToBase64(file);
  const scriptUrl = getGoogleDriveScriptUrl();

  const payload = {
    action: 'UPLOAD_ONLY',
    base64: base64Data,
    fileName: `morya_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    contentType: file.type || 'image/jpeg',
  };

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && (json.viewUrl || json.url)) {
        return json.viewUrl || json.url;
      }
    }
  } catch (err) {
    console.warn('[Google Drive] Web App direct POST error:', err);
  }

  return `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
}
