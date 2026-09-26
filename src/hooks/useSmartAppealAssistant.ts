import React from "react";
import { useAutoSave } from '../hooks/useAutoSave';
import { fetchWithAuth } from '../lib/apiClient';
import { useState, useRef, useMemo, useEffect } from "react";
import { IssueRow, EvidenceRow, PrecedentItem } from "../types";
import { useAppealBindings } from './useAppealBindings';
import { useCaseStore } from "../store/useCaseStore";
import { assessGrounding } from '../lib/groundingAssessment';
import { verifyLegalCitations } from "../lib/services/citationCheck";
import type { LegalSearchSources } from '../lib/twLegalRagClient';
import {
  calculateAppealDeadline,
  deidentifyJudgments,
  fetchJudicialUrl,
  importJudgmentFile
} from './appealDocumentActions';
import {
  mapRecommendedKeywords,
  mapSuggestedEvidences,
  mapSuggestedIssues,
  mapSuggestedPrecedents,
  parseAppealCaseNumber
} from './appealDataAdapters';
import {
  authenticateJudicial,
  fetchJudicialJDoc,
  fetchJudicialJList,
  fetchTlrFulltext,
  searchTlr
} from './appealRemoteActions';

export function useSmartAppealAssistant() {
  const saveAnalysis = useCaseStore(s => s.saveAnalysis);
  const addDocument = useCaseStore(s => s.addDocument);
  const saveRetrievedCitations = useCaseStore(s => s.saveRetrievedCitations);
  const markCitationFulltextRead = useCaseStore(s => s.markCitationFulltextRead);
  const confirmDocument = useCaseStore(s => s.confirmDocument);
  const activeCase = useCaseStore(s => s.cases[s.activeCaseId]);
  const {
    isFallbackMode, setIsFallbackMode, currentStep, setCurrentStep, outputTab, setOutputTab,
    rawText, setRawText, secondText, setSecondText, isDualMode, setIsDualMode,
    isParsingPdf, setIsParsingPdf, isAnalyzing, setIsAnalyzing,
    showJudicialModal, setShowJudicialModal, judicialModalTab, setJudicialModalTab,
    targetJudicialField, setTargetJudicialField, tlrQuery, setTlrQuery, tlrSearchType, setTlrSearchType,
    tlrLoading, setTlrLoading, tlrResults, setTlrResults, tlrNote, setTlrNote,
    tlrFetchingDocId, setTlrFetchingDocId, urlFetchSuccessMsg, setUrlFetchSuccessMsg,
    judicialJid, setJudicialJid, judicialAccount, setJudicialAccount, judicialPassword, setJudicialPassword,
    judicialToken, setJudicialToken, judicialAuthLoading, setJudicialAuthLoading,
    judicialFetchLoading, setJudicialFetchLoading, judicialMsg, setJudicialMsg,
    jlistData, setJlistData, jlistLoading, setJlistLoading,
    caseType, setCaseType, courtName, setCourtName, appealCourtName, setAppealCourtName,
    caseNo, setCaseNo, sectionCode, setSectionCode, claimAmount, setClaimAmount,
    deliveryDate, setDeliveryDate, travelDays, setTravelDays,
    appellantRole, setAppellantRole, appellantName, setAppellantName, appellantId, setAppellantId,
    appellantAddress, setAppellantAddress, appellantPhone, setAppellantPhone, appellantLegalRep, setAppellantLegalRep,
    appelleeRole, setAppelleeRole, appelleeName, setAppelleeName, appelleeId, setAppelleeId,
    appelleeAddress, setAppelleeAddress, deliveryAgent, setDeliveryAgent, deliveryAddress, setDeliveryAddress,
    claims, setClaims, attachmentText, setAttachmentText, tableCourtName, setTableCourtName,
    tableYear, setTableYear, tableWord, setTableWord, tableNo, setTableNo,
    tableSubmitter, setTableSubmitter, tableSubmitDate, setTableSubmitDate,
    setIssues, setEvidences, keywords, setKeywords,
    isSearchingPrecedents, setIsSearchingPrecedents, precedents, setPrecedents,
    firstUrl, setFirstUrl, secondUrl, setSecondUrl, isFetchingUrl, setIsFetchingUrl,
    isGeneratingPetition, setIsGeneratingPetition, generatedPetition, setGeneratedPetition,
    appealEligibility, setAppealEligibility, eligibilityStatusTitle, setEligibilityStatusTitle,
    eligibilityReason, setEligibilityReason, proceduralRequirements, setProceduralRequirements,
    judgmentSummary, setJudgmentSummary, isAnalyzingSummaryOnly, setIsAnalyzingSummaryOnly,
    showSummaryInStep2, setShowSummaryInStep2
  } = useAppealBindings();
  const caseIssues = activeCase.issues;
  const updateCaseIssues = useCaseStore(s => s.updateIssues);
  const updateCaseEvidences = useCaseStore(s => s.updateEvidences);
  const caseEvidences = activeCase.evidences;

  const todayObj = new Date();
  const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;
  const fetchFromUrl = (targetField: 'first' | 'second') => {
    const requestScope = beginAppealOperation();
    return fetchJudicialUrl({
      targetField,
      firstUrl,
      secondUrl,
      setTargetJudicialField,
      setIsFetchingUrl,
      setUrlFetchSuccessMsg,
      setRawText,
      setSecondText,
      isCurrent: () => isCurrentAppealScope(requestScope)
    });
  };

  const [generatedDocumentId, setGeneratedDocumentId] = useState<string | null>(null);
  const [petitionLegalSources, setPetitionLegalSources] = useState<LegalSearchSources | null>(null);
  const [isExternalRetrievalUsed, setIsExternalRetrievalUsed] = useState(false);
  const [retrievalStatusMessage, setRetrievalStatusMessage] = useState<string | undefined>(undefined);
  const [allowedCitations, setAllowedCitations] = useState<string[]>([]);
  const [humanGateNote, setHumanGateNote] = useState('');
  const appealScope = `${activeCase.caseId}:${activeCase.workflowStateId ?? ''}`;
  const appealRequestGeneration = useRef(0);
  useEffect(() => () => {
    appealRequestGeneration.current += 1;
    appealScopeRef.current = '__unmounted__';
  }, []);
  const previousAppealScope = useRef(appealScope);
  const appealScopeRef = useRef(`${appealScope}:0`);
  appealScopeRef.current = `${appealScope}:${appealRequestGeneration.current}`;
  const beginAppealOperation = () => {
    const operationScope = `${appealScope}:${++appealRequestGeneration.current}`;
    appealScopeRef.current = operationScope;
    return operationScope;
  };
  const isCurrentAppealScope = (scope: string) => appealScopeRef.current === scope;

  const petitionVerification = useMemo(() => {
    if (!generatedPetition) return undefined;
    const verification = verifyLegalCitations(generatedPetition);
    return {
      totalCitationsChecked: verification.totalChecked,
      ghostCitationsFound: verification.ghostCount,
      verifiedCitations: verification.results
    };
  }, [generatedPetition]);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  // ---------- Auto Save / Load Mechanism ----------
  useAutoSave(
    `SmartAppealAssistant_Draft_v1_${appealScope}`,
    // 法律原文、當事人資料與生成書狀不得自動寫入 localStorage；僅保留非敏感 UI 位置。
    { currentStep },
    (data: any) => {
      if (data.currentStep) setCurrentStep(data.currentStep);
    }
  );
  // ------------------------------------------------


  // 1. PDF File Import Handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, targetField: 'first' | 'second' = 'first') => {
    const requestScope = beginAppealOperation();
    return importJudgmentFile({
      event,
      targetField,
      setIsParsingPdf,
      setRawText,
      setSecondText,
      isCurrent: () => isCurrentAppealScope(requestScope)
    });
  };

    // 1-1. Taiwan Legal RAG (TLR: 2,250萬筆判決 24H 免帳密) 處理函式
  const handleTlrSearch = async (queryOverride?: string) => {
    const requestScope = beginAppealOperation();
    const queryToUse = queryOverride !== undefined ? queryOverride : tlrQuery;
    if (!queryToUse || !queryToUse.trim()) {
      setJudicialMsg('請輸入裁判字號或案由關鍵字（例如：112 台上 2409、115 侵訴 33 或 加重詐欺）');
      return;
    }
    setTlrLoading(true);
    setJudicialMsg('');
    try {
      const response = await searchTlr(queryToUse.trim(), tlrSearchType);
      if (!isCurrentAppealScope(requestScope)) return;
      setTlrResults(response.results);
      saveRetrievedCitations(response.results.map(hit => ({
        id: hit.doc_id || hit.citation_text || 'tlr-result',
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
      setTlrNote(response.note || '');
      setJudicialMsg(response.results.length === 0
        ? response.note || '查無相符裁判書，請嘗試使用其他案號格式或縮減關鍵字。'
        : `🔍 檢索完成，共找到 ${response.results.length} 筆相符裁判書（點擊即可載入全文）`);
    } catch (err) {
      if (isCurrentAppealScope(requestScope)) setJudicialMsg(`❌ 搜尋失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setTlrLoading(false);
    }
  };

  const handleTlrFetchFulltext = async (item: { doc_id?: string; citation_text?: string; result_token?: string; source_url?: string; court_name?: string }, customTargetField?: 'first' | 'second') => {
    const requestScope = beginAppealOperation();
    const targetField = customTargetField || targetJudicialField;
    setTlrFetchingDocId(item.doc_id || null);
    setJudicialMsg(`⏳ 正在向裁判書伺服器調閱【${item.citation_text || item.doc_id}】之完整裁判書內文...`);
    try {
      const response = await fetchTlrFulltext(item);
      if (!isCurrentAppealScope(requestScope)) return;
      const textToInsert = response.fulltext;
      if (!textToInsert) throw new Error('回傳之裁判書內容為空');
      markCitationFulltextRead(item.doc_id || item.citation_text || '', response.sourceUrl);
      if (targetField === 'second') setSecondText(textToInsert);
      else setRawText(textToInsert);
      if (item.court_name && (!courtName || courtName === '臺灣臺北地方法院')) setCourtName(item.court_name);
      setJudicialMsg(`🎉 成功載入【${item.citation_text || item.doc_id}】至【${targetField === 'second' ? '裁判書 二' : '裁判書 一'}】！共 ${textToInsert.length.toLocaleString()} 字。`);
      setTimeout(() => {
        if (isCurrentAppealScope(requestScope)) setShowJudicialModal(false);
      }, 1200);
    } catch (err) {
      if (isCurrentAppealScope(requestScope)) setJudicialMsg(`❌ 取得全文失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      if (isCurrentAppealScope(requestScope)) setTlrFetchingDocId(null);
    }
  };

  // 1-2. 司法院裁判書開放 API (JDoc / Auth / JList) 處理函式
  const handleJudicialAuth = async () => {
    const requestScope = beginAppealOperation();
    setJudicialAuthLoading(true);
    setJudicialMsg('');
    try {
      const authenticatedToken = await authenticateJudicial(judicialAccount, judicialPassword);
      if (!isCurrentAppealScope(requestScope)) return;
      setJudicialToken(authenticatedToken);
      setJudicialMsg('✅ 司法院 API 驗證成功！已順利取得授權 Token');
    } catch (err) {
      if (isCurrentAppealScope(requestScope)) setJudicialMsg(`❌ 連線異常：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setJudicialAuthLoading(false);
    }
  };

  const handleFetchJDocToField = async (jidToFetch?: string) => {
    const requestScope = beginAppealOperation();
    const targetJid = jidToFetch || judicialJid;
    if (!targetJid || !targetJid.trim()) {
      alert('請輸入或選擇裁判書 JID 代碼');
      return;
    }
    setJudicialFetchLoading(true);
    setJudicialMsg('');
    try {
      const activeToken = judicialToken || await authenticateJudicial(judicialAccount, judicialPassword);
      if (!isCurrentAppealScope(requestScope)) return;
      if (!judicialToken) setJudicialToken(activeToken);
      const response = await fetchJudicialJDoc(activeToken, targetJid.trim());
      if (!isCurrentAppealScope(requestScope)) return;
      if (targetJudicialField === 'second') setSecondText(response.content);
      else setRawText(response.content);
      setJudicialMsg(`🎉 成功由司法院 API 帶入裁判書全文 (${targetJid})！`);
      setTimeout(() => {
        if (isCurrentAppealScope(requestScope)) setShowJudicialModal(false);
      }, 1000);
    } catch (err) {
      if (isCurrentAppealScope(requestScope)) setJudicialMsg(`❌ 請求錯誤：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setJudicialFetchLoading(false);
    }
  };

  const handleFetchJListInModal = async () => {
    const requestScope = beginAppealOperation();
    setJlistLoading(true);
    setJudicialMsg('');
    try {
      const activeToken = judicialToken || await authenticateJudicial(judicialAccount, judicialPassword);
      if (!isCurrentAppealScope(requestScope)) return;
      if (!judicialToken) setJudicialToken(activeToken);
      const data = await fetchJudicialJList(activeToken);
      if (!isCurrentAppealScope(requestScope)) return;
      setJlistData(data);
      setJudicialMsg(`已成功取得近 7 日裁判書異動清單（包含 ${data.length} 天紀錄）`);
    } catch (err) {
      if (isCurrentAppealScope(requestScope)) setJudicialMsg(`❌ 連線錯誤：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setJlistLoading(false);
    }
  };

  // 2. AI Judgment Analysis (可選全盤分析跳轉至第二步，或僅生成摘要留在第一步)
  const handleDeidentify = () => deidentifyJudgments({ rawText, secondText, setRawText, setSecondText });

  const handleAnalyzeJudgment = async (jumpToStepTwo: boolean = true) => {
    const requestScope = beginAppealOperation();
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
      const res = await fetchWithAuth('/api/analyze-judgment', {
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
      if (!isCurrentAppealScope(requestScope)) return;
      
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
        const parsedCaseNumber = parseAppealCaseNumber(data.caseNo);
        if (parsedCaseNumber) {
          setTableYear(parsedCaseNumber.year);
          setTableWord(parsedCaseNumber.word);
          setTableNo(parsedCaseNumber.number);
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
      if (data.judgmentSummary) {
        setJudgmentSummary(data.judgmentSummary);
        // 模型可能補寫原文未載明的內容（實測以極短無意義原文即可產出長篇捏造事實）。
        // 此處只做提醒不阻擋，實際防線是要求使用者逐句核對原始裁判書。
        const grounding = assessGrounding(rawText, data.judgmentSummary);
        setGroundingWarning(grounding.warning);
      }

      const mappedIssues = mapSuggestedIssues(data.suggestedIssues);
      if (mappedIssues.length > 0) setIssues(mappedIssues);

      const mappedEvidences = mapSuggestedEvidences(data.suggestedEvidences);
      if (mappedEvidences.length > 0) setEvidences(mappedEvidences);

      const mappedKeywords = mapRecommendedKeywords(data.recommendedKeywords);
      if (mappedKeywords) setKeywords(mappedKeywords);

      const mappedPrecedents = mapSuggestedPrecedents(data.suggestedPrecedents);
      if (mappedPrecedents.length > 0) setPrecedents(mappedPrecedents);
      saveAnalysis(data, {
        facts: rawText,
        caseType: data.caseType,
        issues: mappedIssues,
        evidences: mappedEvidences,
        citations: mappedPrecedents
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
      if (isCurrentAppealScope(requestScope)) alert(err.message || '分析發生錯誤');
    } finally {
        setIsAnalyzing(false);
        setIsAnalyzingSummaryOnly(false);
      }
  };

  // 3. Search Precedents & Ministry Interpretations
  const handleSearchPrecedents = async () => {
    const requestScope = beginAppealOperation();
    setIsSearchingPrecedents(true);
    try {
      const res = await fetchWithAuth('/api/search-precedents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          caseSummary: caseIssues.map(i => `${i.title}: ${i.appealArgument}`).join('; ')
        })
      });

      if (!res.ok) throw new Error('檢索失敗');
      const data = await res.json();
      if (!isCurrentAppealScope(requestScope)) return;
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
      if (isCurrentAppealScope(requestScope)) alert(err.message || '檢索判解函釋發生錯誤');
    } finally {
      setIsSearchingPrecedents(false);
    }
  };

  // 4. Generate Standard Judicial Appeal Petition
  const handleGeneratePetition = async () => {
    const requestScope = beginAppealOperation();
    setIsGeneratingPetition(true);
    setPetitionError(null);
    try {
      const selectedPrecedentsList = precedents.filter(p => p.selected);

      const res = await fetchWithAuth('/api/generate-appeal-petition', {
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
          issues: caseIssues,
          evidences: caseEvidences,
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
      if (!isCurrentAppealScope(requestScope)) return;
      
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
          status: data.antiGhostVerification?.verificationPassed === true ? 'VERIFIED' : 'NEEDS_HUMAN_REVIEW',
          sourceTool: 'SmartAppealAssistant',
          createdAt: new Date().toISOString(),
          verification: data.antiGhostVerification
        });
      }
      setCurrentStep(4);
      // Auto-trigger full AI citation verification check upon document generation
      setIsGeneratingPetition(false);
      if (data.petitionText) {
        handleFullVerify(data.petitionText);
      }
    } catch (err: any) {
      // 過去使用阻塞式原生 alert()：無頭環境會自動關閉而完全看不到反饋，
      // 且與應用程式既有的提示樣式不一致。改為畫面上的具體說明。
      if (isCurrentAppealScope(requestScope)) {
        setPetitionError(err?.message || '生成失敗，請稍後再試或改用其他已開放的書狀類型。');
      }
    } finally {
      setIsGeneratingPetition(false);
    }
  };

  // 上訴理由狀產製失敗的具體原因，顯示於第三步按鈕上方。
  const [petitionError, setPetitionError] = useState<string | null>(null);

  // Explicit AI Full Citation Verification
  // AI 提煉內容的來源支持度警示；null 代表未觸發。
  const [groundingWarning, setGroundingWarning] = useState<string | null>(null);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleFullVerify = async (textToVerify?: string) => {
    const requestScope = beginAppealOperation();
    const text = textToVerify || generatedPetition;
    if (!text) return;
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    try {
      const res = await fetchWithAuth('/api/toolbox/verify-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: text })
      });
      if (res.ok) {
        const verifyRes = await res.json();
        if (!isCurrentAppealScope(requestScope)) return;
        const { totalCitationsChecked, ghostCitationsFound } = verifyRes.antiGhostVerification;
        setVerifyNotice(`全篇引用檢查完成：共核對 ${totalCitationsChecked} 處法律引用，疑似幽靈引用：${ghostCitationsFound} 處；結果仍需人工查證。`);
      }
    } catch (err: any) {
      if (isCurrentAppealScope(requestScope)) {
        console.error('Full AI verification failed:', err);
        setVerifyNotice('引用檢查暫時無法完成，請稍後重試並人工查證來源。');
      }
    } finally {
      setIsVerifyingAi(false);
    }
  };
  useEffect(() => {
    if (previousAppealScope.current === appealScope) return;
    previousAppealScope.current = appealScope;
    setGeneratedDocumentId(null);
    setPetitionLegalSources(null);
    setIsExternalRetrievalUsed(false);
    setRetrievalStatusMessage(undefined);
    setAllowedCitations([]);
    setHumanGateNote('');
    setGeneratedPetition('');
    setVerifyNotice(null);
  }, [appealScope, setGeneratedPetition]);

  // Calculate Appeal Deadline
  const calculateDeadline = () => calculateAppealDeadline({ deliveryDate, travelDays, caseType });
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
    caseId: activeCase.caseId,
    workflowStateId: activeCase.workflowStateId,
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
    issues: caseIssues,
    updateCaseIssues,
    updateCaseEvidences,
    setIssues,
    evidences: caseEvidences,
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
    petitionError,
    setPetitionError,
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
    groundingWarning, setGroundingWarning,
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
