"use client";

import Image from "next/image";
import { useState } from "react";
import ContractForm from "./components/ContractForm";
import DataReview from "./components/DataReview";
import IdUpload from "./components/IdUpload";
import StepIndicator from "./components/StepIndicator";
import type { CccdData } from "./types";

export default function Home() {
  const [step, setStep] = useState(1);
  const [cccdData, setCccdData] = useState<Partial<CccdData>>({});
  const [rawText, setRawText] = useState<{ front: string; back: string }>({ front: "", back: "" });

  const handleExtracted = (
    data: Partial<CccdData>,
    raw: { front: string; back: string }
  ) => {
    setCccdData(data);
    setRawText(raw);
    setStep(2);
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-100 via-white to-cyan-50/40 min-h-full">
      {/* Header */}
      <header className="border-b border-gray-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center p-1">
            <Image
              src="/younghouse-logo.png"
              alt="Younghouse"
              width={36}
              height={36}
              className="object-contain h-9 w-9"
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-sky-900 leading-tight">ORC – Quét hợp đồng</h1>
            <p className="text-xs text-gray-500 mt-0.5">Nhận dạng CCCD & tạo hợp đồng thuê nhà</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-md border border-gray-100/80 p-6 sm:p-8">
          {step === 1 && <IdUpload onExtracted={handleExtracted} />}
          {step === 2 && (
            <DataReview
              data={cccdData}
              onChange={setCccdData}
              rawTextFront={rawText.front}
              rawTextBack={rawText.back}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ContractForm
              cccd={cccdData}
              onBack={() => setStep(2)}
            />
          )}
        </div>

        {/* Info footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Dữ liệu được xử lý cục bộ • Không lưu trữ thông tin cá nhân
        </p>
      </main>
    </div>
  );
}
