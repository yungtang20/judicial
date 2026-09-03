import { useState, useMemo } from 'react';
import { AntiGhostBadge } from './AntiGhostBadge';
import { verifyLegalCitations } from '../lib/citationVerifier';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FullIssueRow {
  id: string;
  title: string;             // 爭點名稱
  originalHolding: string;   // 原審判決/原決定認定內容
  appealArgument: string;    // 我方上訴/覆審指摘理由
  relatedEvidences: string;  // 對應證據編號
  legalBasis: string;        // 引用法條與實務見解
  legalStrength: 'HIGH' | 'MEDIUM' | 'NEED_SUPPLEMENT'; // 攻防勝算
}

export default function IssueTableGenerator() {
  const activeCase = useCaseStore(getActiveCase);
  const updateCaseIssues = useCaseStore(s => s.updateIssues);
  // 0. 案件基本資料
  const todayObj = new Date();
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const [attachmentText, setAttachmentText] = useState('附表一');
  const [courtName, setCourtName] = useState('臺灣高等法院');
  const [year, setYear] = useState('112');
  const [word, setWord] = useState('重上');
  const [caseNo, setCaseNo] = useState('123');
  const [appellantName, setAppellantName] = useState('王小明');
  const [appelleeName, setAppelleeName] = useState('陳大華');
  const [submitter, setSubmitter] = useState('上訴人 王小明');
  const [submitDate, setSubmitDate] = useState(todayRoc);

  const [issues, setIssues] = useState<FullIssueRow[]>(activeCase.issues.length ? activeCase.issues.map(issue => ({
    id: issue.id,
    title: issue.title,
    originalHolding: issue.originalHolding,
    appealArgument: issue.appealArgument,
    relatedEvidences: issue.relatedEvidenceCodes || '',
    legalBasis: issue.legalBasis || '',
    legalStrength: issue.legalStrength || 'NEED_SUPPLEMENT'
  })) : [
    {
      id: '1',
      title: '爭點一：兩造間消費借貸關係成立與否及舉證責任分配',
      originalHolding: '原審判決僅憑原告提出之單方匯款單，即認定兩造間成立消費借貸關係，命被告給付新臺幣100萬元。',
      appealArgument: '被告已於原審提出通訊軟體對話紀錄，證明該筆匯款實係原告清償過往合夥借款。原審未斟酌該項反證，亦未命原告就借貸意思表示一致負舉證責任，顯有採證違背經驗法則與論理法則之瑕疵。',
      relatedEvidences: '1, 上證一',
      legalBasis: '民事訴訟法第277條、最高法院109年度台上字第1820號判決',
      legalStrength: 'HIGH'
    }
  ]);

  const addIssue = () => {
    const next = [
      ...issues,
      {
        id: Date.now().toString(),
        title: `爭點${issues.length + 1}：`,
        originalHolding: '',
        appealArgument: '',
        relatedEvidences: '',
        legalBasis: '',
        legalStrength: 'HIGH'
      }
    ];
    setIssues(next);
    updateCaseIssues(next.map(issue => ({ id: issue.id, title: issue.title, originalHolding: issue.originalHolding, appealArgument: issue.appealArgument, relatedEvidenceCodes: issue.relatedEvidences, legalBasis: issue.legalBasis, legalStrength: issue.legalStrength })));
  };

  const removeIssue = (id: string) => {
    const next = issues.filter(i => i.id !== id);
    setIssues(next);
    updateCaseIssues(next.map(issue => ({ id: issue.id, title: issue.title, originalHolding: issue.originalHolding, appealArgument: issue.appealArgument, relatedEvidenceCodes: issue.relatedEvidences, legalBasis: issue.legalBasis, legalStrength: issue.legalStrength })));
  };

  const updateIssue = (id: string, field: keyof FullIssueRow, value: any) => {
    const next = issues.map(i => i.id === id ? { ...i, [field]: value } : i);
    setIssues(next);
    updateCaseIssues(next.map(issue => ({ id: issue.id, title: issue.title, originalHolding: issue.originalHolding, appealArgument: issue.appealArgument, relatedEvidenceCodes: issue.relatedEvidences, legalBasis: issue.legalBasis, legalStrength: issue.legalStrength })));
  };

  const handlePrint = () => {
    window.print();
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
      const res = await fetch('/api/toolbox/verify-citations', {
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
    <div className="w-full flex flex-col md:flex-row h-full overflow-hidden bg-karoshi-bg">
      {/* 左側編輯區 */}
      <div className="w-full md:w-1/2 lg:w-5/12 p-6 overflow-y-auto border-r border-karoshi-border bg-white shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#2C7873] flex items-center gap-2">
            <span>📊 爭點整理表格小工具</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">產生司法院標準【爭點整理對照表】（7欄標準格式），釐清原審認定與我方攻擊防禦，方便法官審理。</p>
        </div>

        {/* 0. 案件基本資料 */}
        <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
          <div className="font-bold text-sm text-amber-950 border-b pb-1.5 border-amber-300">
            0. 案件基本資料（ Karoshibox 標頭設定 ）
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">附件文字</label>
            <input 
              type="text" 
              value={attachmentText} 
              onChange={e => setAttachmentText(e.target.value)}
              className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-bold"
              placeholder="附表一"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="col-span-2">
              <label className="block font-bold text-gray-700 mb-1">法院名稱</label>
              <input 
                type="text" 
                value={courtName} 
                onChange={e => setCourtName(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                placeholder="臺灣高等法院"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">年度</label>
              <input 
                type="text" 
                value={year} 
                onChange={e => setYear(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white text-center font-mono"
                placeholder="112"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">字別</label>
              <input 
                type="text" 
                value={word} 
                onChange={e => setWord(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white text-center"
                placeholder="重上"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">案號</label>
              <input 
                type="text" 
                value={caseNo} 
                onChange={e => setCaseNo(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-mono"
                placeholder="123"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">具狀/提出人</label>
              <input 
                type="text" 
                value={submitter} 
                onChange={e => setSubmitter(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                placeholder="上訴人 王小明"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">上訴人/原告</label>
              <input 
                type="text" 
                value={appellantName} 
                onChange={e => setAppellantName(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                placeholder="王小明"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">被上訴人/被告</label>
              <input 
                type="text" 
                value={appelleeName} 
                onChange={e => setAppelleeName(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                placeholder="陳大華"
              />
            </div>
          </div>
        </div>

        {/* 1. 爭點列表編輯 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-gray-200">
            <label className="font-bold text-sm text-gray-800">1. 爭點對照資料</label>
            <span className="text-3xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">共 {issues.length} 爭點</span>
          </div>

          <div className="space-y-4">
            {issues.map((issue, idx) => (
              <div key={issue.id} className="p-3.5 bg-amber-50/30 rounded-xl border border-amber-200 relative space-y-3 shadow-2xs">
                <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-amber-950">項次 {idx + 1}</span>
                  </div>

                  <button 
                    onClick={() => removeIssue(issue.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-3xs border border-red-200 px-2 py-0.5 rounded bg-red-50"
                  >
                    ✖ 刪除
                  </button>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">爭點名稱與主題</label>
                  <input 
                    type="text" 
                    value={issue.title} 
                    onChange={e => updateIssue(issue.id, 'title', e.target.value)}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-bold"
                    placeholder="例：爭點一：消費借貸契約之成立與舉證責任"
                  />
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">原審判決/原決定認定內容與理由</label>
                  <textarea 
                    value={issue.originalHolding} 
                    onChange={e => updateIssue(issue.id, 'originalHolding', e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white text-gray-800"
                    placeholder="說明原審如何認定與其判決理由..."
                  />
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">我方上訴/覆審攻擊與指摘理由</label>
                  <textarea 
                    value={issue.appealArgument} 
                    onChange={e => updateIssue(issue.id, 'appealArgument', e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-medium text-blue-950"
                    placeholder="說明我方指摘原審之違誤與經驗法則/論理法則瑕疵..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-3xs font-bold text-gray-700 mb-0.5">對應證據編號</label>
                    <input 
                      type="text" 
                      value={issue.relatedEvidences} 
                      onChange={e => updateIssue(issue.id, 'relatedEvidences', e.target.value)}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-mono"
                      placeholder="例：1, 上證一"
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-gray-700 mb-0.5">爭點定位提示</label>
                    <select
                      value={issue.legalStrength === 'NEED_SUPPLEMENT' ? 'NEED_SUPPLEMENT' : 'HIGH'}
                      onChange={e => updateIssue(issue.id, 'legalStrength', e.target.value)}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-bold"
                    >
                      <option value="HIGH">🎯 重點攻擊 (具充足理由/實務見解)</option>
                      <option value="NEED_SUPPLEMENT">⚠️ 需補充證據 (建議聲請調查/補提物證)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">引用法條與實務見解/判例</label>
                  <input 
                    type="text" 
                    value={issue.legalBasis} 
                    onChange={e => updateIssue(issue.id, 'legalBasis', e.target.value)}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                    placeholder="例：民訴§277、最高法院109年台上字第1820號判決"
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={addIssue}
            className="w-full py-2 border-2 border-dashed border-amber-600 text-amber-800 font-bold text-xs rounded-xl hover:bg-amber-50 transition-all flex justify-center items-center gap-1 mt-3"
          >
            ⊕ 新增爭點對照列
          </button>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleFullVerify}
              disabled={isVerifyingAi}
              className="w-1/2 bg-emerald-800 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all flex justify-center items-center gap-1.5"
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
              className="w-1/2 bg-[#2C7873] text-white py-3 rounded-xl font-bold text-xs shadow-md hover:opacity-90 transition-all flex justify-center items-center gap-1.5"
            >
              📥 下載/列印 PDF
            </button>
          </div>
        </div>
      </div>

      {/* 右側：A4 列印模擬預覽區 */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-8 overflow-y-auto bg-gray-200/80 flex flex-col items-center">
        {verifyNotice && (
          <div className="w-full max-w-[210mm] mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn shadow-xs">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {verifyNotice}
            </span>
            <button 
              onClick={() => setVerifyNotice(null)} 
              className="text-emerald-700 hover:text-emerald-900 text-xs ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="w-full max-w-[210mm] mb-3">
          <AntiGhostBadge verification={verification} />
        </div>

        <div className="bg-white p-10 rounded shadow-lg w-full max-w-[210mm] min-h-[297mm] text-black text-xs leading-relaxed border border-gray-300 font-serif space-y-4">
          <div className="text-left font-bold text-sm text-black">
            {attachmentText || '附表一'}
          </div>

          <div className="border-2 border-black p-3 text-center font-bold text-base text-black tracking-wider bg-gray-50/30">
            {courtName || '臺灣高等法院'}{year || '112'}年度{word || '重上'}字第{caseNo || '123'}號爭點整理對照表
          </div>

          <div className="grid grid-cols-2 border border-black p-2 font-bold text-xs bg-gray-50/20">
            <div>具狀人：{submitter || `上訴人 ${appellantName}`}</div>
            <div className="text-right">當事人：{appellantName} vs {appelleeName}</div>
          </div>

          {/* 7 欄位標準對照表 */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 text-black font-bold">
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
                  <td className="border border-black p-2 whitespace-pre-wrap align-top text-gray-800">{issue.originalHolding}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top font-medium text-black">{issue.appealArgument}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold align-top">{issue.relatedEvidences}</td>
                  <td className="border border-black p-2 align-top text-gray-800">{issue.legalBasis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

