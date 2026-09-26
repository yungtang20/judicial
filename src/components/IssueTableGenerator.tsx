import { useEffect, useState, useMemo } from 'react';
import { AntiGhostBadge } from './AntiGhostBadge';
import { verifyLegalCitations } from '../lib/services/citationCheck';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';
import { issueRowsFromCase, issueRowsToCase, type IssueEditorRow } from '../lib/caseRowAdapters';
import { AttachmentHeaderFields, type AttachmentHeaderValues } from './appeal/AttachmentHeaderFields';
import { IssueEditorList } from './appeal/IssueEditorList';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { fetchWithAuth } from '../lib/apiClient';


interface IssueTableGeneratorProps {
  initialFacts?: string;
  initialIssueSummary?: string;
}

export default function IssueTableGenerator({ initialFacts, initialIssueSummary }: IssueTableGeneratorProps = {}) {
  const activeCase = useCaseStore(getActiveCase);
  const updateCaseIssues = useCaseStore(s => s.updateIssues);
  const todayObj = new Date();
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const [attachmentText, setAttachmentText] = useState('附表一');
  const [courtName, setCourtName] = useState('');
  const [year, setYear] = useState('');
  const [word, setWord] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [appellantName, setAppellantName] = useState('');
  const [appelleeName, setAppelleeName] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [submitDate, setSubmitDate] = useState(todayRoc);

  const [issues, setIssues] = useState<IssueEditorRow[]>(() => {
    if (activeCase.issues?.length) return issueRowsFromCase(activeCase.issues);
    if (initialIssueSummary || initialFacts) {
      return [{
        id: '1',
        issueType: '事實認定瑕疵',
        title: initialIssueSummary || '待確認爭點',
        originalHolding: '',
        appealArgument: initialFacts || '',
        relatedEvidences: '',
        legalBasis: '',
        legalStrength: 'NEED_SUPPLEMENT'
      }];
    }
    return [];
  });
  useEffect(() => {
    if ((initialIssueSummary || initialFacts) && activeCase.issues?.length === 0) {
      updateCaseIssues(issueRowsToCase(issues));
    }
  }, [initialIssueSummary, initialFacts]);


  const handlePrint = () => {
    window.print();
  };
  const updateHeaderField = (field: keyof AttachmentHeaderValues, value: string) => {
    if (field === 'attachmentText') setAttachmentText(value);
    if (field === 'courtName') setCourtName(value);
    if (field === 'year') setYear(value);
    if (field === 'word') setWord(value);
    if (field === 'caseNo') setCaseNo(value);
    if (field === 'submitter') setSubmitter(value);
    if (field === 'submitDate') setSubmitDate(value);
  };

  // Full AI Verification
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const issueTextCombined = useMemo(() => {
    return issues.map(i => `${i.title} ${i.originalHolding} ${i.appealArgument} ${i.legalBasis}`).join('\n');
  }, [issues]);

  const verification = useMemo(() => {
    const v = verifyLegalCitations(issueTextCombined);
    return {
      totalCitationsChecked: v.totalChecked,
      ghostCitationsFound: v.ghostCount,
      verifiedCitations: v.results
    };
  }, [issueTextCombined]);

  const handleFullVerify = async () => {
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    try {
      const res = await fetchWithAuth('/api/toolbox/verify-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: issueTextCombined })
      });
      if (res.ok) {
        const verifyRes = await res.json();
        const { totalCitationsChecked, ghostCitationsFound } = verifyRes.antiGhostVerification;
        setVerifyNotice(`全篇引用檢查完成：共核對 ${totalCitationsChecked} 處法律引用，疑似幽靈引用：${ghostCitationsFound} 處；結果仍需人工查證。`);
      }
    } catch (err: any) {
      console.error('Full AI verification failed:', err);
      setVerifyNotice('引用檢查暫時無法完成，請稍後重試並人工查證來源。');
    } finally {
      setIsVerifyingAi(false);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row h-full overflow-hidden bg-[var(--color-surface-base)]">
      {/* 左側編輯區 */}
      <div className="w-full md:w-1/2 lg:w-5/12 p-6 overflow-y-auto border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-primary)] flex items-center gap-2">
            <span>爭點整理表格小工具</span>
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">產生司法院標準【爭點整理對照表】（7欄標準格式），釐清原審認定與我方攻擊防禦，方便法官審理。</p>
        </div>

        <AttachmentHeaderFields
          values={{ attachmentText, courtName, year, word, caseNo, submitter, submitDate }}
          onChange={updateHeaderField}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text-secondary)] mb-1">上訴人/原告</label>
              <input value={appellantName} onChange={e => setAppellantName(e.target.value)} className="w-full border border-[var(--color-border-strong)] rounded p-1.5 text-xs bg-[var(--color-surface-overlay)]" placeholder="王小明" />
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-secondary)] mb-1">被上訴人/被告</label>
              <input value={appelleeName} onChange={e => setAppelleeName(e.target.value)} className="w-full border border-[var(--color-border-strong)] rounded p-1.5 text-xs bg-[var(--color-surface-overlay)]" placeholder="陳大華" />
            </div>
          </div>
        </AttachmentHeaderFields>
        <div className="space-y-3">

        <IssueEditorList
          issues={issues}
          onChange={(next) => {
            setIssues(next);
            updateCaseIssues(issueRowsToCase(next));
          }}
        />

          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleFullVerify}
              disabled={isVerifyingAi}
              className="w-1/2 bg-emerald-800 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex justify-center items-center gap-1.5"
            >
              {isVerifyingAi ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  檢核中...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  全篇 AI 檢核
                </>
              )}
            </button>

            <button 
              onClick={handlePrint}
              className="w-1/2 bg-[var(--color-brand-primary)] text-white py-2.5 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex justify-center items-center gap-1.5"
            >
              下載/列印 PDF
            </button>
          </div>
        </div>
      </div>

      {/* 右側：A4 列印模擬預覽區 */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-8 overflow-y-auto bg-[var(--color-border-strong)]/80 flex flex-col items-center">
        {verifyNotice && (
          <div className="w-full max-w-[210mm] mb-3 p-3 rounded-xl bg-[var(--color-status-success-bg)] border border-emerald-300 text-[var(--color-status-success)] text-xs flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {verifyNotice}
            </span>
            <button 
              onClick={() => setVerifyNotice(null)} 
              className="text-emerald-700 hover:text-[var(--color-status-success)] text-xs ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="w-full max-w-[210mm] mb-3">
          <AntiGhostBadge verification={verification} />
        </div>

        <div className="bg-[var(--color-surface-overlay)] p-10 rounded-xl w-full max-w-[210mm] min-h-[297mm] text-black text-xs leading-relaxed border border-[var(--color-border-strong)] font-serif space-y-4">
          <div className="text-left font-bold text-sm text-black">
            {attachmentText || '附表一'}
          </div>

          <div className="border-2 border-black p-3 text-center font-bold text-base text-black tracking-wider bg-[var(--color-surface-raised)]/30">
            {courtName}{year}年度{word}字第{caseNo}號爭點整理對照表
          </div>

          <div className="grid grid-cols-2 border border-black p-2 font-bold text-xs bg-[var(--color-surface-raised)]/20">
            <div>具狀人：{submitter || `上訴人 ${appellantName}`}</div>
            <div className="text-right">當事人：{appellantName} vs {appelleeName}</div>
          </div>

          {/* 7 欄位標準對照表 */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-[var(--color-surface-overlay)] text-black font-bold">
                <th className="border border-black p-2 w-[6%] text-center">項次</th>
                <th className="border border-black p-2 w-[20%] text-left">爭點名稱與主題</th>
                <th className="border border-black p-2 w-[27%] text-left">原審判決/原決定認定內容</th>
                <th className="border border-black p-2 w-[27%] text-left">我方上訴/覆審攻擊與指摘理由</th>
                <th className="border border-black p-2 w-[10%] text-center">對應證物</th>
                <th className="border border-black p-2 w-[10%] text-left">引用法條實務</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, idx) => (
                <tr key={issue.id}>
                  <td className="border border-black p-2 text-center font-bold font-mono align-middle">{idx + 1}</td>
                  <td className="border border-black p-2 align-top">
                    <div className="font-bold text-black">{issue.title}</div>
                  </td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top text-[var(--color-text-primary)]">{issue.originalHolding}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top font-medium text-black">{issue.appealArgument}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold align-top">{issue.relatedEvidences}</td>
                  <td className="border border-black p-2 align-top text-[var(--color-text-primary)]">{issue.legalBasis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

