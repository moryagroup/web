import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuthAndFirestore() {
  try {
    console.log('Attempting anonymous sign in...');
    const userCred = await signInAnonymously(auth);
    console.log('Signed in anonymously! UID:', userCred.user.uid);

    console.log('Checking incomes collection...');
    const snap = await getDocs(collection(db, 'incomes'));
    console.log('Incomes doc count:', snap.size);
  } catch (err: any) {
    console.error('Error:', err.code, err.message);
  }
  process.exit(0);
}

testAuthAndFirestore();
