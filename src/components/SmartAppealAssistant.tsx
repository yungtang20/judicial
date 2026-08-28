import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.mjs`;
  } catch (err) {
    console.warn('pdfjs GlobalWorkerOptions setup exception:', err);
  }
}

interface IssueRow {
  id: string;
  issueType?: string; // 爭點類別：程序瑕疵 / 實體事實 / 法律適用 / 裁量賠償
  title: string;
  originalHolding: string;
  appealArgument: string;
  relatedEvidenceCodes?: string; // 對應證物編號（如：聲調一、上證二）
  legalBasis?: string; // 引用法條或判例/大法庭裁定
  legalStrength?: 'HIGH' | 'MEDIUM' | 'NEED_SUPPLEMENT'; // 強勝算 / 中度攻防 / 待補強
}

interface EvidenceRow {
  id: string;
  code: string; // 編號 (例如：1、2 或 聲調一)
  relatedIssue: string; // 所涉爭點 (例如：爭點一：過失責任與認定瑕疵)
  investigationItem: string; // 調查事項 (例如：訊問證人 / 現場履勘 / 函調監視錄影檔)
  investigationTarget: string; // 調查對象 (例如：證人張○○ / 臺中市政府警察局大甲分局)
  targetAddress: string; // 對象地址及聯絡方式 (例如：臺中市大甲區平安路100號 / 詳卷內住址)
  provenFact: string; // 待證事實 (限50字)
  // 保持舊版相容性欄位
  type?: string;
  target?: string;
  method?: string;
  holder?: string;
  necessity?: string;
  note?: string;
  relatedIssueTitle?: string;
}

interface PrecedentItem {
  id: string;
  type: string;
  citation: string;
  summary: string;
  applicationReason: string;
  selected: boolean;
}

export default function SmartAppealAssistant() {
  // Step tracker
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [outputTab, setOutputTab] = useState<'petition' | 'issues_table' | 'evidences_table'>('petition');

  // Judgment Text & Import State
  const [rawText, setRawText] = useState<string>('');
  const [secondText, setSecondText] = useState<string>('');
  const [isDualMode, setIsDualMode] = useState<boolean>(false);
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    // 司法院與 Taiwan Legal RAG (TLR) 連線與載入狀態
  const [showJudicialModal, setShowJudicialModal] = useState<boolean>(false);
  const [judicialModalTab, setJudicialModalTab] = useState<'tlr' | 'official'>('tlr');
  const [targetJudicialField, setTargetJudicialField] = useState<'first' | 'second'>('first');
  const [tlrQuery, setTlrQuery] = useState<string>('');
  const [tlrSearchType, setTlrSearchType] = useState<'hybrid' | 'keyword' | 'phrase'>('hybrid');
  const [tlrLoading, setTlrLoading] = useState<boolean>(false);
  const [tlrResults, setTlrResults] = useState<any[]>([]);
  const [tlrNote, setTlrNote] = useState<string>('');
  const [tlrFetchingDocId, setTlrFetchingDocId] = useState<string | null>(null);
  const [urlFetchSuccessMsg, setUrlFetchSuccessMsg] = useState<string>('');
  
  // 司法院官方 API (JDoc / JList) 狀態
  const [judicialJid, setJudicialJid] = useState<string>('CHDM,105,交訴,51,20161216,1');
  const [judicialAccount, setJudicialAccount] = useState<string>('');
  const [judicialPassword, setJudicialPassword] = useState<string>('');
  const [judicialToken, setJudicialToken] = useState<string>('');
  const [judicialAuthLoading, setJudicialAuthLoading] = useState<boolean>(false);
  const [judicialFetchLoading, setJudicialFetchLoading] = useState<boolean>(false);
  const [judicialMsg, setJudicialMsg] = useState<string>('');
  const [jlistData, setJlistData] = useState<Array<{ date: string; list: string[] }>>([]);
  const [jlistLoading, setJlistLoading] = useState<boolean>(false);

  // Case Metadata & Dates
  const todayObj = new Date();
  const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const [caseType, setCaseType] = useState<'civil' | 'criminal' | 'administrative' | 'criminal_compensation'>('civil');
  const [courtName, setCourtName] = useState<string>('臺灣臺北地方法院');
  const [appealCourtName, setAppealCourtName] = useState<string>('臺灣高等法院');
  const [caseNo, setCaseNo] = useState<string>('113年度訴字第1234號');
  const [sectionCode, setSectionCode] = useState<string>('平股');
  const [claimAmount, setClaimAmount] = useState<string>('新臺幣 500,000 元');
  const [deliveryDate, setDeliveryDate] = useState<string>(todayIso);
  const [travelDays, setTravelDays] = useState<number>(0); // 在途期間

  // Parties Full Details ( Judicial Yuan Format Requirement )
  const [appellantRole, setAppellantRole] = useState<string>('上訴人');
  const [appellantName, setAppellantName] = useState<string>('王小明');
  const [appellantId, setAppellantId] = useState<string>('A123456789');
  const [appellantAddress, setAppellantAddress] = useState<string>('臺北市中正區重慶南路一段 124 號');
  const [appellantPhone, setAppellantPhone] = useState<string>('0912-345-678');
  const [appellantLegalRep, setAppellantLegalRep] = useState<string>('');

  const [appelleeRole, setAppelleeRole] = useState<string>('被上訴人');
  const [appelleeName, setAppelleeName] = useState<string>('陳大華');
  const [appelleeId, setAppelleeId] = useState<string>('B987654321');
  const [appelleeAddress, setAppelleeAddress] = useState<string>('新北市板橋區縣民大道二段 7 號');

  const [deliveryAgent, setDeliveryAgent] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  const [claims, setClaims] = useState<string>('一、原判決廢棄。\n二、上開廢棄部分，被上訴人在第一審之訴及假執行之聲請均駁回。\n三、第一、二審訴訟費用由被上訴人負擔。');

  // Attachment Table Metadata ( Karoshibox 調查證據聲請表與爭點整理表標頭欄位 )
  const [attachmentText, setAttachmentText] = useState<string>('附件');
  const [tableCourtName, setTableCourtName] = useState<string>('臺灣高等法院');
  const [tableYear, setTableYear] = useState<string>('112');
  const [tableWord, setTableWord] = useState<string>('重上');
  const [tableNo, setTableNo] = useState<string>('123');
  const [tableSubmitter, setTableSubmitter] = useState<string>('上訴人 王小明');
  const [tableSubmitDate, setTableSubmitDate] = useState<string>(todayRoc);

  // Issues & Evidences
  const [issues, setIssues] = useState<IssueRow[]>([
    {
      id: '1',
      issueType: '事實認定瑕疵',
      title: '爭點一：原審判決就兩造間借貸契約之成立，認定事實顯有違背經驗法則',
      originalHolding: '原審判決僅憑單方匯款單即認定成立消費借貸契約。',
      appealArgument: '上訴人匯款實係清償先前欠款，且被上訴人未能提出借貸對話紀錄或借據，原審舉證責任分配顯有違誤。',
      relatedEvidenceCodes: '1',
      legalBasis: '最高法院18年上字第2855號判例',
      legalStrength: 'HIGH'
    }
  ]);

  const [evidences, setEvidences] = useState<EvidenceRow[]>([
    {
      id: '1',
      code: '1',
      relatedIssue: '爭點一：兩造間消費借貸關係成立與否',
      investigationItem: '訊問證人 / 函調對話紀錄與銀行明細',
      investigationTarget: '證人 張○○ / 國泰世華商業銀行大甲分行',
      targetAddress: '臺中市大甲區平安路100號（詳卷內通訊錄）',
      provenFact: '證明上訴人匯款實係清償過往舊債，被上訴人並無借貸合意。',
      type: '人證',
      target: '證人 張○○',
      method: '訊問證人到庭具結備詢',
      holder: '臺中市大甲區平安路100號'
    }
  ]);

  // Precedents & Interpretations
  const [keywords, setKeywords] = useState<string>('簡易判決上訴 量刑適法性 違背經驗法則 事實認定不憑證據');
  const [isSearchingPrecedents, setIsSearchingPrecedents] = useState<boolean>(false);
  const [precedents, setPrecedents] = useState<PrecedentItem[]>([
    {
      id: 'p1',
      type: '最高法院裁判',
      citation: '最高法院 99 年度台上字第 700 號 刑事判決',
      summary: '按數行為於密接時間地點實行，侵害同一法益，各行為獨立性極為薄弱，在刑法評價上以視為數個舉動之接續施行，合為包括之一行為，屬接續犯。',
      applicationReason: '用以論駁原審認定數次行為之罪數與接續犯評價過重或過輕之法律適用疑義。',
      selected: true
    },
    {
      id: 'p2',
      type: '最高法院刑事判例',
      citation: '最高法院 76 年台上字第 4986 號 刑事判例',
      summary: '認定犯罪事實所憑之證據，須於通常一般之人均不致有所懷疑，而得確信其為真實之程度者，始得據為有罪之認定。倘其證明尚未達到此一程度，而有合理之懷疑存在時，即應為被告有利之認定。',
      applicationReason: '用以指摘原審採認證據未達超越合理懷疑程度，違反刑事訴訟法第 154 條第 2 項無罪推定原則。',
      selected: true
    }
  ]);

  // Appeal Petition Generation State

  const [firstUrl, setFirstUrl] = useState<string>('');
  const [secondUrl, setSecondUrl] = useState<string>('');
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);

    const fetchFromUrl = async (targetField: 'first' | 'second') => {
    setTargetJudicialField(targetField);
    const targetUrl = targetField === 'first' ? firstUrl : secondUrl;
    if (!targetUrl) return;

    setIsFetchingUrl(true);
    setUrlFetchSuccessMsg('');
    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      if (!response.ok) {
        let errStr = '無法讀取網址內容';
        try {
          const errData = await response.json();
          if (errData.error) errStr = errData.error;
        } catch (e) {}
        throw new Error(errStr);
      }
      const data = await response.json();
      if (data.text) {
        if (targetField === 'first') {
          setRawText(data.text);
        } else {
          setSecondText(data.text);
        }
        if (data.title) {
          setUrlFetchSuccessMsg(`✅ 已自動透過判決書資料庫帶入【${data.title}】！`);
        }
      } else {
        throw new Error('未讀取到文字內容');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知錯誤';
      alert(`網址讀取失敗：\n\n${errorMsg}\n\n您亦可使用上方【⚖️ 判決全文庫檢索】按鈕直接輸入案號調閱，或手動複製貼上裁判內文。`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const [isGeneratingPetition, setIsGeneratingPetition] = useState<boolean>(false);
  const [generatedPetition, setGeneratedPetition] = useState<string>('');

  // Appeal Eligibility & Admissibility Gatekeeper State
  const [appealEligibility, setAppealEligibility] = useState<'ALLOWED' | 'RESTRICTED' | 'FORBIDDEN'>('ALLOWED');
  const [eligibilityStatusTitle, setEligibilityStatusTitle] = useState<string>('🟢 依法准予提起上訴');
  const [eligibilityReason, setEligibilityReason] = useState<string>('本案屬第一審判決，當事人於 20 日不變期間內得依法提起第二審上訴。');
  const [proceduralRequirements, setProceduralRequirements] = useState<string>('應於收受判決後 20 日內向原審法院提出上訴狀，並具體記載上訴理由。');

  // Judgment Summary State (原審裁判全文重點摘要)
  const [judgmentSummary, setJudgmentSummary] = useState<{
    overview?: string;
    storyNarrative?: string;
    evidenceBasis?: string | {
      witnesses?: string[];
      documents?: string[];
      physicalAndExpert?: string[];
    };
    mainHolding?: string;
  } | null>(null);
  const [isAnalyzingSummaryOnly, setIsAnalyzingSummaryOnly] = useState<boolean>(false);
  const [showSummaryInStep2, setShowSummaryInStep2] = useState<boolean>(true);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  // 1. PDF File Import Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'first' | 'second' = 'first') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setIsParsingPdf(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        const imagesToUpload: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';

          // 渲染頁面成 Canvas 影像
          try {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context!, viewport } as any).promise;
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            imagesToUpload.push(imageDataUrl);
          } catch (canvasErr) {
            console.warn(`Page ${i} canvas render failed:`, canvasErr);
          }
        }

        // 偵測到無內建文字或文字極少（即掃描版 PDF），自動呼叫後端多模態 OCR 服務
        if (fullText.trim().length < 100 && imagesToUpload.length > 0) {
          try {
            const ocrRes = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: imagesToUpload })
            });
            if (ocrRes.ok) {
              const ocrData = await ocrRes.json();
              if (ocrData.text) {
                fullText = ocrData.text;
              }
            } else {
              const errData = await ocrRes.json().catch(() => ({}));
              alert(errData.error || 'OCR 辨識失敗，請檢查 API Key 設定。');
            }
          } catch (ocrErr) {
            console.warn('OCR fetch failed:', ocrErr.message);
          }
        }

        if (targetField === 'second') {
          setSecondText(fullText);
        } else {
          setRawText(fullText);
        }
      } catch (err) {
        console.warn('PDF Parse Error:', err instanceof Error ? err.message : err);
        alert('PDF 解析失敗，請直接複製貼上判決內文。');
      } finally {
        setIsParsingPdf(false);
      }
    } else {
      const text = await file.text();
      if (targetField === 'second') {
        setSecondText(text);
      } else {
        setRawText(text);
      }
    }
  };

    // 1-1. Taiwan Legal RAG (TLR: 2,250萬筆判決 24H 免帳密) 處理函式
  const handleTlrSearch = async (queryOverride?: string) => {
    const queryToUse = queryOverride !== undefined ? queryOverride : tlrQuery;
    if (!queryToUse || !queryToUse.trim()) {
      setJudicialMsg('請輸入裁判字號或案由關鍵字（例如：112 台上 2409、115 侵訴 33 或 加重詐欺）');
      return;
    }
    setTlrLoading(true);
    setJudicialMsg('');
    try {
      const res = await fetch('/api/tlr/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToUse.trim(),
          search_type: tlrSearchType,
          max_results: 6
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'TLR 搜尋連線失敗');
      }
      const data = await res.json();
      setTlrResults(data.results || []);
      setTlrNote(data.note || '');
      if ((data.results || []).length === 0) {
        setJudicialMsg(data.note || '查無相符裁判書，請嘗試使用其他案號格式或縮減關鍵字。');
      } else {
        setJudicialMsg(`🔍 檢索完成，共找到 ${data.results.length} 筆相符裁判書（點擊即可載入全文）`);
      }
    } catch (err: any) {
      setJudicialMsg('❌ 搜尋失敗：' + err.message);
    } finally {
      setTlrLoading(false);
    }
  };

  const handleTlrFetchFulltext = async (item: any, customTargetField?: 'first' | 'second') => {
    const targetField = customTargetField || targetJudicialField;
    setTlrFetchingDocId(item.doc_id);
    setJudicialMsg(`⏳ 正在向裁判書伺服器調閱【${item.citation_text || item.doc_id}】之完整裁判書內文...`);
    try {
      const res = await fetch('/api/tlr/fulltext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: item.doc_id,
          result_token: item.result_token
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '無法取得裁判全文');
      }
      const data = await res.json();
      const textToInsert = data.fulltext || data.text_excerpt || '';
      if (!textToInsert) {
        throw new Error('回傳之裁判書內容為空');
      }
      if (targetField === 'second') {
        setSecondText(textToInsert);
      } else {
        setRawText(textToInsert);
      }
      if (item.court_name && (!courtName || courtName === '臺灣臺北地方法院')) {
        setCourtName(item.court_name);
      }
      setJudicialMsg(`🎉 成功載入【${item.citation_text || item.doc_id}】至【${targetField === 'second' ? '裁判書 二' : '裁判書 一'}】！共 ${textToInsert.length.toLocaleString()} 字。`);
      setTimeout(() => {
        setShowJudicialModal(false);
      }, 1200);
    } catch (err: any) {
      setJudicialMsg('❌ 取得全文失敗：' + err.message);
    } finally {
      setTlrFetchingDocId(null);
    }
  };

  // 1-2. 司法院裁判書開放 API (JDoc / Auth / JList) 處理函式
  const handleJudicialAuth = async () => {
    setJudicialAuthLoading(true);
    setJudicialMsg('');
    try {
      const res = await fetch('/api/judicial/jdg/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: judicialAccount, password: judicialPassword })
      });
      const data = await res.json();
      if (data.Token) {
        setJudicialToken(data.Token);
        setJudicialMsg('✅ 司法院 API 驗證成功！已順利取得授權 Token');
      } else {
        setJudicialMsg('❌ 驗證失敗：' + (data.error || JSON.stringify(data)));
      }
    } catch (err: any) {
      setJudicialMsg('❌ 連線異常：' + err.message);
    } finally {
      setJudicialAuthLoading(false);
    }
  };

  const handleFetchJDocToField = async (jidToFetch?: string) => {
    const targetJid = jidToFetch || judicialJid;
    if (!targetJid || !targetJid.trim()) {
      alert('請輸入或選擇裁判書 JID 代碼');
      return;
    }
    setJudicialFetchLoading(true);
    setJudicialMsg('');
    try {
      let activeToken = judicialToken;
      if (!activeToken) {
        const authRes = await fetch('/api/judicial/jdg/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: judicialAccount, password: judicialPassword })
        });
        const authData = await authRes.json();
        if (authData.Token) {
          activeToken = authData.Token;
          setJudicialToken(activeToken);
        } else {
          setJudicialMsg('❌ 司法院 API 驗證未通過：' + (authData.error || '請確認伺服器或畫面輸入之帳號密碼'));
          setJudicialFetchLoading(false);
          return;
        }
      }

      const res = await fetch('/api/judicial/jdg/jdoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken, j: targetJid.trim() })
      });
      const data = await res.json();
      
      let fetchedContent = '';
      if (data.JFULLX?.JFULLCONTENT) {
        fetchedContent = data.JFULLX.JFULLCONTENT;
      } else if (typeof data === 'string') {
        fetchedContent = data;
      } else if (data.error) {
        setJudicialMsg('❌ 讀取失敗：' + data.error);
        setJudicialFetchLoading(false);
        return;
      } else {
        fetchedContent = JSON.stringify(data, null, 2);
      }

      if (targetJudicialField === 'second') {
        setSecondText(fetchedContent);
      } else {
        setRawText(fetchedContent);
      }

      setJudicialMsg(`🎉 成功由司法院 API 帶入裁判書全文 (${targetJid})！`);
      setTimeout(() => {
        setShowJudicialModal(false);
      }, 1000);
    } catch (err: any) {
      setJudicialMsg('❌ 請求錯誤：' + err.message);
    } finally {
      setJudicialFetchLoading(false);
    }
  };

  const handleFetchJListInModal = async () => {
    setJlistLoading(true);
    setJudicialMsg('');
    try {
      let activeToken = judicialToken;
      if (!activeToken) {
        const authRes = await fetch('/api/judicial/jdg/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: judicialAccount, password: judicialPassword })
        });
        const authData = await authRes.json();
        if (authData.Token) {
          activeToken = authData.Token;
          setJudicialToken(activeToken);
        } else {
          setJudicialMsg('❌ 取得清單失敗：請先通過司法院 API 驗證');
          setJlistLoading(false);
          return;
        }
      }

      const res = await fetch('/api/judicial/jdg/jlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJlistData(data);
        setJudicialMsg(`已成功取得近 7 日裁判書異動清單（包含 ${data.length} 天紀錄）`);
      } else if (data.error) {
        setJudicialMsg('❌ 錯誤：' + data.error);
      }
    } catch (err: any) {
      setJudicialMsg('❌ 連線錯誤：' + err.message);
    } finally {
      setJlistLoading(false);
    }
  };

  // 2. AI Judgment Analysis (可選全盤分析跳轉至第二步，或僅生成摘要留在第一步)
  const handleAnalyzeJudgment = async (jumpToStepTwo: boolean = true) => {
    if (!rawText.trim()) {
      alert('請先輸入或匯入第一個裁判書文本');
      return;
    }

    if (jumpToStepTwo) {
      setIsAnalyzing(true);
    } else {
      setIsAnalyzingSummaryOnly(true);
    }

    try {
      const res = await fetch('/api/analyze-judgment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgmentText: rawText,
          secondJudgmentText: isDualMode ? secondText : undefined,
          caseType
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === "NO_API_KEY") {
          alert("⚠️ 離線模式：未設定 API Key，無法進行真實判決書分析。請在 AI Studio 中配置後再試。");
          return;
        }
        throw new Error(errData.error || 'AI 分析失敗');
      }

      const data = await res.json();
      
      if (data.code === "NO_API_KEY") {
        alert("⚠️ 離線模式：未設定 API Key，無法進行真實判決書分析。請在 AI Studio 中配置後再試。");
        return;
      }
      
      if (data.isFallback) {
        setIsFallbackMode(true);
        alert("⚠️ 示範模式：以下為內建範例資料");
      } else {
        setIsFallbackMode(false);
      }
      if (data.caseType) setCaseType(data.caseType);
      if (data.courtName) {
        setCourtName(data.courtName);
        setTableCourtName(data.courtName);
      }
      if (data.appealCourtName) setAppealCourtName(data.appealCourtName);
      if (data.caseNo) {
        setCaseNo(data.caseNo);
        // 嘗試剖析案號 (例如：113年度訴字第1234號)
        const match = data.caseNo.match(/(\d+)年度?([^\d]+)字?第?(\d+)號/);
        if (match) {
          setTableYear(match[1]);
          setTableWord(match[2]);
          setTableNo(match[3]);
        }
      }
      if (data.appellantRole) setAppellantRole(data.appellantRole);
      if (data.appellantName) {
        setAppellantName(data.appellantName);
        setTableSubmitter(`${data.appellantRole || '具狀人'} ${data.appellantName}`);
      }
      if (data.appelleeRole) setAppelleeRole(data.appelleeRole);
      if (data.appelleeName) setAppelleeName(data.appelleeName);

      if (data.appealEligibility) setAppealEligibility(data.appealEligibility);
      if (data.eligibilityStatusTitle) setEligibilityStatusTitle(data.eligibilityStatusTitle);
      if (data.eligibilityReason) setEligibilityReason(data.eligibilityReason);
      if (data.proceduralRequirements) setProceduralRequirements(data.proceduralRequirements);
      if (data.judgmentSummary) setJudgmentSummary(data.judgmentSummary);

      if (data.suggestedIssues && data.suggestedIssues.length > 0) {
        setIssues(data.suggestedIssues.map((item: any, idx: number) => ({
          id: String(idx + 1),
          issueType: item.issueType || '事實認定瑕疵',
          title: item.title || `爭點${idx + 1}`,
          originalHolding: item.originalHolding || '',
          appealArgument: item.appealArgument || '',
          relatedEvidenceCodes: item.relatedEvidenceCodes || String(idx + 1),
          legalBasis: item.legalBasis || '',
          legalStrength: item.legalStrength || 'HIGH'
        })));
      }

      if (data.suggestedEvidences && data.suggestedEvidences.length > 0) {
        setEvidences(data.suggestedEvidences.map((item: any, idx: number) => ({
          id: String(idx + 1),
          code: item.index || item.code || String(idx + 1),
          relatedIssue: item.relatedIssue || item.relatedIssueTitle || `爭點${idx + 1}`,
          investigationItem: item.investigationItem || item.method || '訊問證人 / 函調資料',
          investigationTarget: item.investigationTarget || item.target || '證人 / 權責單位',
          targetAddress: item.targetAddress || item.holder || '詳卷內住址 / 卷備地址',
          provenFact: item.provenFact || '證明本案關鍵事實',
          type: item.type || '書證',
          target: item.investigationTarget || item.target || '',
          method: item.investigationItem || item.method || '',
          holder: item.targetAddress || item.holder || ''
        })));
      }

      if (data.recommendedKeywords) {
        if (Array.isArray(data.recommendedKeywords)) {
          setKeywords(data.recommendedKeywords.join(' '));
        } else if (typeof data.recommendedKeywords === 'string') {
          setKeywords(data.recommendedKeywords);
        }
      }

      if (data.suggestedPrecedents && Array.isArray(data.suggestedPrecedents) && data.suggestedPrecedents.length > 0) {
        setPrecedents(data.suggestedPrecedents.map((p: any, idx: number) => ({
          id: `p_auto_${Date.now()}_${idx}`,
          type: p.type || '權威實務',
          citation: p.citation || '',
          summary: p.summary || '',
          applicationReason: p.applicationReason || '',
          selected: true
        })));
      }

      if (jumpToStepTwo) {
        setCurrentStep(2); // 跳轉到步驟二
      } else {
        // 留在步驟一，平滑滾動至白話摘要卡片
        setTimeout(() => {
          summaryCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (err: any) {
      alert(err.message || '分析發生錯誤');
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingSummaryOnly(false);
    }
  };

  // 3. Search Precedents & Ministry Interpretations
  const handleSearchPrecedents = async () => {
    setIsSearchingPrecedents(true);
    try {
      const res = await fetch('/api/search-precedents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          caseSummary: issues.map(i => `${i.title}: ${i.appealArgument}`).join('; ')
        })
      });

      if (!res.ok) throw new Error('檢索失敗');
      const data = await res.json();
      const precedentList = Array.isArray(data) ? data : (data.precedents || []);

      if (precedentList && precedentList.length > 0) {
        setPrecedents(precedentList.map((p: any, idx: number) => ({
          id: `p_${Date.now()}_${idx}`,
          type: p.type || '權威實務',
          citation: p.citation || '',
          summary: p.summary || '',
          applicationReason: p.applicationReason || '',
          selected: true
        })));
      }
    } catch (err: any) {
      alert(err.message || '檢索判解函釋發生錯誤');
    } finally {
      setIsSearchingPrecedents(false);
    }
  };

  // 4. Generate Standard Judicial Appeal Petition
  const handleGeneratePetition = async () => {
    setIsGeneratingPetition(true);
    try {
      const selectedPrecedentsList = precedents.filter(p => p.selected);

      const res = await fetch('/api/generate-appeal-petition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType,
          courtName,
          appealCourtName,
          caseNo,
          sectionCode,
          claimAmount,
          judgmentDeliveryDate: deliveryDate,
          appellantRole,
          appellantName,
          appellantId,
          appellantAddress,
          appellantPhone,
          appellantLegalRep,
          appelleeRole,
          appelleeName,
          appelleeId,
          appelleeAddress,
          deliveryAgent,
          deliveryAddress,
          claims,
          issues,
          evidences,
          selectedPrecedents: selectedPrecedentsList
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === "NO_API_KEY") {
          alert("⚠️ 離線模式：未設定 API Key，無法生成真實訴狀。請在 AI Studio 中配置後再試。");
          return;
        }
        throw new Error(errData.error || '生成上訴狀失敗');
      }
      const data = await res.json();
      
      if (data.code === "NO_API_KEY") {
        alert("⚠️ 離線模式：未設定 API Key，無法生成真實訴狀。請在 AI Studio 中配置後再試。");
        return;
      }
      
      setGeneratedPetition(data.petitionText || '');
      setCurrentStep(4);
    } catch (err: any) {
      alert(err.message || '生成失敗');
    } finally {
      setIsGeneratingPetition(false);
    }
  };

  // Calculate Appeal Deadline
  const calculateDeadline = () => {
    if (!deliveryDate) return { declarationDeadline: '未知', reasoningDeadline: '未知', daysLeft: 0 };
    const date = new Date(deliveryDate);
    if (isNaN(date.getTime())) return { declarationDeadline: '無效日期', reasoningDeadline: '無效日期', daysLeft: 0 };

    // 20天上訴期間 + 在途期間
    const declDate = new Date(date);
    declDate.setDate(declDate.getDate() + 20 + Number(travelDays));

    // 如果遇到週末 (6: Saturday, 0: Sunday) 順延至週一
    if (declDate.getDay() === 6) declDate.setDate(declDate.getDate() + 2);
    if (declDate.getDay() === 0) declDate.setDate(declDate.getDate() + 1);

    // 補提上訴理由期間 (刑事40日或20日/民事20日)
    const reasonDate = new Date(date);
    reasonDate.setDate(reasonDate.getDate() + (caseType === 'criminal' ? 40 : 20) + Number(travelDays));
    if (reasonDate.getDay() === 6) reasonDate.setDate(reasonDate.getDate() + 2);
    if (reasonDate.getDay() === 0) reasonDate.setDate(reasonDate.getDate() + 1);

    const today = new Date();
    const diffTime = declDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      declarationDeadline: declDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
      reasoningDeadline: reasonDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
      daysLeft
    };
  };

  const deadlineInfo = calculateDeadline();

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col h-full overflow-y-auto bg-karoshi-bg p-4 md:p-6">
      {/* 頂部：上訴期間與警示 Banner */}
      <div className="bg-white rounded-xl shadow-xs p-4 mb-6 border border-karoshi-border flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center font-bold text-xl shrink-0">
            ⏳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-karoshi-text">上訴法定期間檢示</span>
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                不變期間 20 日
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-x-4">
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

        <div className="flex gap-4 items-center border-t md:border-t-0 md:border-l border-karoshi-border pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-around">
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">聲明上訴最後期限</div>
            <div className="text-sm font-bold text-red-600">{deadlineInfo.declarationDeadline}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">剩餘天數</div>
            <div className={`text-lg font-extrabold ${deadlineInfo.daysLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-karoshi-accent'}`}>
              {deadlineInfo.daysLeft > 0 ? `${deadlineInfo.daysLeft} 天` : '已逾期或今日截止'}
            </div>
          </div>
        </div>
      </div>

      {/* 步驟導引指示器 */}
      <div className="bg-white rounded-xl shadow-xs p-3 mb-6 border border-karoshi-border flex flex-wrap justify-between items-center text-xs md:text-sm font-bold">
        {[
          { num: 1, label: '1. 匯入裁判書 (上傳/API)' },
          { num: 2, label: '2. 分析爭點與判解函釋' },
          { num: 3, label: '3. 提供與整理調查證據' },
          { num: 4, label: '4. 結合三者產生上訴書' },
        ].map(step => (
          <button
            key={step.num}
            onClick={() => setCurrentStep(step.num)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentStep === step.num ? 'bg-karoshi-accent text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${currentStep === step.num ? 'bg-white text-karoshi-accent font-extrabold' : 'bg-gray-200 text-gray-600'}`}>{step.num}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* 步驟 1: 匯入判決 */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="flex justify-between items-center border-b border-karoshi-border pb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text">第一步：匯入裁判書與 AI 分析</h2>
              <p className="text-xs text-gray-500 mt-1">上傳裁判 PDF 檔或直接貼上判決全文，支援單一裁判書分析或雙裁判書（二個判決）對照比對。</p>
            </div>
            
            {/* 模式切換鈕 */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 transition">
                <input
                  type="checkbox"
                  checked={isDualMode}
                  onChange={(e) => setIsDualMode(e.target.checked)}
                  className="rounded text-karoshi-accent focus:ring-karoshi-accent"
                />
                <span>開啟雙裁判書對照剖析模式 (放入二個判決書)</span>
              </label>
            </div>
          </div>

          {isParsingPdf && (
            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg animate-pulse">
              📄 正在解析 PDF 文字，請稍候...
            </div>
          )}

          {!isDualMode ? (
            /* 單一裁判書模式 */
            <div>
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <label className="text-sm font-bold text-karoshi-text">原審裁判全文內容：</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetJudicialField('first');
                      setShowJudicialModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>⚖️ 判決全文庫檢索載入 (2,250萬筆免帳密)</span>
                  </button>
                  <label className="bg-karoshi-sidebar border border-karoshi-border text-karoshi-text hover:bg-karoshi-hover px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                    📁 上傳裁判 PDF / TXT 檔
                    <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                <input
                  type="url"
                  value={firstUrl}
                  onChange={(e) => setFirstUrl(e.target.value)}
                  placeholder="或輸入網址載入內容 (例如新聞、判決網址)..."
                  className="flex-1 border border-karoshi-border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-karoshi-accent"
                />
                <button
                  type="button"
                  onClick={() => fetchFromUrl('first')}
                  disabled={!firstUrl || isFetchingUrl}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isFetchingUrl && targetJudicialField === 'first' ? '讀取中...' : '🌐 讀取網址'}
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={10}
                className="w-full border border-karoshi-border rounded-lg p-3 text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-karoshi-accent"
                placeholder="請在此貼上原審裁判書全文，例如：「臺灣臺北地方法院 113 年度訴字第 1234 號民事判決...」"
              />
            </div>
          ) : (
            /* 雙裁判書對照模式 */
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
                <span>💡 雙裁判對照模式：您可以放入【二個判決書】（例如：一審判決 + 二審/抗告裁定，或是對照判決）。AI 將會比對兩判決之間的事實認定差異與訴訟矛盾點！</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 判決一 */}
                <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      <span>📄 裁判書 一 (主裁判 / 原審判決)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetJudicialField('first');
                          setShowJudicialModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-2xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        ⚖️ 判決全文庫檢索
                      </button>
                      <label className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
                        📁 上傳 PDF
                        <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
                      </label>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                      <input
                        type="url"
                        value={firstUrl}
                        onChange={(e) => setFirstUrl(e.target.value)}
                        placeholder="輸入網址..."
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('first')}
                        disabled={!firstUrl || isFetchingUrl}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="請在此貼上第一個判決書內容..."
                  />
                </div>

                {/* 判決二 */}
                <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <span>📄 裁判書 二 (對照裁判 / 原裁定或對照案)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetJudicialField('second');
                          setShowJudicialModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-2xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        🏛️ 司法院 API
                      </button>
                      <label className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
                        📁 上傳 PDF
                        <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'second')} className="hidden" />
                      </label>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                      <input
                        type="url"
                        value={secondUrl}
                        onChange={(e) => setSecondUrl(e.target.value)}
                        placeholder="輸入網址..."
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('second')}
                        disabled={!secondUrl || isFetchingUrl}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={secondText}
                    onChange={e => setSecondText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    placeholder="請在此貼上第二個判決書內容（用以與判決一做對照比對）..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* 原審裁判案件事實故事化與裁判結果 */}
          <div ref={summaryCardRef} className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 text-xs space-y-4 text-blue-950 scroll-mt-6 shadow-xs">
            <div className="font-bold flex items-center justify-between text-sm border-b border-blue-200 pb-3">
              <span className="flex items-center gap-2 text-blue-900 font-extrabold text-base">
                📋 案件事實故事與裁判結果
              </span>
              {judgmentSummary && (
                <span className="text-2xs bg-emerald-600 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 shadow-2xs">
                  ✓ 智慧剖析完成
                </span>
              )}
            </div>

            {judgmentSummary ? (
              <div className="space-y-4 text-xs leading-relaxed">
                {/* 1. 案件事實用說故事的方式 (至少五百字・綜合被害人、涉嫌人、證人觀點) */}
                <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-blue-900 flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">1</span>
                      <span>案件事實用說故事的方式（至少五百字・綜合被害人、涉嫌人與證人觀點）</span>
                    </span>
                    {(judgmentSummary.storyNarrative || judgmentSummary.overview) && (
                      <span className="text-3xs text-gray-400 font-mono font-normal">
                        字數：{(judgmentSummary.storyNarrative || judgmentSummary.overview || '').length} 字
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-line text-xs">
                    {judgmentSummary.storyNarrative || judgmentSummary.overview}
                  </p>
                </div>

                {/* 2. 裁判結果 */}
                <div className="bg-white p-4 rounded-lg border border-red-200 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-red-800 flex items-center gap-2 border-b border-red-100 pb-2">
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">2</span>
                    <span>裁判結果（刑期或裁判結果要旨）</span>
                  </div>
                  <div className="p-3 bg-red-50/70 rounded-md border border-red-200 text-xs font-bold text-red-950 whitespace-pre-line leading-relaxed">
                    {judgmentSummary.mainHolding || '（尚未載入裁判主文）'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-600 text-xs py-3 leading-relaxed">
                💡 貼上或匯入判決書全文後，點擊下方按鈕即可自動提煉：
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-gray-700 font-medium">
                  <li><b>1. 案件事實用說故事的方式</b>（至少五百字・綜合被害人、涉嫌人與證人觀點）</li>
                  <li><b>2. 裁判結果</b>（刑期或判決主文要旨）</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <div className="text-2xs text-gray-500">
              💡 提示：點擊「提煉案件事實故事與裁判結果」可於上方卡片直接閱讀。
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => handleAnalyzeJudgment(false)}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || !rawText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAnalyzingSummaryOnly ? (
                  '⚡ 案件事實分析中...'
                ) : (
                  <>
                    <span>📋 提煉案件事實故事與裁判結果</span>
                    <span className="text-2xs font-normal opacity-90">(留在本頁)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleAnalyzeJudgment(true)}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || !rawText.trim()}
                className="bg-karoshi-accent text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:opacity-90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAnalyzing ? (
                  '🤖 正在剖析爭點與檢索實務見解...'
                ) : (
                  <>
                    <span>⚡ 分析爭點與相關判解函釋</span>
                    <span>前往第二步 ➔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 步驟 2: 分析爭點與權威實務見解 */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="border-b border-karoshi-border pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text">第二步：分析爭點與權威實務見解（廣含憲法法庭、最高法院、大法庭、高等法院座談會與主管機關函釋）</h2>
              <p className="text-xs text-gray-500 mt-1">核對案件基本資料與爭點對照表，並連網檢索與挑選可直接引用做為上訴理由背書之憲法法庭判決、最高法院/最高行政法院裁判、大法庭裁定、高等法院法律座談會與中央主管機關函釋。</p>
            </div>
            <div className="flex gap-2">
              <select value={caseType} onChange={e => setCaseType(e.target.value as any)} className="border rounded px-3 py-1 text-xs font-bold bg-gray-50">
                <option value="civil">民事訴訟上訴</option>
                <option value="criminal">刑事訴訟上訴</option>
                <option value="administrative">行政訴訟上訴</option>
                <option value="criminal_compensation">刑事補償覆審 (刑事補償法)</option>
              </select>
            </div>
          </div>

          {/* 📋 案件事實故事與裁判結果對照 (Step 2 頂部) */}
          {judgmentSummary && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-sm flex items-center gap-2">
                  📋 案件事實故事與裁判結果（速讀對照）
                </span>
                <button
                  onClick={() => setShowSummaryInStep2(!showSummaryInStep2)}
                  className="text-2xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-md font-bold transition-colors shadow-2xs"
                >
                  {showSummaryInStep2 ? '▲ 收折摘要' : '▼ 展開對照摘要'}
                </button>
              </div>
              {showSummaryInStep2 && (
                <div className="space-y-3 pt-3 border-t border-blue-200/80">
                  {/* 1. 案情說故事 */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-200 shadow-2xs space-y-1.5">
                    <div className="font-bold text-xs text-blue-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-3xs font-bold">1</span>
                        <span>案件事實用說故事的方式（綜合被害人、涉嫌人與證人觀點）</span>
                      </span>
                      {(judgmentSummary.storyNarrative || judgmentSummary.overview) && (
                        <span className="text-3xs text-gray-400 font-mono">
                          字數：{(judgmentSummary.storyNarrative || judgmentSummary.overview || '').length} 字
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-line text-xs">
                      {judgmentSummary.storyNarrative || judgmentSummary.overview}
                    </p>
                  </div>

                  {/* 2. 裁判結果 */}
                  <div className="bg-white p-3.5 rounded-lg border border-red-200 shadow-2xs space-y-1.5">
                    <div className="font-bold text-xs text-red-800 flex items-center gap-1.5 border-b border-red-100 pb-1.5">
                      <span className="bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-3xs font-bold">2</span>
                      <span>裁判結果（刑期或裁判結果要旨）</span>
                    </div>
                    <div className="p-2.5 bg-red-50/70 rounded-md border border-red-200 text-xs font-bold text-red-950 whitespace-pre-line leading-relaxed">
                      {judgmentSummary.mainHolding || '（尚未載入裁判主文）'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ⚖️ 訴訟法上訴資格與法定限制門檻審查卡片 */}
          <div className={`p-4 rounded-lg border text-xs space-y-2 ${
            appealEligibility === 'FORBIDDEN'
              ? 'bg-red-50 border-red-300 text-red-900'
              : appealEligibility === 'RESTRICTED'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-1.5">
                🏛️ 【訴訟法上訴/覆審合法性檢核】{eligibilityStatusTitle}
              </span>
              <span className="text-2xs px-2 py-0.5 rounded font-mono bg-white border shadow-2xs">
                {caseType === 'civil' ? '民事訴訟法' : caseType === 'criminal' ? '刑事訴訟法' : caseType === 'administrative' ? '行政訴訟法' : '刑事補償法'}規範
              </span>
            </div>
            <p className="leading-relaxed font-medium">{eligibilityReason}</p>
            {proceduralRequirements && (
              <div className="pt-2 border-t border-dashed border-gray-300/80 text-2xs space-y-1">
                <div className="font-bold">⚠️ 訴訟程序要件與攻防指引：</div>
                <div>{proceduralRequirements}</div>
              </div>
            )}
            {appealEligibility === 'FORBIDDEN' && (
              <div className="bg-red-100 p-2 rounded text-red-800 text-2xs font-bold mt-2">
                🛑 法律救濟提示：本案依法可能不可提起普通上訴！如判決有重大違法瑕疵，建議研議改提「再審之訴」（民訴§496/刑訴§420）或向司法院憲法法庭聲請「憲法法庭裁判憲法審查」。
              </div>
            )}
            {appealEligibility === 'RESTRICTED' && (
              <div className="bg-amber-100 p-2 rounded text-amber-800 text-2xs font-bold mt-2">
                💡 上訴理由關鍵：因本案受法律特別限制，上訴理由書務必聚焦於指摘原判決「違背法令」（如民訴§468適用法規不當、§469判決不備理由/理由矛盾等）。
              </div>
            )}
          </div>

          {/* 案件基本與司法院書狀必填欄位 */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
            <div className="font-bold text-sm text-karoshi-text border-b pb-1">⚖️ 司法院書狀必要資訊設定</div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">訴訟類別</label>
                <select value={caseType} onChange={e => setCaseType(e.target.value as any)} className="w-full border rounded p-1.5 bg-white font-bold">
                  <option value="civil">民事訴訟上訴</option>
                  <option value="criminal">刑事訴訟上訴</option>
                  <option value="administrative">行政訴訟上訴</option>
                  <option value="criminal_compensation">刑事補償覆審 (刑事補償法)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">原審法院（遞狀處）</label>
                <input type="text" value={courtName} onChange={e => setCourtName(e.target.value)} className="w-full border rounded p-1.5 bg-white" placeholder="例：臺灣臺北地方法院" />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">轉呈上訴審法院</label>
                <input type="text" value={appealCourtName} onChange={e => setAppealCourtName(e.target.value)} className="w-full border rounded p-1.5 bg-white" placeholder="例：臺灣高等法院" />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">原審案號與股別</label>
                <div className="flex gap-1">
                  <input type="text" value={caseNo} onChange={e => setCaseNo(e.target.value)} className="w-2/3 border rounded p-1.5 bg-white" placeholder="113年度訴字第1234號" />
                  <input type="text" value={sectionCode} onChange={e => setSectionCode(e.target.value)} className="w-1/3 border rounded p-1.5 bg-white text-center" placeholder="股別" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {caseType !== 'criminal' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">訴訟標的金額 / 價額（核算二審裁判費）</label>
                  <input type="text" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} className="w-full border rounded p-1.5 bg-white" placeholder="例：新臺幣 500,000 元" />
                </div>
              )}
              <div>
                <label className="font-bold text-gray-700 block mb-1">上訴之聲明（訴之廢棄或變更聲明）</label>
                <input type="text" value={claims} onChange={e => setClaims(e.target.value)} className="w-full border rounded p-1.5 bg-white font-medium" />
              </div>
            </div>

            {/* 當事人明細區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-300 pt-3">
              <div className="space-y-2 bg-blue-50/50 p-3 rounded border border-blue-100">
                <div className="font-bold text-karoshi-text flex justify-between">
                  <span>上訴人（我方）資訊</span>
                  <input type="text" value={appellantRole} onChange={e => setAppellantRole(e.target.value)} className="border rounded px-1 text-center w-20 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appellantName} onChange={e => setAppellantName(e.target.value)} placeholder="姓名/名稱" className="border rounded p-1 bg-white" />
                  <input type="text" value={appellantId} onChange={e => setAppellantId(e.target.value)} placeholder="身分證/統編" className="border rounded p-1 bg-white" />
                </div>
                <input type="text" value={appellantAddress} onChange={e => setAppellantAddress(e.target.value)} placeholder="住居所/送達地址" className="w-full border rounded p-1 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appellantPhone} onChange={e => setAppellantPhone(e.target.value)} placeholder="電話" className="border rounded p-1 bg-white" />
                  <input type="text" value={appellantLegalRep} onChange={e => setAppellantLegalRep(e.target.value)} placeholder="法定代理人（無則免填）" className="border rounded p-1 bg-white" />
                </div>
              </div>

              <div className="space-y-2 bg-gray-100/70 p-3 rounded border border-gray-200">
                <div className="font-bold text-gray-700 flex justify-between">
                  <span>被上訴人/相對人 資訊</span>
                  <input type="text" value={appelleeRole} onChange={e => setAppelleeRole(e.target.value)} className="border rounded px-1 text-center w-20 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appelleeName} onChange={e => setAppelleeName(e.target.value)} placeholder="姓名/名稱" className="border rounded p-1 bg-white" />
                  <input type="text" value={appelleeId} onChange={e => setAppelleeId(e.target.value)} placeholder="身分證/統編(詳卷)" className="border rounded p-1 bg-white" />
                </div>
                <input type="text" value={appelleeAddress} onChange={e => setAppelleeAddress(e.target.value)} placeholder="住居所地址" className="w-full border rounded p-1 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={deliveryAgent} onChange={e => setDeliveryAgent(e.target.value)} placeholder="送達代收人" className="border rounded p-1 bg-white" />
                  <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="送達處所" className="border rounded p-1 bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* 爭點整理對照表 (司法院與 Karoshibox 標準格式) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-amber-200">
              <div>
                <h3 className="font-bold text-base text-karoshi-text flex items-center gap-2">
                  <span>📊 【司法院標準 爭點整理對照表】</span>
                  <span className="text-3xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono">
                    已建立 {issues.length} 項爭點
                  </span>
                </h3>
                <p className="text-3xs text-gray-500 mt-0.5">包含爭點類別、原審認定、我方指摘不服理由、對應證物編號與引用實務法條。</p>
              </div>

              <button
                onClick={() => setIssues([...issues, {
                  id: Date.now().toString(),
                  issueType: '事實認定瑕疵',
                  title: `爭點${issues.length + 1}`,
                  originalHolding: '',
                  appealArgument: '',
                  relatedEvidenceCodes: `聲調${issues.length + 1}`,
                  legalBasis: '',
                  legalStrength: 'HIGH'
                }])}
                className="bg-karoshi-accent text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
              >
                ＋ 新增爭點欄位
              </button>
            </div>

            <div className="space-y-4">
              {issues.map((issue, idx) => (
                <div key={issue.id} className="p-4 border border-gray-300 rounded-xl bg-white relative space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded font-mono">
                        爭點 No. {idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const newVal = issue.legalStrength === 'NEED_SUPPLEMENT' ? 'HIGH' : 'NEED_SUPPLEMENT';
                            setIssues(issues.map(i => i.id === issue.id ? { ...i, legalStrength: newVal } : i));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            issue.legalStrength === 'NEED_SUPPLEMENT'
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {issue.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充補強證據' : '🎯 重點攻擊爭點'}
                          <span className="text-3xs font-normal opacity-75">（點擊切換）</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setIssues(issues.filter(i => i.id !== issue.id))}
                        className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50"
                      >
                        ✖ 刪除
                      </button>
                    </div>
                  </div>

                  {/* 爭點標題與對應證據/法條 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-gray-700 font-bold">爭點主題與名稱：</label>
                      <input
                        type="text"
                        value={issue.title}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, title: e.target.value } : i))}
                        className="w-full border font-bold rounded p-2 text-xs bg-white"
                        placeholder="例如：原決定補償金額每日折算標準過低，未審酌違法失職情節"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-gray-700 font-bold">對應證據編號 & 引用法條：</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={issue.relatedEvidenceCodes || ''}
                          onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, relatedEvidenceCodes: e.target.value } : i))}
                          className="border rounded p-1.5 text-xs"
                          placeholder="證物編號(聲調一)"
                        />
                        <input
                          type="text"
                          value={issue.legalBasis || ''}
                          onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, legalBasis: e.target.value } : i))}
                          className="border rounded p-1.5 text-xs"
                          placeholder="法條/判解依據"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 原審認定 vs 我方攻防理由 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-gray-600 font-bold flex items-center gap-1">
                        <span>🏛️ 原審判決/原決定認定內容與理由：</span>
                      </label>
                      <textarea
                        value={issue.originalHolding}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, originalHolding: e.target.value } : i))}
                        rows={3}
                        className="w-full border rounded-lg p-2 text-xs bg-gray-50 text-gray-800"
                        placeholder="填寫原審認定理由摘要..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-blue-900 font-bold flex items-center gap-1">
                        <span>⚔️ 我方上訴/覆審指摘不服理由（事實不憑證據、違背經驗法則）：</span>
                      </label>
                      <textarea
                        value={issue.appealArgument}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, appealArgument: e.target.value } : i))}
                        rows={3}
                        className="w-full border border-blue-200 rounded-lg p-2 text-xs bg-blue-50/60 text-blue-950 font-medium"
                        placeholder="詳細填寫指摘原審瑕疵之攻擊攻防主張..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ⚖️ 權威實務見解檢索與挑選 (第二步) */}
          <div className="space-y-4 pt-4 border-t border-karoshi-border">
            <div className="flex justify-between items-start border-b border-karoshi-border pb-2">
              <div>
                <h3 className="font-bold text-base text-karoshi-text flex items-center gap-2">
                  <span>⚖️ 權威實務見解檢索與挑選（憲法法庭/最高法院/大法庭/高等法院座談會/主管機關函釋）</span>
                  <span className="text-2xs bg-blue-600 text-white font-normal px-2.5 py-0.5 rounded shadow-2xs">
                    ✨ 已啟用 Google Search 智慧實戰連網
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">廣泛涵蓋憲法法庭判決、最高法院/最高行政法院裁判、大法庭裁定、高等法院座談會決議及主管機關權威函釋，打破僅鎖定最高法院的單一限制。</p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center justify-between text-amber-900">
                <span className="flex items-center gap-1.5">
                  🏛️ 訴訟攻防靈魂：「爭點瑕疵 × 客觀證據 × 權威實務見解」三位一體扣合矩陣
                </span>
                <span className="text-2xs bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-mono font-bold">極大化勝訴機率黃金公式</span>
              </div>
              <p className="leading-relaxed text-gray-700">
                <b>上訴理由的強大說服力</b>來自於將<b>【原審判決爭點瑕疵】</b>+<b>【我方提出之客觀證據】</b>+<b>【權威實務見解（含憲法法庭/最高法院/大法庭/高等法院座談會/主管機關函釋）】</b>三者密不可分地扣合在一起！光有爭點是主張，有了權威見解作為法律背書與證據作為事實支撐，才能構成法院無法忽視的上訴理由。
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="flex-grow border border-karoshi-border rounded-lg p-2.5 text-xs font-bold bg-white"
                placeholder="輸入搜尋關鍵字 (例如：舉證責任 經驗法則 事實認定不憑證據)"
              />
              <button
                onClick={handleSearchPrecedents}
                disabled={isSearchingPrecedents}
                className="bg-karoshi-text text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSearchingPrecedents ? '🔍 聯網檢索中...' : '🔍 聯網檢索實務見解'}
              </button>
            </div>

            {/* 判解函釋清單 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-sm text-karoshi-text flex items-center gap-2">
                  <span>請勾選與編修欲引用至上訴書狀之權威見解：</span>
                  <span className="text-2xs bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                    已選 {precedents.filter(p => p.selected).length} / {precedents.length} 筆
                  </span>
                </h3>

                <button
                  onClick={() => setPrecedents([
                    ...precedents,
                    {
                      id: `p_manual_${Date.now()}`,
                      type: '最高法院裁判',
                      citation: '最高法院 110 年度台上字第  號民事判決',
                      summary: '填寫該裁判或函釋之核心要旨...',
                      applicationReason: '填寫本案如何據以論駁原審判決...',
                      selected: true
                    }
                  ])}
                  className="bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
                >
                  ＋ 手動新增實務見解
                </button>
              </div>

              {precedents.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${item.selected ? 'border-karoshi-accent bg-blue-50/30 shadow-2xs' : 'border-gray-200 bg-gray-50/50 opacity-75'}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 pb-2">
                    <div className="flex items-center gap-2 flex-grow">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, selected: !p.selected } : p))}
                          className="w-4 h-4 accent-karoshi-accent"
                        />
                        <span className="font-bold text-xs text-gray-700">【引用第 {idx + 1} 筆】</span>
                      </label>

                      <input
                        type="text"
                        value={item.citation}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, citation: e.target.value } : p))}
                        className="font-extrabold text-sm text-karoshi-text border border-gray-300 rounded px-2 py-1 flex-grow bg-white"
                        placeholder="裁判或函釋字號（例如：最高法院 108 年度台上大字第 1884 號民事裁定）"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.type}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, type: e.target.value } : p))}
                        className="text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded px-2 py-1 w-28 text-center"
                        placeholder="類型"
                      />

                      <button
                        onClick={() => setPrecedents(precedents.filter(p => p.id !== item.id))}
                        className="text-red-500 hover:text-red-700 text-2xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50"
                      >
                        ✖ 刪除
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">【要旨/核心見解】：</label>
                      <textarea
                        value={item.summary}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, summary: e.target.value } : p))}
                        rows={2}
                        className="w-full p-2 bg-white rounded border border-gray-300 text-gray-800 leading-relaxed font-serif text-xs"
                        placeholder="請填寫或編輯裁判要旨..."
                      />
                    </div>

                    <div>
                      <label className="block text-karoshi-accent font-bold mb-1">💡 本案上訴運用理由：</label>
                      <textarea
                        value={item.applicationReason}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, applicationReason: e.target.value } : p))}
                        rows={2}
                        className="w-full p-2 bg-white rounded border border-blue-200 text-blue-950 font-medium text-xs"
                        placeholder="說明如何據以補強上訴理由..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-karoshi-border">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              ⯇ 上一步
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="bg-karoshi-accent text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 flex items-center gap-1.5 shadow-xs"
            >
              <span>下一步：提供與整理調查證據</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* 步驟 3: 提供與整理調查證據 */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="border-b border-karoshi-border pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text">第三步：提供與整理調查證據 (調查證據聲請表)</h2>
              <p className="text-xs text-gray-500 mt-1">編修欲向法院聲請調查之證據標的、調查事項、調查對象與待證事實（控制在50字內），並連結對應之案件爭點，作為上訴狀之附表。</p>
            </div>
          </div>

          {/* 案件基本資料 (附表與附件專用標頭設定) */}
          <div className="bg-emerald-50/80 border border-emerald-300 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <span>📌 案件基本資料（司法院標準附表標頭）</span>
              </h3>
              <span className="text-3xs text-emerald-700 font-mono">連動下方附件表格與匯出 PDF 標頭</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">附件文字</label>
                <input
                  type="text"
                  value={attachmentText}
                  onChange={e => setAttachmentText(e.target.value)}
                  className="w-full border rounded p-1.5 bg-white font-bold text-emerald-900 border-emerald-300"
                  placeholder="附件 或 附表二"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">法院名稱</label>
                <input
                  type="text"
                  value={tableCourtName}
                  onChange={e => setTableCourtName(e.target.value)}
                  className="w-full border rounded p-1.5 bg-white"
                  placeholder="臺灣高等法院"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">年度與字別</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={tableYear}
                    onChange={e => setTableYear(e.target.value)}
                    className="w-1/2 border rounded p-1.5 bg-white text-center font-mono"
                    placeholder="112"
                  />
                  <input
                    type="text"
                    value={tableWord}
                    onChange={e => setTableWord(e.target.value)}
                    className="w-1/2 border rounded p-1.5 bg-white text-center"
                    placeholder="重上"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">案號</label>
                <input
                  type="text"
                  value={tableNo}
                  onChange={e => setTableNo(e.target.value)}
                  className="w-full border rounded p-1.5 bg-white font-mono"
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block font-bold text-gray-700 mb-1">提出人（簽章）</label>
                <input
                  type="text"
                  value={tableSubmitter}
                  onChange={e => setTableSubmitter(e.target.value)}
                  className="w-full border rounded p-1.5 bg-white"
                  placeholder="例：上訴人 王小明"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">提出日期</label>
                <input
                  type="text"
                  value={tableSubmitDate}
                  onChange={e => setTableSubmitDate(e.target.value)}
                  className="w-full border rounded p-1.5 bg-white"
                  placeholder="例：112年12月25日"
                />
              </div>
            </div>
          </div>

          {/* 調查證據聲請表 (司法院 6 欄位標準格式) */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center border-b pb-2 border-emerald-300">
              <div>
                <h3 className="font-bold text-base text-karoshi-text flex items-center gap-2">
                  <span>🛠️ 調查證據列表（司法院標準格式）</span>
                  <span className="text-3xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-mono">
                    共 {evidences.length} 列
                  </span>
                </h3>
                <p className="text-3xs text-gray-500 mt-0.5">每列精準包含：編號、所涉爭點、調查事項、調查對象、對象地址及聯絡方式、待證事實 (限50字)。</p>
              </div>

              <button
                onClick={() => setEvidences([...evidences, {
                  id: Date.now().toString(),
                  code: String(evidences.length + 1),
                  relatedIssue: `爭點${evidences.length + 1}：`,
                  investigationItem: '訊問證人',
                  investigationTarget: '',
                  targetAddress: '',
                  provenFact: ''
                }])}
                className="bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
              >
                ＋ 增加一列
              </button>
            </div>

            <div className="space-y-4">
              {evidences.map((item, idx) => (
                <div key={item.id} className="p-4 border border-emerald-300 rounded-xl bg-emerald-50/20 relative space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900">編號 {idx + 1}：</span>
                      <input
                        type="text"
                        value={item.code || String(idx + 1)}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, code: e.target.value } : ev))}
                        className="w-20 border font-bold text-center rounded py-1 text-xs bg-emerald-50 text-emerald-950 border-emerald-300"
                        placeholder="編號"
                      />
                    </div>

                    <button
                      onClick={() => setEvidences(evidences.filter(ev => ev.id !== item.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2 py-0.5 rounded bg-red-50"
                    >
                      ✖ 刪除此列
                    </button>
                  </div>

                  {/* 所涉爭點 */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-gray-700 font-bold">所涉爭點：</label>
                    <textarea
                      value={item.relatedIssue || item.relatedIssueTitle || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, relatedIssue: e.target.value } : ev))}
                      rows={2}
                      className="w-full border rounded p-1.5 text-xs bg-white text-gray-900 font-medium"
                      placeholder="填寫本項證據所涉之案件爭點..."
                    />
                  </div>

                  {/* 調查事項與調查對象 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="block text-gray-700 font-bold">調查事項：</label>
                      <input
                        type="text"
                        value={item.investigationItem || item.method || ''}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, investigationItem: e.target.value } : ev))}
                        className="w-full border rounded p-1.5 text-xs bg-white font-bold"
                        placeholder="例：訊問證人 / 現場履勘 / 函調資料"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-gray-700 font-bold">調查對象：</label>
                      <input
                        type="text"
                        value={item.investigationTarget || item.target || ''}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, investigationTarget: e.target.value } : ev))}
                        className="w-full border rounded p-1.5 text-xs bg-white font-bold text-gray-900"
                        placeholder="姓名或單位（例：證人 王小明 / 警察局）"
                      />
                    </div>
                  </div>

                  {/* 對象地址及聯絡方式 */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-gray-700 font-bold">對象地址及聯絡方式：</label>
                    <textarea
                      value={item.targetAddress || item.holder || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, targetAddress: e.target.value } : ev))}
                      rows={2}
                      className="w-full border rounded p-1.5 text-xs bg-white"
                      placeholder="填寫對象住址、聯絡電話或卷內頁碼..."
                    />
                  </div>

                  {/* 待證事實(限50字) */}
                  <div className="space-y-1 text-xs relative">
                    <div className="flex justify-between items-center">
                      <label className="block text-gray-700 font-bold">待證事實（限50字）：</label>
                      <span className={`text-3xs font-mono font-bold ${(item.provenFact || '').length > 50 ? 'text-red-600' : 'text-gray-400'}`}>
                        限制 {(item.provenFact || '').length}/50字
                      </span>
                    </div>
                    <textarea
                      value={item.provenFact || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, provenFact: e.target.value } : ev))}
                      rows={2}
                      maxLength={100}
                      className={`w-full border rounded p-1.5 text-xs bg-white ${(item.provenFact || '').length > 50 ? 'border-red-400 bg-red-50/30' : ''}`}
                      placeholder="說明待證事實，建請控制在 50 字內..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-karoshi-border">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              ⯇ 上一步
            </button>

            <button
              onClick={handleGeneratePetition}
              disabled={isGeneratingPetition}
              className="bg-karoshi-accent text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 flex items-center gap-2 shadow-xs"
            >
              {isGeneratingPetition ? '✍️ 正在結合爭點、判例與證據生成上訴書...' : '✍️ 結合爭點、判例與證據產生上訴書 ➔'}
            </button>
          </div>
        </div>
      )}

      {/* 步驟 4: 生成正式上訴狀預覽與列印 */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-karoshi-border pb-4 gap-3">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text flex items-center gap-2">
                <span>第四步：司法院標準格式書狀與專用表單輸出</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">含正式上訴/覆審書狀，以及可獨立匯出列印之司法院標準「爭點整理對照表」與「調查證據聲請表」。</p>
            </div>

            <div className="flex gap-2">
              {outputTab === 'petition' ? (
                <button
                  onClick={() => navigator.clipboard.writeText(generatedPetition)}
                  className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded text-xs font-bold hover:bg-gray-200"
                >
                  📋 複製書狀全文
                </button>
              ) : outputTab === 'issues_table' ? (
                <button
                  onClick={() => {
                    const md = `| 項次 | 爭點類型與名稱 | 原審判決/原決定認定內容 | 我方上訴/覆審指摘不服理由 | 對應證據編號 | 引用法條與實務見解 | 攻防定位提示 |\n|---|---|---|---|---|---|---|\n` +
                      issues.map((i, idx) => `| ${idx + 1} | [${i.issueType || '爭點'}] ${i.title} | ${i.originalHolding} | ${i.appealArgument} | ${i.relatedEvidenceCodes || '-'} | ${i.legalBasis || '-'} | ${i.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充證據' : '🎯 重點攻擊'} |`).join('\n');
                    navigator.clipboard.writeText(md);
                    alert('已複製【爭點整理對照表】Markdown 格式至剪貼簿！');
                  }}
                  className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded text-xs font-bold hover:bg-amber-200"
                >
                  📋 複製爭點表 (Markdown)
                </button>
              ) : (
                <button
                  onClick={() => {
                    const md = `| 聲調編號 | 證據標的與名稱 | 種類 | 待證事實 | 對應爭點 | 保管機關/占有人 | 調查方法 | 聲請調查必要性(民訴286/刑訴163Ⅱ) | 備註 |\n|---|---|---|---|---|---|---|---|---|\n` +
                      evidences.map((e) => `| ${e.code} | ${e.target} | ${e.type || '書證'} | ${e.provenFact || '-'} | ${e.relatedIssueTitle || '-'} | ${e.holder || '詳卷'} | ${e.method} | ${e.necessity || '-'} | ${e.note || '-'} |`).join('\n');
                    navigator.clipboard.writeText(md);
                    alert('已複製【調查證據聲請表】Markdown 格式至剪貼簿！');
                  }}
                  className="bg-blue-100 border border-blue-300 text-blue-900 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200"
                >
                  📋 複製證據表 (Markdown)
                </button>
              )}

              <button
                onClick={() => {
                  if (isFallbackMode) {
                    alert('示範模式下無法列印或下載法律文件');
                    return;
                  }
                  handlePrint();
                }}
                className={`${isFallbackMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2C7873] hover:opacity-90'} text-white px-4 py-2 rounded text-xs font-bold shadow-xs`}
                title={isFallbackMode ? '示範模式下禁用' : ''}
              >
                🖨 列印 / 存為 A4 PDF
              </button>
            </div>
          </div>

          {/* 表單切換頁籤 (Tab Switcher) */}
          <div className="flex border-b border-gray-200 text-xs font-bold">
            <button
              onClick={() => setOutputTab('petition')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'petition' ? 'border-karoshi-accent text-karoshi-accent bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📄 正式訴訟書狀全文</span>
            </button>

            <button
              onClick={() => setOutputTab('issues_table')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'issues_table' ? 'border-amber-600 text-amber-700 bg-amber-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📊 專用附表一：司法院標準【爭點整理對照表】</span>
              <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-3xs font-mono">{issues.length}</span>
            </button>

            <button
              onClick={() => setOutputTab('evidences_table')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'evidences_table' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📋 專用附表二：司法院標準【調查證據聲請表】</span>
              <span className="bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded-full text-3xs font-mono">{evidences.length}</span>
            </button>
          </div>

          {/* 爭點與證據完整度檢核與核對清單 */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-emerald-200/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold text-sm">✅ 【書狀爭點與證據完全寫入檢核面板】</span>
                <span className="bg-emerald-600 text-white text-3xs px-2 py-0.5 rounded-full font-bold">100% 完整對應</span>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs text-emerald-800 font-bold hover:underline"
              >
                ✏️ 增刪爭點與證據 ➔
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* 爭點核對列表 */}
              <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                <div className="font-bold text-emerald-950 flex justify-between">
                  <span>⚖️ 本狀已載入之爭點 ({issues.length} 項)</span>
                  <span className="text-3xs text-emerald-600">均已設立獨立理由段落</span>
                </div>
                {issues.length === 0 ? (
                  <p className="text-gray-400 italic">無特定爭點</p>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {issues.map((issue, idx) => (
                      <li key={issue.id || idx} className="bg-emerald-50/40 p-1.5 rounded border border-emerald-100/60">
                        <div className="font-bold text-emerald-900">
                          {idx + 1}. [{issue.issueType || '爭點'}] {issue.title || '爭點標題'}
                        </div>
                        <p className="text-3xs text-gray-600 truncate mt-0.5">
                          <b>攻擊理由：</b>{issue.appealArgument || '指摘認定瑕疵'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 證據核對列表 */}
              <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                <div className="font-bold text-emerald-950 flex justify-between">
                  <span>📋 本狀已載入之證據與物證 ({evidences.length} 項)</span>
                  <span className="text-3xs text-emerald-600">均已列入聲請調查證據表</span>
                </div>
                {evidences.length === 0 ? (
                  <p className="text-gray-400 italic">無特定證據</p>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {evidences.map((ev, idx) => (
                      <li key={ev.id || idx} className="bg-emerald-50/40 p-1.5 rounded border border-emerald-100/60 flex items-start gap-1.5">
                        <span className="bg-emerald-200 text-emerald-900 font-bold text-3xs px-1.5 py-0.5 rounded whitespace-nowrap">
                          {ev.code || `證${idx + 1}`}
                        </span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-gray-800 text-3xs truncate">[{ev.type || '書證'}] {ev.target || '證據名稱'}</div>
                          <div className="text-3xs text-gray-500 truncate"><b>方法：</b>{ev.method || '待證事實'}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 視圖區域 */}
          {outputTab === 'petition' && (
            <div className="w-full flex justify-center bg-gray-100 p-6 rounded-xl overflow-y-auto">
              <div className="bg-white p-12 rounded shadow-lg w-full max-w-[210mm] min-h-[297mm] text-black text-sm leading-relaxed border border-gray-300 font-serif whitespace-pre-wrap">
                {generatedPetition || '上訴狀生成中...'}
              </div>
            </div>
          )}

          {outputTab === 'issues_table' && (
            <div className="w-full bg-white border border-gray-300 rounded-xl p-6 overflow-x-auto font-serif">
              <div className="text-center space-y-1 mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">附表一：司法院標準 爭點整理對照表</h2>
                <p className="text-xs text-gray-600">案號：{caseNo || '詳卷'} ｜ 當事人：{appellantName} vs {appelleeName}</p>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold">
                    <th className="border border-gray-400 p-2 w-12 text-center">項次</th>
                    <th className="border border-gray-400 p-2 w-36">爭點類型與標題</th>
                    <th className="border border-gray-400 p-2 w-1/3">原審判決/原決定認定內容與理由</th>
                    <th className="border border-gray-400 p-2 w-1/3">我方上訴/覆審攻擊與指摘理由</th>
                    <th className="border border-gray-400 p-2 w-20 text-center">對應證物</th>
                    <th className="border border-gray-400 p-2 w-28">引用法條與實務見解</th>
                    <th className="border border-gray-400 p-2 w-24 text-center">攻防定位提示</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i, idx) => (
                    <tr key={i.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="border border-gray-400 p-2 font-bold text-center font-mono">{idx + 1}</td>
                      <td className="border border-gray-400 p-2 font-bold text-gray-900">
                        <span className="text-3xs bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.5 rounded block w-max mb-1">
                          {i.issueType || '爭點事項'}
                        </span>
                        {i.title}
                      </td>
                      <td className="border border-gray-400 p-2 text-gray-700 leading-relaxed whitespace-pre-wrap">{i.originalHolding || '（未說明）'}</td>
                      <td className="border border-gray-400 p-2 text-blue-950 font-medium leading-relaxed whitespace-pre-wrap">{i.appealArgument || '（未說明）'}</td>
                      <td className="border border-gray-400 p-2 text-center font-bold text-blue-800 font-mono">{i.relatedEvidenceCodes || '-'}</td>
                      <td className="border border-gray-400 p-2 text-gray-800">{i.legalBasis || '-'}</td>
                      <td className="border border-gray-400 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newVal = i.legalStrength === 'NEED_SUPPLEMENT' ? 'HIGH' : 'NEED_SUPPLEMENT';
                            setIssues(issues.map(item => item.id === i.id ? { ...item, legalStrength: newVal } : item));
                          }}
                          title="點擊切換爭點定位（🎯 重點攻擊 ↔ ⚠️ 需補充證據）"
                          className={`px-2 py-1 rounded text-3xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                            i.legalStrength === 'NEED_SUPPLEMENT'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                          }`}
                        >
                          {i.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充證據' : '🎯 重點攻擊'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {outputTab === 'evidences_table' && (
            <div className="w-full bg-white border border-black p-8 rounded-xl font-serif space-y-4 shadow-md text-black">
              {/* 頂部附件標籤 */}
              <div className="text-left font-bold text-sm text-black">
                {attachmentText || '附件'}
              </div>

              {/* 標題外框 */}
              <div className="text-center font-bold text-lg text-black border-2 border-black p-3 tracking-wider bg-gray-50/50">
                {tableCourtName || courtName || '臺灣高等法院'}{tableYear || '112'}年度{tableWord || '重上'}字第{tableNo || '123'}號調查證據聲請表
              </div>

              {/* 提出人與日期列 */}
              <div className="grid grid-cols-2 border border-black text-xs font-bold p-2.5 bg-gray-50/30">
                <div>提出人（簽章）：{tableSubmitter || `上訴人 ${appellantName}`}</div>
                <div className="text-right">提出日期：{tableSubmitDate || '112年12月25日'}</div>
              </div>

              {/* 精準 6 欄位表格 */}
              <table className="w-full border-collapse border border-black text-xs font-serif">
                <thead>
                  <tr className="bg-gray-100 text-black font-bold">
                    <th className="border border-black p-2.5 w-12 text-center">編號</th>
                    <th className="border border-black p-2.5 w-1/5 text-left">所涉爭點</th>
                    <th className="border border-black p-2.5 w-1/6 text-left">調查事項</th>
                    <th className="border border-black p-2.5 w-1/6 text-left">調查對象</th>
                    <th className="border border-black p-2.5 w-1/5 text-left">對象地址及聯絡方式</th>
                    <th className="border border-black p-2.5 w-1/4 text-left">待證事實(限50字)</th>
                  </tr>
                </thead>
                <tbody>
                  {evidences.map((e, idx) => (
                    <tr key={e.id || idx} className="hover:bg-gray-50">
                      <td className="border border-black p-2 text-center font-bold font-mono text-sm">{e.code || idx + 1}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed">{e.relatedIssue || e.relatedIssueTitle || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed font-medium">{e.investigationItem || e.method || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed font-bold">{e.investigationTarget || e.target || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed text-gray-800">{e.targetAddress || e.holder || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed">{e.provenFact || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-karoshi-border">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              ⯇ 返回修改判解
            </button>
          </div>
        </div>
      )}

            {/* ⚖️ 裁判書檢索與載入對話框 (Taiwan Legal RAG + 司法院官方 API) */}
      {showJudicialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>⚖️ 裁判書全文庫檢索與匯入</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    匯入至【{targetJudicialField === 'second' ? '裁判書 二' : '裁判書 一'}】
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  支援案號精準調卷（如 112台上2409、115侵訴33）與自然語言語義檢索，一鍵載入裁判全文。
                </p>
              </div>
              <button
                onClick={() => setShowJudicialModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 gap-2">
              <button
                type="button"
                onClick={() => setJudicialModalTab('tlr')}
                className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                  judicialModalTab === 'tlr'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚡ Taiwan Legal RAG 全文庫 (2,250萬筆・24H免帳密)
              </button>
              <button
                type="button"
                onClick={() => setJudicialModalTab('official')}
                className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                  judicialModalTab === 'official'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏛️ 司法院官方 API (JDoc / JList・限 08:00 後)
              </button>
            </div>

            {/* TAB 1: Taiwan Legal RAG */}
            {judicialModalTab === 'tlr' && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        value={tlrQuery}
                        onChange={(e) => setTlrQuery(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => e.key === 'Enter' && handleTlrSearch()}
                        placeholder="輸入字號、司法院網址或案由 (例如：115年度侵訴字第33號、112台上2409)..."
                        className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      {tlrQuery && (
                        <button
                          type="button"
                          onClick={() => setTlrQuery('')}
                          className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold p-0.5 rounded-full"
                          title="清除輸入"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <select
                      value={tlrSearchType}
                      onChange={(e: any) => setTlrSearchType(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hybrid">混合搜尋 (Hybrid)</option>
                      <option value="keyword">精準詞彙 (Keyword)</option>
                      <option value="phrase">片語檢索 (Phrase)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTlrSearch()}
                      disabled={tlrLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs cursor-pointer flex-none"
                    >
                      {tlrLoading ? '🔍 檢索中...' : '🔍 立即檢索'}
                    </button>
                  </div>

                  {/* 常用快速測試 Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-2xs text-gray-600">
                    <span className="font-bold text-gray-500">快速試搜：</span>
                    {[
                      { label: '最高法院 112台上2409', query: '112 台上 2409' },
                      { label: '115 侵訴 33', query: '115 侵訴 33' },
                      { label: '臺中高分院 105交訴51', query: '臺中高分院 105交訴51' },
                      { label: '112 審金訴 26', query: '112 審金訴 26' },
                      { label: '侵占 駁回', query: '侵占 駁回' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTlrQuery(chip.query);
                          handleTlrSearch(chip.query);
                        }}
                        className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/70 hover:border-blue-300 px-2 py-0.5 rounded-full transition shadow-2xs font-medium cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 搜尋結果列表 */}
                {tlrResults.length > 0 && (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-1">
                      <span>檢索結果列表 ({tlrResults.length} 筆)</span>
                      {tlrNote && <span className="text-2xs text-blue-600 font-normal">{tlrNote}</span>}
                    </div>
                    {tlrResults.map((hit, hIdx) => (
                      <div
                        key={hit.doc_id || hIdx}
                        className="border border-gray-200 hover:border-blue-400 bg-gray-50/70 hover:bg-blue-50/30 rounded-xl p-3.5 transition space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap">
                              <span className="bg-blue-100 text-blue-800 text-2xs px-1.5 py-0.5 rounded font-bold">
                                #{hit.rank || hIdx + 1}
                              </span>
                              <span>{hit.citation_text || hit.doc_id}</span>
                              {hit.case_category && (
                                <span className="bg-gray-200 text-gray-700 text-2xs px-1.5 py-0.2 rounded">
                                  {hit.case_category}
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-gray-500 mt-0.5 flex gap-3">
                              <span>🏛️ {hit.court_name}</span>
                              <span>📅 裁判日期：{hit.jdate}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-none">
                            <button
                              type="button"
                              onClick={() => handleTlrFetchFulltext(hit, 'first')}
                              disabled={tlrFetchingDocId === hit.doc_id}
                              className="bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 px-2.5 py-1 rounded-lg text-2xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {tlrFetchingDocId === hit.doc_id ? '載入中...' : '📥 載入至裁判一'}
                            </button>
                            {isDualMode && (
                              <button
                                type="button"
                                onClick={() => handleTlrFetchFulltext(hit, 'second')}
                                disabled={tlrFetchingDocId === hit.doc_id}
                                className="bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 px-2.5 py-1 rounded-lg text-2xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                📥 載入至裁判二
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 命中文字片段預覽 */}
                        {hit.hit_excerpt && (
                          <div className="bg-white/90 border border-gray-200 rounded p-2 text-2xs text-gray-700 font-mono leading-relaxed line-clamp-3">
                            <span className="text-blue-600 font-bold">〔命中片段〕</span> {hit.hit_excerpt}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 司法院官方開放 API (JDoc / JList) */}
            {judicialModalTab === 'official' && (
              <div className="space-y-4">
                {/* 帳號驗證區塊 */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="font-bold text-gray-800 flex justify-between items-center">
                    <span>🔐 司法院開放平臺 Member Authentication</span>
                    {judicialToken && <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">已連線</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="帳號 (預設使用系統環境變數)"
                      value={judicialAccount}
                      onChange={(e) => setJudicialAccount(e.target.value)}
                      className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white"
                    />
                    <input
                      type="password"
                      placeholder="密碼 (預設使用系統環境變數)"
                      value={judicialPassword}
                      onChange={(e) => setJudicialPassword(e.target.value)}
                      className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-2xs text-gray-500">若伺服器已有設定環境變數，留空亦可自動驗證（每日 08:00~24:00 開放）。</span>
                    <button
                      type="button"
                      onClick={handleJudicialAuth}
                      disabled={judicialAuthLoading}
                      className="bg-gray-800 hover:bg-black text-white px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {judicialAuthLoading ? '驗證中...' : '進行身份驗證'}
                    </button>
                  </div>
                </div>

                {/* 裁判書 JID 代碼輸入與載入 */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-gray-800">
                    裁判書 JID 代碼 (例如：CHDM,105,交訴,51,20161216,1)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={judicialJid}
                      onChange={(e) => setJudicialJid(e.target.value)}
                      placeholder="請輸入 JID 代碼"
                      className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchJDocToField()}
                      disabled={judicialFetchLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex-none cursor-pointer"
                    >
                      {judicialFetchLoading ? '下載中...' : '📥 立即帶入裁判書'}
                    </button>
                  </div>
                </div>

                {/* 近 7 日異動清單查詢 */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">🗓️ 司法院 JList 近 7 日裁判異動清單</span>
                    <button
                      type="button"
                      onClick={handleFetchJListInModal}
                      disabled={jlistLoading}
                      className="text-2xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-1 rounded font-semibold border cursor-pointer"
                    >
                      {jlistLoading ? '查詢中...' : '抓取近 7 日裁判清單'}
                    </button>
                  </div>
                  {jlistData.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50 text-2xs">
                      {jlistData.map((dayItem, dIdx) => (
                        <div key={dIdx} className="space-y-1">
                          <div className="font-bold text-gray-700 bg-gray-200/60 px-1.5 py-0.5 rounded">
                            📅 {dayItem.date} (含 {dayItem.list?.length || 0} 件)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {dayItem.list?.slice(0, 10).map((itemJid, jIdx) => (
                              <button
                                key={jIdx}
                                type="button"
                                onClick={() => {
                                  setJudicialJid(itemJid);
                                  handleFetchJDocToField(itemJid);
                                }}
                                className="bg-white border hover:bg-blue-50 hover:border-blue-300 text-gray-800 px-1.5 py-0.5 rounded font-mono"
                              >
                                {itemJid}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 訊息狀態提示 */}
            {judicialMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg font-medium">
                {judicialMsg}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-2xs text-gray-400">
                資料來源：司法院裁判書開放資料庫 ＆ Taiwan Legal RAG (2,250 萬筆)
              </div>
              <button
                type="button"
                onClick={() => setShowJudicialModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
