/**
 * signatureService.ts
 * Manages authorized digital signatures for Treasurer (खजिनदार) and Vice Treasurer (उपखजिनदार)
 * Signatures are permanently stored in localStorage and cloud storage to be rendered on all receipt vouchers.
 */

export interface OfficerSignature {
  role: 'खजिनदार' | 'उपखजिनदार' | 'अध्यक्ष' | 'सचिव';
  officerName: string;
  signatureDataUrl: string; // Base64 PNG/JPEG or URL
  updatedAt: string;
}

const STORAGE_KEY_TREASURER_SIG = 'morya_sig_treasurer_v1';
const STORAGE_KEY_VICE_TREASURER_SIG = 'morya_sig_vice_treasurer_v1';
const STORAGE_KEY_PRESIDENT_SIG = 'morya_sig_president_v1';

export function getTreasurerSignature(): OfficerSignature | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TREASURER_SIG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setTreasurerSignature(signatureDataUrl: string, officerName: string = 'खजिनदार'): void {
  try {
    const data: OfficerSignature = {
      role: 'खजिनदार',
      officerName,
      signatureDataUrl,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_TREASURER_SIG, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'खजिनदार' } }));
  } catch (err) {
    console.error('Failed to save treasurer signature:', err);
  }
}

export function clearTreasurerSignature(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TREASURER_SIG);
    window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'खजिनदार' } }));
  } catch (err) {
    console.error('Failed to clear treasurer signature:', err);
  }
}

export function getViceTreasurerSignature(): OfficerSignature | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VICE_TREASURER_SIG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setViceTreasurerSignature(signatureDataUrl: string, officerName: string = 'उपखजिनदार'): void {
  try {
    const data: OfficerSignature = {
      role: 'उपखजिनदार',
      officerName,
      signatureDataUrl,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_VICE_TREASURER_SIG, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'उपखजिनदार' } }));
  } catch (err) {
    console.error('Failed to save vice treasurer signature:', err);
  }
}

export function clearViceTreasurerSignature(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_VICE_TREASURER_SIG);
    window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'उपखजिनदार' } }));
  } catch (err) {
    console.error('Failed to clear vice treasurer signature:', err);
  }
}

export function getAllOfficerSignatures(): {
  treasurer: OfficerSignature | null;
  viceTreasurer: OfficerSignature | null;
} {
  return {
    treasurer: getTreasurerSignature(),
    viceTreasurer: getViceTreasurerSignature(),
  };
}
