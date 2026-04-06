import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Try NEXT_PUBLIC_FIREBASE_CONFIG (JSON string) first, fall back to individual env vars
const config = (() => {
  const json = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (json) {
    try { return JSON.parse(json); } catch {}
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
})();

const app = getApps()[0] ?? (config.apiKey ? initializeApp(config) : null);

export const auth = app ? getAuth(app) : null as any;
export const provider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : null as any;
