"use client";

import { useState } from "react";
import ContractForm from "./components/ContractForm";
import DataReview from "./components/DataReview";
import IdUpload from "./components/IdUpload";
import StepIndicator from "./components/StepIndicator";
import type { CccdData } from "./types";

export default function Home() {
  const [step, setStep] = useState(1);
  const [cccdData, setCccdData] = useState<Partial<CccdData>>({});

  const handleExtracted = (data: Partial<CccdData>) => {
    setCccdData(data);
    setStep(2);
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-full">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">ORC – Quét hợp đồng</h1>
            <p className="text-xs text-gray-400 mt-0.5">Nhận dạng CCCD & tạo hợp đồng thuê nhà</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === 1 && <IdUpload onExtracted={handleExtracted} />}
          {step === 2 && (
            <DataReview
              data={cccdData}
              onChange={setCccdData}
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
