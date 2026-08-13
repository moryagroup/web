import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { StoredImageRecord } from '../types';

const IMAGES_COL = 'images';

/**
 * Compresses an image file before upload (max 800px width/height, JPEG format)
 */
export async function compressImageFile(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Saves or updates a permanent image record in Firestore
 */
export async function saveImageRecord(record: StoredImageRecord): Promise<void> {
  const timestamp = new Date().toISOString();
  const fullRecord: StoredImageRecord = {
    ...record,
    createdAt: record.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await setDoc(doc(db, IMAGES_COL, fullRecord.id), fullRecord);
  console.log(`[ImageStorage] Saved image record: ${fullRecord.id} (${fullRecord.entityType})`);
}

/**
 * Deletes a stored image record from Firestore
 */
export async function deleteImageRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, IMAGES_COL, id));
  console.log(`[ImageStorage] Deleted image record: ${id}`);
}

/**
 * Subscribes to real-time updates for all stored images
 */
export function subscribeToImages(
  callback: (images: StoredImageRecord[]) => void
): () => void {
  return onSnapshot(
    collection(db, IMAGES_COL),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as StoredImageRecord);
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[ImageStorage] subscribeToImages error:', err)
  );
}

/**
 * Retrieves an image record by entity ID and type
 */
export async function getImageByEntity(
  entityId: string,
  entityType: StoredImageRecord['entityType']
): Promise<StoredImageRecord | null> {
  try {
    const q = query(
      collection(db, IMAGES_COL),
      where('entityId', '==', entityId),
      where('entityType', '==', entityType)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as StoredImageRecord;
    }
  } catch (err) {
    console.warn('[ImageStorage] getImageByEntity error:', err);
  }
  return null;
}
