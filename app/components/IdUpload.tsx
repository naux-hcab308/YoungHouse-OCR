"use client";

import { useCallback, useRef, useState } from "react";
import type { CccdData } from "../types";

interface Props {
  onExtracted: (data: Partial<CccdData>) => void;
}

export default function IdUpload({ onExtracted }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPEG, PNG, WEBP, ...)");
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const runOcr = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    setProgress(0);
    setStatusMsg("Đang gửi ảnh lên máy chủ...");

    try {
      // Simulate progress while waiting for server response
      const progressInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) { clearInterval(progressInterval); return p; }
          return p + 5;
        });
      }, 800);

      const formData = new FormData();
      formData.append("image", file);

      setStatusMsg("Đang nhận dạng ký tự (OCR)...");
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Lỗi không xác định");
      }

      setProgress(95);
      setStatusMsg("Phân tích dữ liệu...");
      const { parsed } = await res.json() as { rawText: string; parsed: Partial<CccdData> };

      setProgress(100);
      setStatusMsg("Hoàn tất!");
      setTimeout(() => onExtracted(parsed), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi xử lý ảnh.");
      setProgress(0);
      setStatusMsg("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Tải ảnh Căn cước công dân</h2>
        <p className="text-sm text-gray-500">Chụp mặt trước CCCD rõ nét, đủ ánh sáng để đạt kết quả tốt nhất.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />

        {preview ? (
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Ảnh CCCD"
              className="max-h-64 mx-auto rounded-xl object-contain shadow"
            />
            {!processing && (
              <p className="text-center mt-3 text-xs text-gray-400">
                Nhấn để thay đổi ảnh
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">Kéo thả ảnh vào đây</p>
            <p className="text-sm text-gray-400 mt-1">hoặc nhấn để chọn file</p>
            <p className="text-xs text-gray-400 mt-3">Hỗ trợ: JPEG, PNG, WEBP, HEIC</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {processing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{statusMsg}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Lần đầu chạy có thể mất 30–60 giây để tải dữ liệu ngôn ngữ.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={runOcr}
        disabled={!file || processing}
        className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Đang xử lý...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Quét OCR
          </>
        )}
      </button>
    </div>
  );
}
