// lib/firebaseAdmin.ts
// ✅ Firebase Admin initializes once, stays server-only, no fs/edge issues
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!base64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }

  const jsonString = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonString);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
// Use REST instead of gRPC — gRPC native bindings use OpenSSL 3.x which breaks on Vercel
db.settings({ preferRest: true });

// ✅ Only export what the server needs
export { db };
