import { NextResponse } from "next/server";
import { createSign, createPrivateKey } from "crypto";

export async function GET() {
  try {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!base64) return NextResponse.json({ error: "No env var" });

    const sa = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    const keyHeader = sa.private_key?.substring(0, 35);

    let createKeyOk = "untested";
    try {
      createPrivateKey(sa.private_key);
      createKeyOk = "ok";
    } catch (e: any) {
      createKeyOk = `fail: ${e.message?.substring(0, 100)}`;
    }

    let signOk = "untested";
    try {
      const sign = createSign("RSA-SHA256");
      sign.update("test-data");
      sign.sign(sa.private_key, "base64");
      signOk = "ok";
    } catch (e: any) {
      signOk = `fail: ${e.message?.substring(0, 100)}`;
    }

    return NextResponse.json({
      nodeVersion: process.version,
      opensslVersion: process.versions.openssl,
      keyHeader,
      createKeyOk,
      signOk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
