import { useState } from 'react';

interface EvidenceRowItem {
  id: string;
  code: string;               // 編號 (如：1)
  relatedIssue: string;       // 所涉爭點
  investigationItem: string;  // 調查事項 (如：訊問證人)
  investigationTarget: string;// 調查對象 (姓名或單位)
  targetAddress: string;      // 對象地址及聯絡方式
  provenFact: string;         // 待證事實(限50字)
}

export default function EvidenceListGenerator() {
  // 0. 案件基本資料
  const todayObj = new Date();
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const [attachmentText, setAttachmentText] = useState('附件');
  const [courtName, setCourtName] = useState('臺灣高等法院');
  const [year, setYear] = useState('112');
  const [word, setWord] = useState('重上');
  const [caseNo, setCaseNo] = useState('123');
  const [submitter, setSubmitter] = useState('例如：上訴人 王小明');
  const [submitDate, setSubmitDate] = useState(todayRoc);

  // 1. 調查證據列表
  const [items, setItems] = useState<EvidenceRowItem[]>([
    {
      id: '1',
      code: '1',
      relatedIssue: '',
      investigationItem: '',
      investigationTarget: '',
      targetAddress: '',
      provenFact: ''
    }
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        code: String(items.length + 1),
        relatedIssue: '',
        investigationItem: '',
        investigationTarget: '',
        targetAddress: '',
        provenFact: ''
      }
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof EvidenceRowItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col md:flex-row h-full overflow-hidden bg-karoshi-bg">
      {/* 左側編輯區 */}
      <div className="w-full md:w-1/2 lg:w-5/12 p-6 overflow-y-auto border-r border-karoshi-border bg-white shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#2C7873] flex items-center gap-2">
            <span>🛠 調查證據聲請表小工具</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">產生符合司法院及 Karoshibox 標準格式之【調查證據聲請表】，支援即時編輯與列印 PDF。</p>
        </div>

        {/* 0. 案件基本資料 */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="font-bold text-sm text-gray-800 border-b pb-1.5 border-gray-300">
            0. 案件基本資料
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">附件文字</label>
            <input 
              type="text" 
              value={attachmentText} 
              onChange={e => setAttachmentText(e.target.value)}
              className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-bold"
              placeholder="附件"
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

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">案號</label>
            <input 
              type="text" 
              value={caseNo} 
              onChange={e => setCaseNo(e.target.value)}
              className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white font-mono"
              placeholder="123"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">提出人（簽章）</label>
            <textarea 
              value={submitter} 
              onChange={e => setSubmitter(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
              placeholder="例如：上訴人 王小明"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">提出日期</label>
            <textarea 
              value={submitDate} 
              onChange={e => setSubmitDate(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
              placeholder="例如：112年12月25日"
            />
          </div>
        </div>

        {/* 1. 調查證據列表 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-gray-200">
            <label className="font-bold text-sm text-gray-800">1. 調查證據列表</label>
            <span className="text-3xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">共 {items.length} 列</span>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-300 relative space-y-3 shadow-2xs">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="font-bold text-xs text-gray-800">編號 {idx + 1}</span>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-3xs border border-red-200 px-2 py-0.5 rounded bg-red-50"
                  >
                    ✖ 刪除
                  </button>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">所涉爭點</label>
                  <textarea 
                    value={item.relatedIssue} 
                    onChange={e => updateItem(item.id, 'relatedIssue', e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                    placeholder="例如：爭點一：消費借貸契約之成立與舉證責任"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-3xs font-bold text-gray-700 mb-0.5">調查事項</label>
                    <textarea 
                      value={item.investigationItem} 
                      onChange={e => updateItem(item.id, 'investigationItem', e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                      placeholder="例如：訊問證人"
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-gray-700 mb-0.5">調查對象</label>
                    <textarea 
                      value={item.investigationTarget} 
                      onChange={e => updateItem(item.id, 'investigationTarget', e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                      placeholder="姓名或單位"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-700 mb-0.5">對象地址及聯絡方式</label>
                  <textarea 
                    value={item.targetAddress} 
                    onChange={e => updateItem(item.id, 'targetAddress', e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white"
                    placeholder="地址及電話或卷頁"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-3xs font-bold text-gray-700">待證事實 (限50字)</label>
                    <span className={`text-3xs font-mono font-bold ${(item.provenFact || '').length > 50 ? 'text-red-600' : 'text-gray-400'}`}>
                      限制 : {(item.provenFact || '').length}/50字
                    </span>
                  </div>
                  <textarea 
                    value={item.provenFact} 
                    onChange={e => updateItem(item.id, 'provenFact', e.target.value)}
                    rows={5}
                    maxLength={100}
                    className={`w-full border rounded p-1.5 text-xs bg-white ${(item.provenFact || '').length > 50 ? 'border-red-400 bg-red-50/50' : 'border-gray-300'}`}
                    placeholder="限50字內說明待證事實"
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={addItem}
            className="w-full py-2 border-2 border-dashed border-[#2C7873] text-[#2C7873] font-bold text-xs rounded-xl hover:bg-emerald-50 transition-all flex justify-center items-center gap-1 mt-3"
          >
            ⊕ 增加一列
          </button>

          <button 
            onClick={handlePrint}
            className="w-full bg-[#185A56] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#124542] transition-all flex justify-center items-center gap-2 mt-4"
          >
            📥 下載 PDF
          </button>
        </div>
      </div>

      {/* 右側：A4 列印模擬預覽區 */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-8 overflow-y-auto bg-gray-200/80 flex justify-center items-start">
        <div className="bg-white p-10 rounded shadow-lg w-full max-w-[210mm] min-h-[297mm] text-black text-xs leading-relaxed border border-gray-300 font-serif space-y-4">
          {/* 左上角附件標籤 */}
          <div className="text-left font-bold text-sm text-black">
            {attachmentText || '附件'}
          </div>

          {/* 標題框 */}
          <div className="border-2 border-black p-3 text-center font-bold text-base text-black tracking-wider bg-gray-50/30">
            {courtName || '臺灣高等法院'}{year || '112'}年度{word || '重上'}字第{caseNo || '123'}號調查證據聲請表
          </div>

          {/* 提出人與日期列 */}
          <div className="grid grid-cols-2 border border-black p-2 font-bold text-xs bg-gray-50/20">
            <div>提出人（簽章）：{submitter || ''}</div>
            <div className="text-right">提出日期：{submitDate || ''}</div>
          </div>

          {/* 表格 6 欄位 */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 text-black font-bold">
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
                  <td className="border border-black p-2 whitespace-pre-wrap align-top text-gray-800">{item.targetAddress}</td>
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

