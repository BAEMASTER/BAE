// lib/firebaseAdmin.ts
// ✅ Firebase Admin initializes once, stays server-only, no fs/edge issues
import * as admin from "firebase-admin";

// Rebuild PEM with proper line breaks (base64 env var encoding can strip newlines)
function fixPemKey(key: string): string {
  const b64 = key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const lines = b64.match(/.{1,64}/g) || [b64];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (base64) {
    const jsonString = Buffer.from(base64, "base64").toString("utf8");
    const serviceAccount = JSON.parse(jsonString);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = fixPemKey(serviceAccount.private_key);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

// Lazy getter — throws at runtime if Firebase isn't initialized, but not at build time
function getDb() {
  if (!admin.apps.length) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }
  return admin.firestore();
}

const db = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

// ✅ Only export what the server needs
export { db };
