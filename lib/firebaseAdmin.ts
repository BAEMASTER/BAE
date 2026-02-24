// lib/firebaseAdmin.ts
// ✅ Firebase Admin initializes once, stays server-only, no fs/edge issues
import * as admin from "firebase-admin";
import { createSign } from "crypto";

// Custom credential that signs JWTs without triggering OpenSSL 3.x PKCS#1 errors
class PatchedServiceAccountCredential {
  private serviceAccount: any;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(serviceAccount: any) {
    this.serviceAccount = serviceAccount;
  }

  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60) {
      return { access_token: this.cachedToken.token, expires_in: this.cachedToken.expiresAt - now };
    }

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: this.serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })).toString("base64url");

    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(this.serviceAccount.private_key, "base64url");

    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);

    this.cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
    return { access_token: data.access_token, expires_in: data.expires_in };
  }
}

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!base64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env variable");
  }

  const jsonString = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonString);

  admin.initializeApp({
    credential: new PatchedServiceAccountCredential(serviceAccount) as any,
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
// Use REST instead of gRPC — avoids OpenSSL 3.x private key errors
db.settings({ preferRest: true });

// ✅ Only export what the server needs
export { db };
