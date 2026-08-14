import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkLive() {
  console.log('--- FIRESTORE LIVE DATA CHECK ---');
  const cols = ['incomes', 'expenses', 'members', 'occasions', 'gallery', 'suggestions'];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`Collection [${c}]: ${snap.size} documents.`);
      snap.docs.forEach((d) => {
        console.log(`  - doc id: ${d.id}, data: ${JSON.stringify(d.data()).slice(0, 100)}...`);
      });
    } catch (e: any) {
      console.error(`Collection [${c}] Error:`, e.message || e);
    }
  }
  process.exit(0);
}

checkLive();
