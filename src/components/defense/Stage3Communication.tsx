
import React from 'react';
import { MessageSquare, AlertTriangle, Sparkles, ShieldCheck, ChevronRight, Play, Phone, HelpCircle, Check, X, ShieldAlert, Copy, Scale, CheckCircle2, AlertOctagon, FileCheck2, ListChecks } from 'lucide-react';
import type { GPointDecision, DefenseTriageResult } from '../../types';

export interface Stage3CommunicationProps {
  currentStage: string;
  triageResult: DefenseTriageResult | null;
  gPointDecision: GPointDecision;
  setGPointDecision: (d: GPointDecision) => void;
  handleRunMineScan: () => void;
  isLoadingMineScan: boolean;
  copiedSection: string | null;
  handleCopyText: (text: string, id: string) => void;
  handleGeneratePleading: (type: 'LAWYER' | 'PERSONAL') => void;
  isLoadingPleading: boolean;
}

export const Stage3Communication: React.FC<Stage3CommunicationProps> = ({
  currentStage, triageResult, gPointDecision, setGPointDecision, handleRunMineScan, isLoadingMineScan, copiedSection, handleCopyText, handleGeneratePleading, isLoadingPleading
}) => {
  if (currentStage !== 'PHASE_2' || !triageResult) return null;
  return (
    <>
          {/* STAGE 3: PHASE 2 COMMUNICATION SCRIPT & 7 QUESTIONNAIRE */}
          {(currentStage === 'PHASE_2' || (triageResult && triageResult.section1EvidenceRiskAssessment)) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">3</span>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      Phase 2：三大標準板塊話術與對造證據核對 7 大問卷
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    供律師向當事人發送（Email / LINE / 備忘錄），引導當事人跳脫情緒、聚焦關鍵舉證
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-8 sm:pl-0">
                  <button
                    onClick={() => handleCopyText(
                      `${triageResult?.section1EvidenceRiskAssessment || ''}\n\n${triageResult?.section2LawyerAdvice || ''}\n\n【三、對造書狀與證據核對 7 大問卷】\n${(triageResult?.section3Questionnaire || []).map(q => `${q.qId}. ${q.title}：${q.question}\n（引導：${q.guideNote}）`).join('\n')}`,
                      'full_phase2'
                    )}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedSection === 'full_phase2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    一鍵複製全文話術
                  </button>
                </div>
              </div>

              {/* Section 1 & Section 2 Text Blocks */}
              <div className="space-y-4">
                {/* Block 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" /> 一、關鍵證據評估與訴訟風險說明
                    </h3>
                    <button
                      onClick={() => handleCopyText(triageResult?.section1EvidenceRiskAssessment || '', 'sec1')}
                      className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'sec1' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {triageResult?.section1EvidenceRiskAssessment || '（請先執行 B 點判定以產製話術）'}
                  </p>
                </div>

                {/* Block 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" /> 二、律師建議之訴訟方向
                    </h3>
                    <button
                      onClick={() => handleCopyText(triageResult?.section2LawyerAdvice || '', 'sec2')}
                      className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'sec2' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {triageResult?.section2LawyerAdvice || '（請先執行 B 點判定以產製話術）'}
                  </p>
                </div>
              </div>

              {/* Section 3: 7 Questions Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-600" /> 三、對造書狀與證據核對 7 大問卷
                  </h3>
                  <span className="text-xs text-slate-400">標準事實調查問卷模板</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-12 text-center">序號</th>
                        <th className="p-3 w-40">核對板塊</th>
                        <th className="p-3">引導提問與待證目標</th>
                        <th className="p-3 w-44">建議檢附之附件證據</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(triageResult?.section3Questionnaire || []).map((q) => (
                        <tr key={q.qId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400 text-center">{q.qId}</td>
                          <td className="p-3 font-bold text-slate-800">{q.title}</td>
                          <td className="p-3 space-y-1">
                            <div className="text-slate-800 font-medium">{q.question}</div>
                            <div className="text-[11px] text-slate-500"><strong>引導指引：</strong>{q.guideNote}</div>
                            <div className="text-[11px] text-emerald-700"><strong>待證標的：</strong>{q.targetFact}</div>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            <span className="inline-block bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 font-medium">
                              📎 {q.suggestedAttachment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* G-Point Forking Decision Panel */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-700" />
                      【G點判定】：當事人溝通後續態度分流
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    依據當事人對於 Phase 2 溝通話術之反饋，決定下一步防禦軌道走向：
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fork 1: Rational Cooperation */}
                  <div 
                    onClick={() => setGPointDecision('COOPERATE')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      gPointDecision === 'COOPERATE'
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        【態度一】回歸理性配合提供事實
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        走軌道一
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      當事人理解訴訟風險，配合提供具體單據或客觀事實，由律師納入《民事準備書狀/答辯狀》並具狀簽章。
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGPointDecision('COOPERATE');
                        handleGeneratePleading('LAWYER_PLEADING');
                      }}
                      disabled={isLoadingPleading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      生成《律師專業準備書狀/答辯狀》
                    </button>
                  </div>

                  {/* Fork 2: Insist Submitting Everything */}
                  <div 
                    onClick={() => setGPointDecision('INSIST_SUBMIT')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      gPointDecision === 'INSIST_SUBMIT'
                        ? 'bg-rose-50/90 border-rose-500 shadow-sm ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                        【態度二】堅持將全部意見送交法院
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        啟動 Phase 3
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      當事人堅持不改情緒文字與全部意見。律師啟動 6 大不利自認地雷掃描，並產製律師不背書之《當事人個人陳報狀》。
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGPointDecision('INSIST_SUBMIT');
                        handleRunMineScan();
                      }}
                      disabled={isLoadingMineScan}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoadingMineScan ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          正在掃描自認地雷...
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          執行【6大不利自認地雷掃描】
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


    </>
  );
};
