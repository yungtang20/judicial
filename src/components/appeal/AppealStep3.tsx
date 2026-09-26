import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";
import { AttachmentHeaderFields, type AttachmentHeaderValues } from './AttachmentHeaderFields';
import type { AppealStepContext } from './appealStepContext';
import { EvidenceEditorList } from './EvidenceEditorList';
import { evidenceRowsFromCase, evidenceRowsToCase } from '../../lib/caseRowAdapters';
import { useCaseStore } from '../../store/useCaseStore';

export function AppealStep3({ ctx }: { ctx: AppealStepContext }) {
  const updateCaseEvidences = useCaseStore(state => state.updateEvidences);
  const {
    currentStep,
    setCurrentStep,
    attachmentText,
    setAttachmentText,
    tableCourtName,
    setTableCourtName,
    tableYear,
    setTableYear,
    tableWord,
    setTableWord,
    tableNo,
    setTableNo,
    tableSubmitter,
    setTableSubmitter,
    tableSubmitDate,
    setTableSubmitDate,
    evidences,
    setEvidences,
    isGeneratingPetition,
    petitionError,
    handleGeneratePetition
  } = ctx;
  const updateHeaderField = (field: keyof AttachmentHeaderValues, value: string) => {
    if (field === 'attachmentText') setAttachmentText(value);
    if (field === 'courtName') setTableCourtName(value);
    if (field === 'year') setTableYear(value);
    if (field === 'word') setTableWord(value);
    if (field === 'caseNo') setTableNo(value);
    if (field === 'submitter') setTableSubmitter(value);
    if (field === 'submitDate') setTableSubmitDate(value);
  };

  return (
    <>
      {/* 步驟 3: 提供與整理調查證據 */}
      {currentStep === 3 && (
        <div className="bg-[var(--color-surface-overlay)] p-6 rounded-xl shadow-xs border border-[var(--color-border-subtle)] space-y-6">
          <div className="border-b border-[var(--color-border-subtle)] pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">第三步：提供與整理調查證據 (調查證據聲請表)</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">編修欲向法院聲請調查之證據標的、調查事項、調查對象與待證事實（控制在50字內），並連結對應之案件爭點，作為上訴狀之附表。</p>
            </div>
          </div>

          <AttachmentHeaderFields
            accent="emerald"
            values={{ attachmentText, courtName: tableCourtName, year: tableYear, word: tableWord, caseNo: tableNo, submitter: tableSubmitter, submitDate: tableSubmitDate }}
            onChange={updateHeaderField}
          />

          <EvidenceEditorList
            evidences={evidenceRowsFromCase(evidences)}
            onChange={next => {
              const canonical = evidenceRowsToCase(next);
              setEvidences(canonical);
              updateCaseEvidences(canonical);
            }}
          />

          <div className="flex justify-between pt-4 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            >
              ⯇ 上一步
            </button>

            {petitionError && (
              <div role="alert" className="flex-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                <span className="font-semibold">上訴理由狀尚未開放產製：</span>
                <span>{petitionError}</span>
              </div>
            )}
            <button
              onClick={handleGeneratePetition}
              disabled={isGeneratingPetition}
              className="bg-[var(--color-brand-primary)] text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 flex items-center gap-2 shadow-xs"
            >
              {isGeneratingPetition ? '✍️ 正在結合爭點、判例與證據生成上訴書...' : '✍️ 結合爭點、判例與證據產生上訴書 ➔'}
            </button>
          </div>
        </div>
      )}

      
    </>
  );
}
