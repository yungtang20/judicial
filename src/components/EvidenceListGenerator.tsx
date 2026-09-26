import { useEffect, useState } from 'react';
import type { CaseContext } from '../domain/case/types';
import { evidenceRowsFromCase, evidenceRowsToCase, type EvidenceEditorRow } from '../lib/caseRowAdapters';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';
import { AttachmentHeaderFields, type AttachmentHeaderValues } from './appeal/AttachmentHeaderFields';
import { EvidenceEditorList } from './appeal/EvidenceEditorList';

interface EvidenceSeedConsumption {
  issueSummary: string;
  consumedAt: string;
}

type EvidenceSeedCaseContext = CaseContext & {
  evidenceSeedConsumption?: EvidenceSeedConsumption;
};

function consumeEvidenceSeed(issueSummary: string, seededItems?: EvidenceEditorRow[]) {
  useCaseStore.setState(state => {
    const current = getActiveCase(state) as EvidenceSeedCaseContext;
    if (current.evidenceSeedConsumption?.issueSummary === issueSummary) return state;
    const consumedAt = new Date().toISOString();
    const next: EvidenceSeedCaseContext = {
      ...current,
      evidences: seededItems ? evidenceRowsToCase(seededItems) : current.evidences,
      evidenceSeedConsumption: { issueSummary, consumedAt },
      updatedAt: consumedAt
    };
    return {
      cases: {
        ...state.cases,
        [state.activeCaseId]: next
      }
    };
  });
}


interface EvidenceListGeneratorProps {
  initialIssueSummary?: string;
}

function evidenceSeedItems(issueSeed: string): EvidenceEditorRow[] {
  return [{
    id: '1',
    code: '1',
    relatedIssue: issueSeed,
    investigationItem: '',
    investigationTarget: '',
    targetAddress: '',
    provenFact: ''
  }];
}

export default function EvidenceListGenerator({ initialIssueSummary }: EvidenceListGeneratorProps = {}) {
  const issueSeed = initialIssueSummary?.trim() || '';
  const activeCase = useCaseStore(state => getActiveCase(state) as EvidenceSeedCaseContext);
  const updateCaseEvidences = useCaseStore(s => s.updateEvidences);
  const todayObj = new Date();
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const [attachmentText, setAttachmentText] = useState('附件');
  const [courtName, setCourtName] = useState('');
  const [year, setYear] = useState('');
  const [word, setWord] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [submitDate, setSubmitDate] = useState(todayRoc);

  const [items, setItems] = useState<EvidenceEditorRow[]>(() => (
    activeCase.evidences?.length ? evidenceRowsFromCase(activeCase.evidences) : []
  ));
  useEffect(() => {
    if (!issueSeed) return;
    if (activeCase.evidenceSeedConsumption?.issueSummary === issueSeed) return;
    if (activeCase.evidences?.length) {
      consumeEvidenceSeed(issueSeed);
      return;
    }
    const seededItems = evidenceSeedItems(issueSeed);
    consumeEvidenceSeed(issueSeed, seededItems);
    setItems(seededItems);
  }, [issueSeed, activeCase.evidences, activeCase.evidenceSeedConsumption]);

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

  return (
    <div className="w-full flex flex-col md:flex-row h-full overflow-hidden bg-[var(--color-surface-base)]">
      {/* 左側編輯區 */}
      <div className="w-full md:w-1/2 lg:w-5/12 p-6 overflow-y-auto border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-primary)] flex items-center gap-2">
            <span>調查證據聲請表小工具</span>
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">產生符合司法院及 Karoshibox 標準格式之【調查證據聲請表】，支援即時編輯與列印 PDF。</p>
        </div>

        {/* 0. 案件基本資料 */}
        <AttachmentHeaderFields
          values={{ attachmentText, courtName, year, word, caseNo, submitter, submitDate }}
          onChange={updateHeaderField}
        />

        <div className="space-y-3">
          <EvidenceEditorList
            evidences={items}
            onChange={next => {
              setItems(next);
              updateCaseEvidences(evidenceRowsToCase(next));
            }}
          />
          <button
            onClick={handlePrint}
            className="w-full bg-[var(--color-brand-primary)] text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex justify-center items-center gap-2 mt-4"
          >
            下載 PDF
          </button>
        </div>
      </div>

      {/* 右側：A4 列印模擬預覽區 */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-8 overflow-y-auto bg-[var(--color-border-strong)]/80 flex justify-center items-start">
        <div className="bg-[var(--color-surface-overlay)] p-10 rounded-xl w-full max-w-[210mm] min-h-[297mm] text-black text-xs leading-relaxed border border-[var(--color-border-strong)] font-serif space-y-4">
          {/* 左上角附件標籤 */}
          <div className="text-left font-bold text-sm text-black">
            {attachmentText || '附件'}
          </div>

          {/* 標題框 */}
          <div className="border-2 border-black p-3 text-center font-bold text-base text-black tracking-wider bg-[var(--color-surface-raised)]/30">
            {courtName}{year}年度{word}字第{caseNo}號調查證據聲請表
          </div>

          {/* 提出人與日期列 */}
          <div className="grid grid-cols-2 border border-black p-2 font-bold text-xs bg-[var(--color-surface-raised)]/20">
            <div>提出人（簽章）：{submitter || ''}</div>
            <div className="text-right">提出日期：{submitDate || ''}</div>
          </div>

          {/* 表格 6 欄位 */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-[var(--color-surface-overlay)] text-black font-bold">
                <th className="border border-black p-2 w-[8%] text-center">編號</th>
                <th className="border border-black p-2 w-[22%] text-center">所涉爭點</th>
                <th className="border border-black p-2 w-[18%] text-center">調查事項</th>
                <th className="border border-black p-2 w-[18%] text-center">調查對象</th>
                <th className="border border-black p-2 w-[18%] text-center">對象地址及聯絡方式</th>
                <th className="border border-black p-2 w-[16%] text-center">待證事實(限50字)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-black p-2 text-center font-bold font-mono align-middle">{item.code || idx + 1}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top">{item.relatedIssue}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top font-medium">{item.investigationItem}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top font-bold">{item.investigationTarget}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top text-[var(--color-text-primary)]">{item.targetAddress}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap align-top">{item.provenFact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

