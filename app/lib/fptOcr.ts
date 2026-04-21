/**
 * FPT.AI IDR (ID Recognition) API wrapper for Vietnamese CCCD.
 * 
 * API: https://api.fpt.ai/vision/idr/vnm
 * Returns structured CCCD data directly.
 */

import type { CccdData } from "../types";

const FPT_API_KEY = process.env.FPT_AI_API_KEY;
const FPT_API_URL = "https://api.fpt.ai/vision/idr/vnm";

interface FptIdResponse {
  data?: {
    front?: {
      id?: string;
      name?: string;
      dob?: string;
      gender?: string;
      home?: string;
      address?: string;
      issue_date?: string;
      expire_date?: string;
    };
    back?: {
      issue_location?: string;
    };
  };
  errorCode?: string;
  errorMessage?: string;
}

export async function extractCccdWithFpt(
  frontBuffer: Buffer,
  backBuffer: Buffer
): Promise<{ parsed: Partial<CccdData>; rawTextFront: string; rawTextBack: string }> {
  if (!FPT_API_KEY) {
    throw new Error("FPT_AI_API_KEY not configured");
  }

  try {
    // Process front side
    const frontFormData = new FormData();
    frontFormData.append("image", new Blob([frontBuffer], { type: "image/jpeg" }));

    const frontRes = await fetch(FPT_API_URL, {
      method: "POST",
      headers: { "api-key": FPT_API_KEY },
      body: frontFormData,
    });

    if (!frontRes.ok) {
      throw new Error(`FPT front side failed: ${frontRes.statusText}`);
    }

    const frontData = (await frontRes.json()) as FptIdResponse;

    // Process back side
    const backFormData = new FormData();
    backFormData.append("image", new Blob([backBuffer], { type: "image/jpeg" }));

    const backRes = await fetch(FPT_API_URL, {
      method: "POST",
      headers: { "api-key": FPT_API_KEY },
      body: backFormData,
    });

    if (!backRes.ok) {
      throw new Error(`FPT back side failed: ${backRes.statusText}`);
    }

    const backData = (await backRes.json()) as FptIdResponse;

    // Check for errors
    if (frontData.errorCode || backData.errorCode) {
      throw new Error(
        `FPT API error: ${frontData.errorMessage || backData.errorMessage}`
      );
    }

    // Combine extracted data
    const front = frontData.data?.front;
    const back = backData.data?.back;

    const parsed: Partial<CccdData> = {
      soCanCuoc: front?.id?.trim() || undefined,
      hoTen: front?.name?.trim() || undefined,
      ngaySinh: front?.dob?.trim() || undefined,
      gioiTinh: front?.gender?.trim() || undefined,
      queQuan: front?.home?.trim() || undefined,
      thuongTru: front?.address?.trim() || undefined,
      ngayHetHan: front?.expire_date?.trim() || undefined,
      capNgay: front?.issue_date?.trim() || undefined,
      capTai: back?.issue_location?.trim() || undefined,
      quocTich: "Việt Nam",
    };

    // Construct raw text for logging/display
    const rawTextFront = `
ID: ${front?.id || ""}
Name: ${front?.name || ""}
DOB: ${front?.dob || ""}
Gender: ${front?.gender || ""}
Home: ${front?.home || ""}
Address: ${front?.address || ""}
Issue Date: ${front?.issue_date || ""}
Expire Date: ${front?.expire_date || ""}
`.trim();

    const rawTextBack = `
Issue Location: ${back?.issue_location || ""}
`.trim();

    return { parsed, rawTextFront, rawTextBack };
  } catch (err) {
    console.error("[FPT.AI] error:", err);
    throw err;
  }
}
