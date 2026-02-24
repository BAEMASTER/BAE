// lib/firebaseAdmin.ts
// ✅ Firebase Admin initializes once, stays server-only, no fs/edge issues
import * as admin from "firebase-admin";
import * as crypto from "crypto";

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!base64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }

  const jsonString = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonString);

  // OpenSSL 3.x (Node 17+) rejects PKCS#1 keys — convert to PKCS#8
  if (serviceAccount.private_key) {
    try {
      const keyObject = crypto.createPrivateKey(serviceAccount.private_key);
      serviceAccount.private_key = keyObject
        .export({ type: "pkcs8", format: "pem" })
        .toString();
    } catch {
      // Key is already PKCS#8 or will fail at Firebase init
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ✅ Only export what the server needs
export { db };
