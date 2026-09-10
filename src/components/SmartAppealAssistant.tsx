import React from "react";
import { useSmartAppealAssistant } from '../hooks/useSmartAppealAssistant';

import { AppealStep1 } from './appeal/AppealStep1';
import { AppealStep2 } from './appeal/AppealStep2';
import { AppealStep3 } from './appeal/AppealStep3';
import { AppealStep4 } from './appeal/AppealStep4';

import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.mjs`;
  } catch (err) {
    console.warn('pdfjs GlobalWorkerOptions setup exception:', err);
  }
}

export default function SmartAppealAssistant() {
  const {
    ctx,
    deliveryDate,
    setDeliveryDate,
    travelDays,
    setTravelDays,
    deadlineInfo,
    currentStep,
    setCurrentStep
  } = useSmartAppealAssistant();

  return (
    <div className="w-full flex flex-col h-full overflow-y-auto bg-[var(--color-surface-base)] p-4 md:p-6">
      {/* 頂部：上訴期間與警示 Banner */}
      <div className="bg-[var(--color-surface-overlay)] rounded-xl shadow-xs p-4 mb-6 border border-[var(--color-border-subtle)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 border border-[var(--color-status-danger)]/30 text-red-600 flex items-center justify-center font-bold text-xl shrink-0">
            ⏳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[var(--color-text-primary)]">上訴法定期間檢示</span>
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                不變期間 20 日
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1 flex flex-wrap gap-x-4">
              <span>送達日期：<input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="border rounded px-1 text-xs font-bold" /></span>
              <span>在途期間加計：
                <select value={travelDays} onChange={e => setTravelDays(Number(e.target.value))} className="border rounded px-1 text-xs">
                  <option value={0}>0 天（同縣市）</option>
                  <option value={2}>2 天（鄰近縣市）</option>
                  <option value={4}>4 天（長途/離島）</option>
                </select>
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-around">
          <div className="text-center">
            <div className="text-xs text-[var(--color-text-muted)] font-medium">聲明上訴最後期限</div>
            <div className="text-sm font-bold text-red-600">{deadlineInfo.declarationDeadline}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--color-text-muted)] font-medium">剩餘天數</div>
            <div className={`text-lg font-extrabold ${deadlineInfo.daysLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-[var(--color-brand-primary)]'}`}>
              {deadlineInfo.daysLeft > 0 ? `${deadlineInfo.daysLeft} 天` : '已逾期或今日截止'}
            </div>
          </div>
        </div>
      </div>

      {/* 步驟導引指示器 */}
      <div className="bg-[var(--color-surface-overlay)] rounded-xl shadow-xs p-3 mb-6 border border-[var(--color-border-subtle)] flex flex-wrap justify-between items-center text-xs md:text-sm font-bold">
        {[
          { num: 1, label: '1. 匯入裁判書 (上傳/API)' },
          { num: 2, label: '2. 分析爭點與判解函釋' },
          { num: 3, label: '3. 提供與整理調查證據' },
          { num: 4, label: '4. 結合三者產生上訴書' },
        ].map(step => (
          <button
            key={step.num}
            onClick={() => setCurrentStep(step.num)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentStep === step.num ? 'bg-[var(--color-brand-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-overlay)]'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${currentStep === step.num ? 'bg-[var(--color-surface-overlay)] text-[var(--color-brand-primary)] font-extrabold' : 'bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]'}`}>{step.num}</span>
            {step.label}
          </button>
        ))}
      </div>

      
      <AppealStep1 ctx={ctx} />
      <AppealStep2 ctx={ctx} />
      <AppealStep3 ctx={ctx} />
      <AppealStep4 ctx={ctx} />
</div>
  );
}
