// lib/firebaseAdmin.ts
// ✅ Firebase Admin initializes once, stays server-only, no fs/edge issues
import * as admin from "firebase-admin";
import { createPrivateKey } from "crypto";

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!base64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }

  const jsonString = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonString);

  // OpenSSL 3.x rejects PKCS#1 keys — convert to PKCS#8 via Node crypto
  if (serviceAccount.private_key) {
    try {
      const key = createPrivateKey(serviceAccount.private_key);
      serviceAccount.private_key = key.export({ type: "pkcs8", format: "pem" }).toString();
    } catch {
      // Already PKCS#8 compatible
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
// Use REST instead of gRPC — gRPC native bindings have separate OpenSSL issues
db.settings({ preferRest: true });

// ✅ Only export what the server needs
export { db };
