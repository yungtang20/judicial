import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.mjs`;
  } catch (err) {
    console.warn('pdfjs GlobalWorkerOptions setup exception:', err);
  }
}

interface JudgmentData {
  id: string;
  date: string;
  title: string;
  full: string;
  year: string;
  caseNo: string;
  caseType: string;
}

export default function JudgmentSearchTool() {
  const [allData, setAllData] = useState<JudgmentData[]>([]);
  const [searchResults, setSearchResults] = useState<JudgmentData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('等待匯入...');
  const [progress, setProgress] = useState<number | null>(null);
  
  const [renderLimit, setRenderLimit] = useState(20);
  const BATCH_SIZE = 20;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse PDF file
  const parsePdfFile = async (file: File): Promise<JudgmentData | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // Try extracting title / case number
      const caseNoMatch = fullText.match(/\d+年度[\u4e00-\u9fa5]+字第\d+號/);
      const titleMatch = fullText.match(/(臺灣[\u4e00-\u9fa5]+地方法院[\u4e00-\u9fa5]+判決|最高法院[\u4e00-\u9fa5]+判決|[\u4e00-\u9fa5]+法院[\u4e00-\u9fa5]+判決)/);
      const dateMatch = fullText.match(/中華民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);

      const id = caseNoMatch ? caseNoMatch[0] : file.name.replace(/\.[^/.]+$/, "");
      const title = titleMatch ? titleMatch[0] : id;
      const date = dateMatch ? `民國 ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : '';

      return {
        id,
        date,
        title,
        full: fullText,
        year: dateMatch ? dateMatch[1] : '',
        caseNo: caseNoMatch ? caseNoMatch[0] : '',
        caseType: ''
      };
    } catch (e) {
      console.error('PDF parsing error for', file.name, e);
      return null;
    }
  };

  // Parse TXT file
  const parseTxtFile = async (file: File): Promise<JudgmentData | null> => {
    try {
      const fullText = await file.text();
      const caseNoMatch = fullText.match(/\d+年度[\u4e00-\u9fa5]+字第\d+號/);
      const dateMatch = fullText.match(/中華民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
      const id = caseNoMatch ? caseNoMatch[0] : file.name.replace(/\.[^/.]+$/, "");

      return {
        id,
        date: dateMatch ? `民國 ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : '',
        title: id,
        full: fullText,
        year: dateMatch ? dateMatch[1] : '',
        caseNo: id,
        caseType: ''
      };
    } catch {
      return null;
    }
  };

  // Parse JSON file
  const parseJsonFile = async (file: File): Promise<JudgmentData[]> => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        return json.map((item: any) => ({
          id: item.JID || item.id || '',
          date: item.JDATE || item.date || '',
          title: item.JTITLE || item.title || '',
          full: item.JFULL || item.full || '',
          year: item.JYEAR || item.year || '',
          caseNo: item.JNO || item.caseNo || '',
          caseType: item.JCASE || item.caseType || ''
        }));
      } else {
        return [{
          id: json.JID || json.id || '',
          date: json.JDATE || json.date || '',
          title: json.JTITLE || json.title || '',
          full: json.JFULL || json.full || '',
          year: json.JYEAR || json.year || '',
          caseNo: json.JNO || json.caseNo || '',
          caseType: json.JCASE || json.caseType || ''
        }];
      }
    } catch {
      return [];
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatusMessage('載入中...');
    setProgress(0);
    let loadedData: JudgmentData[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const filenameLower = file.name.toLowerCase();

      if (filenameLower.endsWith('.json')) {
        const parsed = await parseJsonFile(file);
        loadedData = loadedData.concat(parsed);
      } else if (filenameLower.endsWith('.pdf')) {
        const parsed = await parsePdfFile(file);
        if (parsed) loadedData.push(parsed);
      } else if (filenameLower.endsWith('.txt')) {
        const parsed = await parseTxtFile(file);
        if (parsed) loadedData.push(parsed);
      }

      const percent = Math.round(((i + 1) / totalFiles) * 100);
      setProgress(percent);
      setStatusMessage(`讀取檔案中... (${i + 1}/${totalFiles})`);
      await new Promise(r => setTimeout(r, 0));
    }

    setAllData(loadedData);
    setProgress(null);
    setStatusMessage(`已載入 ${loadedData.length} 筆判決資料`);
    setSearchResults([]);
    setRenderLimit(BATCH_SIZE);
  };

  const buildQueryFunction = (qStr: string) => {
    let q = qStr
      .replace(/＋/g, '+')
      .replace(/＊/g, '*')
      .replace(/｛/g, '{')
      .replace(/｝/g, '}');
    q = q.replace(/and/gi, '+'); 
    q = q.replace(/\s+\-/g, ' && !');
    
    if (q.trim().startsWith('-')) {
      q = ' !' + q.trim().substring(1);
    }
    
    q = q.replace(/([\+\*\{\}\!])/g, ' $1 ');
    const tokens = q.split(/\s+/).filter(t => t.length > 0);
    
    let jsExpr = "";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === '+') {
        jsExpr += ' && '; 
      } else if (t === '*') {
        jsExpr += ' || '; 
      } else if (t === '{') {
        jsExpr += ' ( '; 
      } else if (t === '}') {
        jsExpr += ' ) '; 
      } else if (t === '!') {
        jsExpr += ' ! '; 
      } else if (t === '&&' || t === '||') {
         jsExpr += t;
      } else {
        const cleanTerm = t.replace(/'/g, "\\'");
        jsExpr += `check(doc, '${cleanTerm}')`;
      }
    }
    // eslint-disable-next-line no-new-func
    return new Function("doc", "check", `return (${jsExpr});`);
  };

  const check = (doc: JudgmentData, term: string) => {
    const fullText = (doc.id + " " + doc.date + " " + doc.title + " " + (doc.full || "")).toLowerCase();
    return fullText.includes(term.toLowerCase());
  };

  const startSearch = async () => {
    if (!query.trim() || allData.length === 0) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setRenderLimit(BATCH_SIZE);
    setStatusMessage("搜尋中...");

    try {
      const matchFunc = buildQueryFunction(query);
      const results: JudgmentData[] = [];
      const SEARCH_CHUNK = 2000;
      
      for (let i = 0; i < allData.length; i += SEARCH_CHUNK) {
        if (!isSearching && i > 0) break;
        const chunk = allData.slice(i, i + SEARCH_CHUNK);
        const matches = chunk.filter(doc => matchFunc(doc, check));
        results.push(...matches);
        setStatusMessage(`搜尋中... (已掃描 ${i + chunk.length} / ${allData.length} 筆，命中 ${results.length} 筆)`);
        await new Promise(r => setTimeout(r, 0));
      }
      
      setSearchResults(results);
      setStatusMessage(`搜尋完成：共找到 ${results.length} 筆`);
    } catch (e) {
      alert("語法錯誤，請檢查括號或運算符號");
      console.error(e);
      setStatusMessage(`已載入 ${allData.length} 筆資料 (語法錯誤)`);
    } finally {
      setIsSearching(false);
    }
  };

  const stopSearch = () => {
    setIsSearching(false);
  };

  const deleteItem = (indexToRemove: number) => {
    const newResults = searchResults.filter((_, idx) => idx !== indexToRemove);
    setSearchResults(newResults);
    setStatusMessage(`搜尋完成：共找到 ${newResults.length} 筆`);
  };

  const getDownloadFilename = (extension: string) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    let safeQuery = query
      .replace(/\+/g, 'and')
      .replace(/and/gi, 'and') 
      .replace(/\*/g, 'or')
      .replace(/\s+\-/g, '_not_') 
      .replace(/[\{\}]/g, '') 
      .replace(/[\/\\:*?"<>|]/g, '_') 
      .replace(/\s+/g, '_'); 
    
    const namePart = safeQuery ? `${dateStr}${safeQuery}` : `${dateStr}_result`;
    return `${namePart}.${extension}`;
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadTXT = () => {
    const sep = "\n" + "=".repeat(60) + "\n";
    let content = "搜尋結果\n\n";
    searchResults.forEach(item => {
      content += `案號：${item.id}\n日期：${item.date}\n案由：${item.title}\n`;
      content += sep + (item.full || '') + "\n" + sep + "\n";
    });
    triggerDownload(content, getDownloadFilename('txt'), "text/plain;charset=utf-8");
  };

  const downloadJSON = () => {
    const content = JSON.stringify(searchResults, null, 2);
    triggerDownload(content, getDownloadFilename('json'), "application/json");
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 md:p-8 overflow-y-auto">
      <div className="bg-white p-6 md:p-10 rounded-lg border border-karoshi-border shadow-xs">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-karoshi-text border-b-2 border-karoshi-accent pb-4 mb-8">
          🚀 自行匯入判決檢索小工具
        </h1>

        {/* 1. 資料來源 */}
        <div className="pb-6 mb-6 border-b border-karoshi-border">
          <h3 className="text-lg font-bold text-karoshi-text-light border-b border-dashed border-karoshi-border pb-2 mb-4">
            1. 資料來源
          </h3>

          <input 
            type="file" 
            id="folderInput"
            ref={fileInputRef}
            multiple 
            accept=".json,.pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-karoshi-border bg-karoshi-bg p-8 text-center rounded-lg cursor-pointer hover:border-karoshi-accent hover:bg-white transition-all text-karoshi-text-light"
          >
            <div className="text-4xl mb-2">📂</div>
            <div className="font-medium text-base">點擊選取資料夾 / 檔案 (支援 JSON / PDF / TXT)</div>
            <div className="text-xs text-gray-500 mt-1">可批次選擇或拖曳司法官網下載的 PDF 或 Open Data JSON 檔案</div>
          </div>

          {progress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-4 mt-4 overflow-hidden">
              <div 
                className="bg-[#569E78] h-full text-xs text-white text-center leading-4 transition-all duration-200"
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          )}

          <div className="text-sm text-karoshi-text-light mt-3">{statusMessage}</div>
        </div>

        {/* 2. 搜尋設定 */}
        <div className="pb-6 mb-6 border-b border-karoshi-border">
          <h3 className="text-lg font-bold text-karoshi-text-light border-b border-dashed border-karoshi-border pb-2 mb-4">
            2. 搜尋設定
          </h3>

          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="輸入關鍵字 (例如:車禍+與有過失)"
              disabled={allData.length === 0}
              onKeyDown={e => e.key === 'Enter' && startSearch()}
              className="flex-1 border border-karoshi-border rounded px-3 py-2 text-karoshi-text focus:outline-none focus:border-karoshi-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {!isSearching ? (
              <button 
                onClick={startSearch}
                disabled={allData.length === 0}
                className="bg-karoshi-text text-white px-6 py-2 rounded font-medium hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                🔍 搜尋
              </button>
            ) : (
              <button 
                onClick={stopSearch}
                className="bg-[#C85A5A] text-white px-6 py-2 rounded font-medium hover:opacity-90 transition-all"
              >
                ⏹ 停止
              </button>
            )}
          </div>

          <div className="bg-karoshi-bg p-4 rounded text-sm text-karoshi-text-light leading-relaxed">
            <div className="font-bold mb-1 text-karoshi-text">語法說明：</div>
            <div><b>And</b>：用「+」或「and」(如: 損害賠償+車禍)</div>
            <div><b>Or</b>：用「*」(如: 繼承*遺囑)</div>
            <div><b>Not</b>：用「 -」(空白加減號) (如: 離婚 -未成年子女)</div>
            <div><b>優先</b>：用「{}」(如: &#123;A+B&#125;*&#123;C+D&#125;)</div>
          </div>
        </div>

        {/* 3. 結果列表 */}
        <div>
          <h3 className="text-lg font-bold text-karoshi-text-light border-b border-dashed border-karoshi-border pb-2 mb-4">
            3. 結果列表
          </h3>

          <div className="flex justify-between items-center mb-4 flex-wrap gap-2 text-sm font-bold text-karoshi-text-light">
            <span>{searchResults.length > 0 ? `搜尋完成：共找到 ${searchResults.length} 筆` : '尚未搜尋'}</span>
            {searchResults.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={downloadTXT} 
                  className="bg-[#569E78] text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-all"
                >
                  📥 下載 TXT
                </button>
                <button 
                  onClick={downloadJSON} 
                  className="bg-karoshi-text-light text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-all"
                >
                  📥 下載 JSON
                </button>
              </div>
            )}
          </div>

          <ul className="border border-karoshi-border rounded max-h-[600px] overflow-y-auto divide-y divide-karoshi-border">
            {searchResults.length === 0 ? (
              <li className="p-8 text-center text-gray-500">
                {allData.length === 0 ? '請先匯入判決檔案 (JSON / PDF / TXT)' : '輸入關鍵字並點擊搜尋'}
              </li>
            ) : (
              searchResults.slice(0, renderLimit).map((item, index) => (
                <li key={index} className="p-5 hover:bg-karoshi-bg transition-colors relative">
                  <button 
                    onClick={() => deleteItem(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:bg-[#C85A5A] hover:text-white border border-gray-200 rounded w-6 h-6 flex items-center justify-center text-xs transition-colors"
                    title="移除此筆"
                  >
                    ✖
                  </button>
                  <div className="flex justify-between pr-10 text-xs text-karoshi-text-light mb-1">
                    <span className="text-karoshi-accent font-bold text-sm">{item.id}</span>
                    <span>{item.date}</span>
                  </div>
                  <div className="font-bold text-karoshi-text mb-1 text-base">
                    {item.title}
                  </div>
                  <div className="text-gray-600 text-xs truncate">
                    {(item.full || "").substring(0, 80).replace(/\s+/g, ' ')}...
                  </div>
                </li>
              ))
            )}
          </ul>

          {renderLimit < searchResults.length && (
            <button 
              onClick={() => setRenderLimit(prev => Math.min(prev + BATCH_SIZE, searchResults.length))}
              className="w-full mt-4 py-3 bg-karoshi-text-light text-white font-medium rounded hover:bg-karoshi-text transition-colors"
            >
              顯示更多結果 ({renderLimit} / {searchResults.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
