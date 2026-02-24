import { NextResponse } from "next/server";
import { createSign, createPrivateKey } from "crypto";

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const bin = Buffer.from(b64, "base64");
  return bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
}

export async function GET() {
  try {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!base64) return NextResponse.json({ error: "No env var" });

    const sa = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    const keyHeader = sa.private_key?.substring(0, 35);
    const hasNewlines = sa.private_key?.includes("\n");
    const keyLength = sa.private_key?.length;

    // Test 1: Node crypto createPrivateKey
    let createKeyOk = "untested";
    try {
      createPrivateKey(sa.private_key);
      createKeyOk = "ok";
    } catch (e: any) {
      createKeyOk = `fail: ${e.message?.substring(0, 100)}`;
    }

    // Test 2: Node crypto createSign
    let signOk = "untested";
    try {
      const sign = createSign("RSA-SHA256");
      sign.update("test-data");
      sign.sign(sa.private_key, "base64");
      signOk = "ok";
    } catch (e: any) {
      signOk = `fail: ${e.message?.substring(0, 100)}`;
    }

    // Test 3: Web Crypto API (bypasses OpenSSL entirely)
    let webCryptoOk = "untested";
    try {
      const keyData = pemToArrayBuffer(sa.private_key);
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode("test-data")
      );
      webCryptoOk = sig.byteLength > 0 ? "ok" : "fail: empty signature";
    } catch (e: any) {
      webCryptoOk = `fail: ${e.message?.substring(0, 100)}`;
    }

    return NextResponse.json({
      nodeVersion: process.version,
      opensslVersion: process.versions.openssl,
      keyHeader,
      hasNewlines,
      keyLength,
      createKeyOk,
      signOk,
      webCryptoOk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
