import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFzf3gVs0vhstWxsbG6DJui13yNb97Dgs",
  authDomain: "morya-group-352ad.firebaseapp.com",
  projectId: "morya-group-352ad",
  storageBucket: "morya-group-352ad.firebasestorage.app",
  messagingSenderId: "1033031751154",
  appId: "1:1033031751154:web:c5f40ec456aca1deab076b",
  measurementId: "G-M9X7HPGWT0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearTransactions() {
  console.log('[Firestore Wipe] Connecting to Firestore morya-group-352ad...');

  // Clear incomes
  const incomeSnap = await getDocs(collection(db, 'incomes'));
  console.log(`[Firestore Wipe] Found ${incomeSnap.size} income documents.`);
  if (!incomeSnap.empty) {
    const batch = writeBatch(db);
    incomeSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log('[Firestore Wipe] Successfully deleted all income documents.');
  }

  // Clear expenses
  const expenseSnap = await getDocs(collection(db, 'expenses'));
  console.log(`[Firestore Wipe] Found ${expenseSnap.size} expense documents.`);
  if (!expenseSnap.empty) {
    const batch = writeBatch(db);
    expenseSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log('[Firestore Wipe] Successfully deleted all expense documents.');
  }

  console.log('[Firestore Wipe] Done! Firestore transactions cleared.');
  process.exit(0);
}

clearTransactions().catch((err) => {
  console.error('[Firestore Wipe Error]:', err);
  process.exit(1);
});
