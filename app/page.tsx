"use client";

import Image from "next/image";
import { useState } from "react";
import ContractForm from "./components/ContractForm";
import DataReview from "./components/DataReview";
import IdUpload from "./components/IdUpload";
import StepIndicator from "./components/StepIndicator";
import type { CccdData } from "./types";

const NAV_ITEMS = [
  { id: "scan", label: "Scan Document", icon: "🪪", activeSteps: [1, 2] },
  { id: "contracts", label: "Contracts", icon: "📄", activeSteps: [3] },
  { id: "archive", label: "Archived", icon: "🗂", activeSteps: [] },
];

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

  const stepTitle =
    step === 1 ? "Identity Verification" : step === 2 ? "Verify Info" : "New Contract";

  const stepSubtitle =
    step === 1
      ? "Upload front and back sides of CCCD for OCR extraction."
      : step === 2
      ? "Review detected fields and correct mismatched data."
      : "Finalize contract details from verified tenant information.";

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="hidden w-[255px] border-r border-slate-200 bg-white xl:flex xl:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <Image
                src="/younghouse-logo.png"
                alt="YoungHouse"
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl border border-slate-100 bg-white object-contain p-1 shadow-sm"
              />
              <div>
                <p className="text-[26px] font-bold leading-none text-[#00528f]">YoungHouse</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  OCR Platform
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
              const active = item.activeSteps.includes(step);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-cyan-50 to-rose-50 text-sky-900 shadow-sm ring-1 ring-cyan-100"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              className="h-12 w-full rounded-full bg-gradient-to-r from-[#016bb4] to-[#0092d1] text-sm font-semibold text-white shadow-lg shadow-cyan-200/60"
            >
              New Contract
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200/90 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-5 py-4 xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white p-1 shadow-sm xl:hidden">
                  <Image src="/younghouse-logo.png" alt="YoungHouse" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-bold text-[#083f6b]">{stepTitle}</p>
                  <p className="truncate text-sm text-slate-500">{stepSubtitle}</p>
                </div>
              </div>
              <div className="hidden w-full max-w-md items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 lg:flex">
                <span aria-hidden className="text-slate-400">🔎</span>
                <input
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search contracts..."
                />
              </div>
            </div>
          </header>

          <section className="px-5 py-6 xl:px-8 xl:py-8">
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <StepIndicator current={step} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:p-8">
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
              {step === 3 && <ContractForm cccd={cccdData} onBack={() => setStep(2)} />}
            </div>

            <p className="mt-6 text-center text-xs font-medium text-slate-400">
              Dữ liệu được xử lý cục bộ • Không lưu trữ thông tin cá nhân
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
