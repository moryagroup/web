import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFzf3gVs0vhstWxsbG6DJui13yNb97Dgs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "morya-group-352ad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "morya-group-352ad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "morya-group-352ad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1033031751154",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1033031751154:web:c5f40ec456aca1deab076b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M9X7HPGWT0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
