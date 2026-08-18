/**
 * signatureService.ts
 * Manages authorized digital signatures for Treasurer (खजिनदार) and Vice Treasurer (उपखजिनदार).
 * Signatures are strictly saved and maintained in the ONLINE database (Supabase & Firestore)
 * and kept in memory for high-performance receipt voucher generation.
 * Local storage persistence is deliberately purged for security.
 */

import {
  fetchOfficerSignaturesFromSupabase,
  saveOfficerSignatureToSupabase,
  deleteOfficerSignatureFromSupabase,
} from './supabaseService';
import {
  fetchOfficerSignaturesFromFirestore,
  saveOfficerSignatureToFirestore,
  deleteOfficerSignatureFromFirestore,
} from './firestoreService';

export interface OfficerSignature {
  role: 'खजिनदार' | 'उपखजिनदार' | 'अध्यक्ष' | 'सचिव';
  officerName: string;
  signatureDataUrl: string; // Base64 PNG/JPEG or Secure Cloud URL
  updatedAt: string;
}

// In-memory runtime cache for high-speed synchronous canvas rendering
const activeSignatures: {
  treasurer: OfficerSignature | null;
  viceTreasurer: OfficerSignature | null;
} = {
  treasurer: null,
  viceTreasurer: null,
};

// Purge any legacy signature data from unsecure client localStorage
export function purgeLocalSignatureStorage(): void {
  try {
    localStorage.removeItem('morya_sig_treasurer_v1');
    localStorage.removeItem('morya_sig_vice_treasurer_v1');
    localStorage.removeItem('morya_sig_president_v1');
  } catch {}
}

// Initialize / Sync signatures directly from online database
export async function syncOfficerSignaturesFromOnline(): Promise<{
  treasurer: OfficerSignature | null;
  viceTreasurer: OfficerSignature | null;
}> {
  purgeLocalSignatureStorage();

  try {
    // 1. Try Supabase Settings table first
    const supSigs = await fetchOfficerSignaturesFromSupabase();
    if (supSigs.treasurer || supSigs.viceTreasurer) {
      if (supSigs.treasurer) activeSignatures.treasurer = supSigs.treasurer;
      if (supSigs.viceTreasurer) activeSignatures.viceTreasurer = supSigs.viceTreasurer;
      window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { online: true } }));
      return activeSignatures;
    }

    // 2. Fallback to Firestore Settings
    const fireSigs = await fetchOfficerSignaturesFromFirestore();
    if (fireSigs.treasurer || fireSigs.viceTreasurer) {
      if (fireSigs.treasurer) activeSignatures.treasurer = fireSigs.treasurer;
      if (fireSigs.viceTreasurer) activeSignatures.viceTreasurer = fireSigs.viceTreasurer;
      window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { online: true } }));
      return activeSignatures;
    }
  } catch (err) {
    console.warn('[SignatureService] Online sync error:', err);
  }

  return activeSignatures;
}

// Synchronous getters reading from the live in-memory synchronized cloud store
export function getTreasurerSignature(): OfficerSignature | null {
  return activeSignatures.treasurer;
}

export function getViceTreasurerSignature(): OfficerSignature | null {
  return activeSignatures.viceTreasurer;
}

export function getAllOfficerSignatures(): {
  treasurer: OfficerSignature | null;
  viceTreasurer: OfficerSignature | null;
} {
  return {
    treasurer: activeSignatures.treasurer,
    viceTreasurer: activeSignatures.viceTreasurer,
  };
}

// Online Save Methods (strictly saves to cloud database)
export async function setTreasurerSignature(signatureDataUrl: string, officerName: string = 'खजिनदार'): Promise<void> {
  const data: OfficerSignature = {
    role: 'खजिनदार',
    officerName,
    signatureDataUrl,
    updatedAt: new Date().toISOString(),
  };

  activeSignatures.treasurer = data;
  purgeLocalSignatureStorage();
  window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'खजिनदार' } }));

  try {
    await Promise.allSettled([
      saveOfficerSignatureToSupabase(data),
      saveOfficerSignatureToFirestore(data),
    ]);
  } catch (err) {
    console.error('[SignatureService] Failed to save treasurer signature online:', err);
  }
}

export async function clearTreasurerSignature(): Promise<void> {
  activeSignatures.treasurer = null;
  purgeLocalSignatureStorage();
  window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'खजिनदार' } }));

  try {
    await Promise.allSettled([
      deleteOfficerSignatureFromSupabase('खजिनदार'),
      deleteOfficerSignatureFromFirestore('खजिनदार'),
    ]);
  } catch (err) {
    console.error('[SignatureService] Failed to delete treasurer signature online:', err);
  }
}

export async function setViceTreasurerSignature(signatureDataUrl: string, officerName: string = 'उपखजिनदार'): Promise<void> {
  const data: OfficerSignature = {
    role: 'उपखजिनदार',
    officerName,
    signatureDataUrl,
    updatedAt: new Date().toISOString(),
  };

  activeSignatures.viceTreasurer = data;
  purgeLocalSignatureStorage();
  window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'उपखजिनदार' } }));

  try {
    await Promise.allSettled([
      saveOfficerSignatureToSupabase(data),
      saveOfficerSignatureToFirestore(data),
    ]);
  } catch (err) {
    console.error('[SignatureService] Failed to save vice treasurer signature online:', err);
  }
}

export async function clearViceTreasurerSignature(): Promise<void> {
  activeSignatures.viceTreasurer = null;
  purgeLocalSignatureStorage();
  window.dispatchEvent(new CustomEvent('morya_signature_updated', { detail: { role: 'उपखजिनदार' } }));

  try {
    await Promise.allSettled([
      deleteOfficerSignatureFromSupabase('उपखजिनदार'),
      deleteOfficerSignatureFromFirestore('उपखजिनदार'),
    ]);
  } catch (err) {
    console.error('[SignatureService] Failed to delete vice treasurer signature online:', err);
  }
}
