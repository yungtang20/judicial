import React from "react";
import { useAutoSave } from '../hooks/useAutoSave';
import { parsePdfFile } from '../lib/pdfUtils';
import { scrubPersonalInfo } from '../lib/deidentifier';
import { useState, useRef, useMemo } from "react";
import { IssueRow, EvidenceRow, PrecedentItem } from "../types";
import { useAppealStore } from "../store/useAppealStore";
import { useCaseStore } from "../store/useCaseStore";
import { verifyLegalCitations } from "../lib/services/citationCheck";

export function useSmartAppealAssistant() {
  const saveAnalysis = useCaseStore(s => s.saveAnalysis);
  const addDocument = useCaseStore(s => s.addDocument);
  const saveRetrievedCitations = useCaseStore(s => s.saveRetrievedCitations);
  const markCitationFulltextRead = useCaseStore(s => s.markCitationFulltextRead);
  const confirmDocument = useCaseStore(s => s.confirmDocument);
  const activeCase = useCaseStore(s => s.cases[s.activeCaseId]);
  // Step tracker
  const isFallbackMode = useAppealStore(s => s.isFallbackMode);
      const setIsFallbackMode = useAppealStore(s => s.setIsFallbackMode);
  const currentStep = useAppealStore(s => s.currentStep);
      const setCurrentStep = useAppealStore(s => s.setCurrentStep);
  const outputTab = useAppealStore(s => s.outputTab);
      const setOutputTab = useAppealStore(s => s.setOutputTab);

  // Judgment Text & Import State
  const rawText = useAppealStore(s => s.rawText);
      const setRawText = useAppealStore(s => s.setRawText);
  const secondText = useAppealStore(s => s.secondText);
      const setSecondText = useAppealStore(s => s.setSecondText);
  const isDualMode = useAppealStore(s => s.isDualMode);
      const setIsDualMode = useAppealStore(s => s.setIsDualMode);
  const isParsingPdf = useAppealStore(s => s.isParsingPdf);
      const setIsParsingPdf = useAppealStore(s => s.setIsParsingPdf);
  const isAnalyzing = useAppealStore(s => s.isAnalyzing);
      const setIsAnalyzing = useAppealStore(s => s.setIsAnalyzing);

    // 司法院與 Taiwan Legal RAG (TLR) 連線與載入狀態
  const showJudicialModal = useAppealStore(s => s.showJudicialModal);
      const setShowJudicialModal = useAppealStore(s => s.setShowJudicialModal);
  const judicialModalTab = useAppealStore(s => s.judicialModalTab);
      const setJudicialModalTab = useAppealStore(s => s.setJudicialModalTab);
  const targetJudicialField = useAppealStore(s => s.targetJudicialField);
      const setTargetJudicialField = useAppealStore(s => s.setTargetJudicialField);
  const tlrQuery = useAppealStore(s => s.tlrQuery);
      const setTlrQuery = useAppealStore(s => s.setTlrQuery);
  const tlrSearchType = useAppealStore(s => s.tlrSearchType);
      const setTlrSearchType = useAppealStore(s => s.setTlrSearchType);
  const tlrLoading = useAppealStore(s => s.tlrLoading);
      const setTlrLoading = useAppealStore(s => s.setTlrLoading);
  const tlrResults = useAppealStore(s => s.tlrResults);
      const setTlrResults = useAppealStore(s => s.setTlrResults);
  const tlrNote = useAppealStore(s => s.tlrNote);
      const setTlrNote = useAppealStore(s => s.setTlrNote);
  const tlrFetchingDocId = useAppealStore(s => s.tlrFetchingDocId);
      const setTlrFetchingDocId = useAppealStore(s => s.setTlrFetchingDocId);
  const urlFetchSuccessMsg = useAppealStore(s => s.urlFetchSuccessMsg);
      const setUrlFetchSuccessMsg = useAppealStore(s => s.setUrlFetchSuccessMsg);
  
  // 司法院官方 API (JDoc / JList) 狀態
  const judicialJid = useAppealStore(s => s.judicialJid);
      const setJudicialJid = useAppealStore(s => s.setJudicialJid);
  const judicialAccount = useAppealStore(s => s.judicialAccount);
      const setJudicialAccount = useAppealStore(s => s.setJudicialAccount);
  const judicialPassword = useAppealStore(s => s.judicialPassword);
      const setJudicialPassword = useAppealStore(s => s.setJudicialPassword);
  const judicialToken = useAppealStore(s => s.judicialToken);
      const setJudicialToken = useAppealStore(s => s.setJudicialToken);
  const judicialAuthLoading = useAppealStore(s => s.judicialAuthLoading);
      const setJudicialAuthLoading = useAppealStore(s => s.setJudicialAuthLoading);
  const judicialFetchLoading = useAppealStore(s => s.judicialFetchLoading);
      const setJudicialFetchLoading = useAppealStore(s => s.setJudicialFetchLoading);
  const judicialMsg = useAppealStore(s => s.judicialMsg);
      const setJudicialMsg = useAppealStore(s => s.setJudicialMsg);
  const jlistData = useAppealStore(s => s.jlistData);
      const setJlistData = useAppealStore(s => s.setJlistData);
  const jlistLoading = useAppealStore(s => s.jlistLoading);
      const setJlistLoading = useAppealStore(s => s.setJlistLoading);

  // Case Metadata & Dates
  const todayObj = new Date();
  const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

  const caseType = useAppealStore(s => s.caseType);
      const setCaseType = useAppealStore(s => s.setCaseType);
  const courtName = useAppealStore(s => s.courtName);
      const setCourtName = useAppealStore(s => s.setCourtName);
  const appealCourtName = useAppealStore(s => s.appealCourtName);
      const setAppealCourtName = useAppealStore(s => s.setAppealCourtName);
  const caseNo = useAppealStore(s => s.caseNo);
      const setCaseNo = useAppealStore(s => s.setCaseNo);
  const sectionCode = useAppealStore(s => s.sectionCode);
      const setSectionCode = useAppealStore(s => s.setSectionCode);
  const claimAmount = useAppealStore(s => s.claimAmount);
      const setClaimAmount = useAppealStore(s => s.setClaimAmount);
  const deliveryDate = useAppealStore(s => s.deliveryDate);
      const setDeliveryDate = useAppealStore(s => s.setDeliveryDate);
  const travelDays = useAppealStore(s => s.travelDays);
      const setTravelDays = useAppealStore(s => s.setTravelDays); // 在途期間

  // Parties Full Details ( Judicial Yuan Format Requirement )
  const appellantRole = useAppealStore(s => s.appellantRole);
      const setAppellantRole = useAppealStore(s => s.setAppellantRole);
  const appellantName = useAppealStore(s => s.appellantName);
      const setAppellantName = useAppealStore(s => s.setAppellantName);
  const appellantId = useAppealStore(s => s.appellantId);
      const setAppellantId = useAppealStore(s => s.setAppellantId);
  const appellantAddress = useAppealStore(s => s.appellantAddress);
      const setAppellantAddress = useAppealStore(s => s.setAppellantAddress);
  const appellantPhone = useAppealStore(s => s.appellantPhone);
      const setAppellantPhone = useAppealStore(s => s.setAppellantPhone);
  const appellantLegalRep = useAppealStore(s => s.appellantLegalRep);
      const setAppellantLegalRep = useAppealStore(s => s.setAppellantLegalRep);

  const appelleeRole = useAppealStore(s => s.appelleeRole);
      const setAppelleeRole = useAppealStore(s => s.setAppelleeRole);
  const appelleeName = useAppealStore(s => s.appelleeName);
      const setAppelleeName = useAppealStore(s => s.setAppelleeName);
  const appelleeId = useAppealStore(s => s.appelleeId);
      const setAppelleeId = useAppealStore(s => s.setAppelleeId);
  const appelleeAddress = useAppealStore(s => s.appelleeAddress);
      const setAppelleeAddress = useAppealStore(s => s.setAppelleeAddress);

  const deliveryAgent = useAppealStore(s => s.deliveryAgent);
      const setDeliveryAgent = useAppealStore(s => s.setDeliveryAgent);
  const deliveryAddress = useAppealStore(s => s.deliveryAddress);
      const setDeliveryAddress = useAppealStore(s => s.setDeliveryAddress);

  const claims = useAppealStore(s => s.claims);
      const setClaims = useAppealStore(s => s.setClaims);

  // Attachment Table Metadata ( Karoshibox 調查證據聲請表與爭點整理表標頭欄位 )
  const attachmentText = useAppealStore(s => s.attachmentText);
      const setAttachmentText = useAppealStore(s => s.setAttachmentText);
  const tableCourtName = useAppealStore(s => s.tableCourtName);
      const setTableCourtName = useAppealStore(s => s.setTableCourtName);
  const tableYear = useAppealStore(s => s.tableYear);
      const setTableYear = useAppealStore(s => s.setTableYear);
  const tableWord = useAppealStore(s => s.tableWord);
      const setTableWord = useAppealStore(s => s.setTableWord);
  const tableNo = useAppealStore(s => s.tableNo);
      const setTableNo = useAppealStore(s => s.setTableNo);
  const tableSubmitter = useAppealStore(s => s.tableSubmitter);
      const setTableSubmitter = useAppealStore(s => s.setTableSubmitter);
  const tableSubmitDate = useAppealStore(s => s.tableSubmitDate);
      const setTableSubmitDate = useAppealStore(s => s.setTableSubmitDate);

  // Issues & Evidences
  const issues = useAppealStore(s => s.issues);
      const setIssues = useAppealStore(s => s.setIssues);

  const evidences = useAppealStore(s => s.evidences);
      const setEvidences = useAppealStore(s => s.setEvidences);

  // Precedents & Interpretations
  const keywords = useAppealStore(s => s.keywords);
      const setKeywords = useAppealStore(s => s.setKeywords);
  const isSearchingPrecedents = useAppealStore(s => s.isSearchingPrecedents);
      const setIsSearchingPrecedents = useAppealStore(s => s.setIsSearchingPrecedents);
  const precedents = useAppealStore(s => s.precedents);
      const setPrecedents = useAppealStore(s => s.setPrecedents);

  // Appeal Petition Generation State

  const firstUrl = useAppealStore(s => s.firstUrl);
      const setFirstUrl = useAppealStore(s => s.setFirstUrl);
  const secondUrl = useAppealStore(s => s.secondUrl);
      const setSecondUrl = useAppealStore(s => s.setSecondUrl);
  const isFetchingUrl = useAppealStore(s => s.isFetchingUrl);
      const setIsFetchingUrl = useAppealStore(s => s.setIsFetchingUrl);

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

  const isGeneratingPetition = useAppealStore(s => s.isGeneratingPetition);
      const setIsGeneratingPetition = useAppealStore(s => s.setIsGeneratingPetition);
  const generatedPetition = useAppealStore(s => s.generatedPetition);
      const setGeneratedPetition = useAppealStore(s => s.setGeneratedPetition);
  const [generatedDocumentId, setGeneratedDocumentId] = useState<string | null>(null);
  const [petitionLegalSources, setPetitionLegalSources] = useState<any>(null);
  const [isExternalRetrievalUsed, setIsExternalRetrievalUsed] = useState<boolean>(false);
  const [retrievalStatusMessage, setRetrievalStatusMessage] = useState<string | undefined>(undefined);
  const [allowedCitations, setAllowedCitations] = useState<string[]>([]);
  const [humanGateNote, setHumanGateNote] = useState('');

  const petitionVerification = useMemo(() => {
    if (!generatedPetition) return undefined;
    const v = verifyLegalCitations(generatedPetition);
    return {
      totalCitationsChecked: v.totalChecked,
      ghostCitationsFound: v.ghostCount,
      verifiedCitations: v.results
    };
  }, [generatedPetition]);

  // Appeal Eligibility & Admissibility Gatekeeper State
  const appealEligibility = useAppealStore(s => s.appealEligibility);
      const setAppealEligibility = useAppealStore(s => s.setAppealEligibility);
  const eligibilityStatusTitle = useAppealStore(s => s.eligibilityStatusTitle);
      const setEligibilityStatusTitle = useAppealStore(s => s.setEligibilityStatusTitle);
  const eligibilityReason = useAppealStore(s => s.eligibilityReason);
      const setEligibilityReason = useAppealStore(s => s.setEligibilityReason);
  const proceduralRequirements = useAppealStore(s => s.proceduralRequirements);
      const setProceduralRequirements = useAppealStore(s => s.setProceduralRequirements);

  // Judgment Summary State (原審裁判全文重點摘要)
  const judgmentSummary = useAppealStore(s => s.judgmentSummary);
      const setJudgmentSummary = useAppealStore(s => s.setJudgmentSummary);
  const isAnalyzingSummaryOnly = useAppealStore(s => s.isAnalyzingSummaryOnly);
      const setIsAnalyzingSummaryOnly = useAppealStore(s => s.setIsAnalyzingSummaryOnly);
  const showSummaryInStep2 = useAppealStore(s => s.showSummaryInStep2);
      const setShowSummaryInStep2 = useAppealStore(s => s.setShowSummaryInStep2);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  // ---------- Auto Save / Load Mechanism ----------
  useAutoSave(
    'SmartAppealAssistant_Draft_v1',
    // 法律原文、當事人資料與生成書狀不得自動寫入 localStorage；僅保留非敏感 UI 位置。
    { currentStep },
    (data: any) => {
      if (data.currentStep) setCurrentStep(data.currentStep);
    }
  );
  // ------------------------------------------------


  // 1. PDF File Import Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'first' | 'second' = 'first') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setIsParsingPdf(true);
      try {
        const { text, images } = await parsePdfFile(file);
        let fullText = text;

        // 偵測到無內建文字或文字極少（即掃描版 PDF），自動呼叫後端多模態 OCR 服務
        if (fullText.trim().length < 100 && images.length > 0) {
          try {
            const ocrRes = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images })
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
            console.warn('OCR fetch failed:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
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
      saveRetrievedCitations((data.results || []).map((hit: any): PrecedentItem => ({
        id: hit.doc_id || hit.citation_text,
        type: '裁判',
        citation: hit.citation_text || hit.doc_id || '',
        summary: hit.hit_excerpt || '',
        applicationReason: '',
        selected: false,
        sourceProvider: 'tw-legal-rag',
        sourceUrl: hit.source_url,
        sourceStatus: 'RETRIEVED_UNREAD',
        sourceId: hit.doc_id,
        fetchedAt: new Date().toISOString()
      })));
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
      markCitationFulltextRead(item.doc_id || item.citation_text, item.source_url);
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
  const handleDeidentify = () => {
    let modified = false;
    if (rawText) {
      setRawText(scrubPersonalInfo(rawText));
      modified = true;
    }
    if (secondText) {
      setSecondText(scrubPersonalInfo(secondText));
      modified = true;
    }
    
    if (modified) {
      alert('✅ 已執行基本去識別化（身分證字號、電話、部分地址與當事人稱謂前方）。\n⚠️ 注意：人工閱讀時請再次確認是否還有遺漏個資。');
    }
  };

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
      saveAnalysis(data, {
        facts: rawText,
        caseType: data.caseType,
        issues: data.suggestedIssues || [],
        evidences: data.suggestedEvidences || [],
        citations: data.suggestedPrecedents || []
      });

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
      if (data.petitionText) {
        setPetitionLegalSources(data.legalSources);
        setIsExternalRetrievalUsed(data.isExternalRetrievalUsed);
        setRetrievalStatusMessage(data.retrievalStatusMessage);
        setAllowedCitations(data.allowedCitations || []);

        const documentId = `appeal-${Date.now()}`;
        setGeneratedDocumentId(documentId);
        addDocument({
          id: documentId,
          kind: 'APPEAL_PETITION',
          title: '上訴理由狀',
          text: data.petitionText,
          status: data.antiGhostVerification?.verificationPassed === false ? 'NEEDS_HUMAN_REVIEW' : 'VERIFIED',
          sourceTool: 'SmartAppealAssistant',
          createdAt: new Date().toISOString(),
          verification: data.antiGhostVerification
        });
      }
      setCurrentStep(4);
      // Auto-trigger full AI citation verification check upon document generation
      if (data.petitionText) {
        handleFullVerify(data.petitionText);
      }
    } catch (err: any) {
      alert(err.message || '生成失敗');
    } finally {
      setIsGeneratingPetition(false);
    }
  };

  // Explicit AI Full Citation Verification
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleFullVerify = async (textToVerify?: string) => {
    const text = textToVerify || generatedPetition;
    if (!text) return;
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    try {
      const res = await fetch('/api/toolbox/verify-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: text })
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

  
  const ctx = {
    saveAnalysis,
    addDocument,
    saveRetrievedCitations,
    markCitationFulltextRead,
    confirmDocument,
    activeCase,
    isFallbackMode,
    setIsFallbackMode,
    currentStep,
    setCurrentStep,
    outputTab,
    setOutputTab,
    rawText,
    setRawText,
    secondText,
    setSecondText,
    isDualMode,
    setIsDualMode,
    isParsingPdf,
    setIsParsingPdf,
    isAnalyzing,
    setIsAnalyzing,
    showJudicialModal,
    setShowJudicialModal,
    judicialModalTab,
    setJudicialModalTab,
    targetJudicialField,
    setTargetJudicialField,
    tlrQuery,
    setTlrQuery,
    tlrSearchType,
    setTlrSearchType,
    tlrLoading,
    setTlrLoading,
    tlrResults,
    setTlrResults,
    tlrNote,
    setTlrNote,
    tlrFetchingDocId,
    setTlrFetchingDocId,
    urlFetchSuccessMsg,
    setUrlFetchSuccessMsg,
    judicialJid,
    setJudicialJid,
    judicialAccount,
    setJudicialAccount,
    judicialPassword,
    setJudicialPassword,
    judicialToken,
    setJudicialToken,
    judicialAuthLoading,
    setJudicialAuthLoading,
    judicialFetchLoading,
    setJudicialFetchLoading,
    judicialMsg,
    setJudicialMsg,
    jlistData,
    setJlistData,
    jlistLoading,
    setJlistLoading,
    todayObj,
    todayIso,
    todayRoc,
    caseType,
    setCaseType,
    courtName,
    setCourtName,
    appealCourtName,
    setAppealCourtName,
    caseNo,
    setCaseNo,
    sectionCode,
    setSectionCode,
    claimAmount,
    setClaimAmount,
    deliveryDate,
    setDeliveryDate,
    travelDays,
    setTravelDays,
    appellantRole,
    setAppellantRole,
    appellantName,
    setAppellantName,
    appellantId,
    setAppellantId,
    appellantAddress,
    setAppellantAddress,
    appellantPhone,
    setAppellantPhone,
    appellantLegalRep,
    setAppellantLegalRep,
    appelleeRole,
    setAppelleeRole,
    appelleeName,
    setAppelleeName,
    appelleeId,
    setAppelleeId,
    appelleeAddress,
    setAppelleeAddress,
    deliveryAgent,
    setDeliveryAgent,
    deliveryAddress,
    setDeliveryAddress,
    claims,
    setClaims,
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
    issues,
    setIssues,
    evidences,
    setEvidences,
    keywords,
    setKeywords,
    isSearchingPrecedents,
    setIsSearchingPrecedents,
    precedents,
    setPrecedents,
    firstUrl,
    setFirstUrl,
    secondUrl,
    setSecondUrl,
    isFetchingUrl,
    setIsFetchingUrl,
    fetchFromUrl,
    isGeneratingPetition,
    setIsGeneratingPetition,
    generatedPetition,
    setGeneratedPetition,
    generatedDocumentId,
    setGeneratedDocumentId,
    petitionLegalSources,
    setPetitionLegalSources,
    isExternalRetrievalUsed,
    setIsExternalRetrievalUsed,
    retrievalStatusMessage,
    setRetrievalStatusMessage,
    allowedCitations,
    setAllowedCitations,
    humanGateNote,
    setHumanGateNote,
    petitionVerification,
    appealEligibility,
    setAppealEligibility,
    eligibilityStatusTitle,
    setEligibilityStatusTitle,
    eligibilityReason,
    setEligibilityReason,
    proceduralRequirements,
    setProceduralRequirements,
    judgmentSummary,
    setJudgmentSummary,
    isAnalyzingSummaryOnly,
    setIsAnalyzingSummaryOnly,
    showSummaryInStep2,
    setShowSummaryInStep2,
    summaryCardRef,
    handleFileUpload,
    handleTlrSearch,
    handleTlrFetchFulltext,
    handleJudicialAuth,
    handleFetchJDocToField,
    handleFetchJListInModal,
    handleDeidentify,
    handleAnalyzeJudgment,
    handleSearchPrecedents,
    handleGeneratePetition,
    isVerifyingAi,
    setIsVerifyingAi,
    verifyNotice,
    setVerifyNotice,
    handleFullVerify,
    calculateDeadline,
    deadlineInfo,
    handlePrint
  };


  return {
    ctx,
    deliveryDate,
    setDeliveryDate,
    travelDays,
    setTravelDays,
    deadlineInfo,
    currentStep,
    setCurrentStep
  };
}
