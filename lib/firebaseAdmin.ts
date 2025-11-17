import * as admin from "firebase-admin";

let app: admin.app.App;

// Ensure the Firebase Admin SDK is initialized exactly once
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!base64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }

  const jsonString = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonString);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  app = admin.app();
}

const db = admin.firestore();

export { admin, db };
