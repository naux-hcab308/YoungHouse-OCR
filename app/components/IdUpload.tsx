"use client";

import { useCallback, useRef, useState } from "react";
import type { CccdData } from "../types";

interface Props {
  onExtracted: (data: Partial<CccdData>, raw: { front: string; back: string }) => void;
}

export default function IdUpload({ onExtracted }: Props) {
  const [cardType, setCardType] = useState<"old" | "new">("new");
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [draggingFront, setDraggingFront] = useState(false);
  const [draggingBack, setDraggingBack] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File, side: "front" | "back") => {
    if (!f.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPEG, PNG, WEBP, ...)");
      return;
    }
    setError("");
    if (side === "front") {
      setFrontFile(f);
      setFrontPreview(URL.createObjectURL(f));
    } else {
      setBackFile(f);
      setBackPreview(URL.createObjectURL(f));
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, side: "front" | "back") => {
      e.preventDefault();
      if (side === "front") {
        setDraggingFront(false);
      } else {
        setDraggingBack(false);
      }
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f, side);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const f = e.target.files?.[0];
    if (f) handleFile(f, side);
  };

  const runOcr = async () => {
    if (!frontFile || !backFile) return;
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
      formData.append("imageFront", frontFile);
      formData.append("imageBack", backFile);
      formData.append("cardType", cardType);

      setStatusMsg("Đang nhận dạng ký tự (OCR)...");
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Lỗi không xác định");
      }

      setProgress(90);
      setStatusMsg("AI đang chuẩn hoá dữ liệu...");
      const { parsed, rawTextFront, rawTextBack } = await res.json() as {
        rawTextFront: string;
        rawTextBack: string;
        parsed: Partial<CccdData>;
      };

      setProgress(100);
      setStatusMsg("Hoàn tất!");
      setTimeout(() => onExtracted(parsed, { front: rawTextFront ?? "", back: rawTextBack ?? "" }), 400);
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
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Quét 2 mặt Căn cước công dân</h2>
        <p className="text-sm text-gray-500">Chọn loại CCCD và tải đủ ảnh mặt trước + mặt sau để OCR chính xác hơn.</p>
      </div>

      {/* CCCD type selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Loại CCCD</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCardType("new")}
            className={`h-12 rounded-2xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              cardType === "new"
                ? "border-rose-500 bg-rose-50 text-gray-900 shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-800 hover:border-rose-200"
            }`}
          >
            <span className="text-lg" aria-hidden>
              🪪
            </span>
            CCCD mới
          </button>
          <button
            type="button"
            onClick={() => setCardType("old")}
            className={`h-12 rounded-2xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              cardType === "old"
                ? "border-rose-500 bg-rose-50 text-gray-900 shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-800 hover:border-rose-200"
            }`}
          >
            <span className="text-lg" aria-hidden>
              💳
            </span>
            CCCD cũ
          </button>
        </div>
      </div>

      {/* Front and back upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadCard
          title="Mặt trước"
          preview={frontPreview}
          dragging={draggingFront}
          processing={processing}
          inputRef={frontInputRef}
          onDragOver={() => setDraggingFront(true)}
          onDragLeave={() => setDraggingFront(false)}
          onDrop={(e) => handleDrop(e, "front")}
          onClick={() => !processing && frontInputRef.current?.click()}
          onChange={(e) => handleInputChange(e, "front")}
        />
        <UploadCard
          title="Mặt sau"
          preview={backPreview}
          dragging={draggingBack}
          processing={processing}
          inputRef={backInputRef}
          onDragOver={() => setDraggingBack(true)}
          onDragLeave={() => setDraggingBack(false)}
          onDrop={(e) => handleDrop(e, "back")}
          onClick={() => !processing && backInputRef.current?.click()}
          onChange={(e) => handleInputChange(e, "back")}
        />
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
              className="h-full bg-gradient-to-r from-cyan-600 to-rose-500 rounded-full transition-all duration-500"
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
        disabled={!frontFile || !backFile || processing}
        className="w-full h-12 rounded-full bg-sky-900 text-white font-semibold text-sm hover:bg-sky-950 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md"
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
      <p className="text-center text-xs text-gray-500 italic">
        Vui lòng đảm bảo hình ảnh rõ nét và không bị mất góc.
      </p>
    </div>
  );
}

function UploadCard({
  title,
  preview,
  dragging,
  processing,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onChange,
}: {
  title: string;
  preview: string | null;
  dragging: boolean;
  processing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
          dragging
            ? "border-cyan-500 bg-cyan-50/50"
            : "border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
        />
        {preview ? (
          <div className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={title}
              className="h-48 w-full rounded-xl object-contain shadow"
            />
            {!processing && (
              <p className="text-center mt-2 text-xs text-gray-400">
                Nhấn để thay đổi ảnh
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center mb-3 ring-4 ring-sky-50">
              <svg className="w-7 h-7 text-sky-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">
              Chạm để chụp hoặc tải lên
            </p>
            <p className="text-xs text-gray-400 mt-2">Kéo thả ảnh vào đây hoặc nhấn để chọn file</p>
          </div>
        )}
      </div>
    </div>
  );
}
