const fs = require('fs');

const content = fs.readFileSync('src/components/SmartAppealAssistant.tsx', 'utf-8');

const s1 = content.indexOf('{/* 步驟 1: 匯入判決 */}');
const s2 = content.indexOf('{/* 步驟 2: 分析爭點與權威實務見解 */}');
const s3 = content.indexOf('{/* 步驟 3: 提供與整理調查證據 */}');
const s4 = content.indexOf('{/* 步驟 4: 生成正式上訴狀預覽與列印 */}');
const end = content.lastIndexOf('</div>');

const step1 = content.slice(s1, s2);
const step2 = content.slice(s2, s3);
const step3 = content.slice(s3, s4);
const step4 = content.slice(s4, end);

const varsStr = `saveAnalysis, addDocument, saveRetrievedCitations, markCitationFulltextRead, confirmDocument, activeCase, isFallbackMode, setIsFallbackMode, currentStep, setCurrentStep, outputTab, setOutputTab, rawText, setRawText, secondText, setSecondText, isDualMode, setIsDualMode, isParsingPdf, setIsParsingPdf, isAnalyzing, setIsAnalyzing, showJudicialModal, setShowJudicialModal, judicialModalTab, setJudicialModalTab, targetJudicialField, setTargetJudicialField, tlrQuery, setTlrQuery, tlrSearchType, setTlrSearchType, tlrLoading, setTlrLoading, tlrResults, setTlrResults, tlrNote, setTlrNote, tlrFetchingDocId, setTlrFetchingDocId, urlFetchSuccessMsg, setUrlFetchSuccessMsg, judicialJid, setJudicialJid, judicialAccount, setJudicialAccount, judicialPassword, setJudicialPassword, judicialToken, setJudicialToken, judicialAuthLoading, setJudicialAuthLoading, judicialFetchLoading, setJudicialFetchLoading, judicialMsg, setJudicialMsg, jlistData, setJlistData, jlistLoading, setJlistLoading, todayObj, todayIso, todayRoc, caseType, setCaseType, courtName, setCourtName, appealCourtName, setAppealCourtName, caseNo, setCaseNo, sectionCode, setSectionCode, claimAmount, setClaimAmount, deliveryDate, setDeliveryDate, travelDays, setTravelDays, appellantRole, setAppellantRole, appellantName, setAppellantName, appellantId, setAppellantId, appellantAddress, setAppellantAddress, appellantPhone, setAppellantPhone, appellantLegalRep, setAppellantLegalRep, appelleeRole, setAppelleeRole, appelleeName, setAppelleeName, appelleeId, setAppelleeId, appelleeAddress, setAppelleeAddress, deliveryAgent, setDeliveryAgent, deliveryAddress, setDeliveryAddress, claims, setClaims, attachmentText, setAttachmentText, tableCourtName, setTableCourtName, tableYear, setTableYear, tableWord, setTableWord, tableNo, setTableNo, tableSubmitter, setTableSubmitter, tableSubmitDate, setTableSubmitDate, issues, setIssues, evidences, setEvidences, keywords, setKeywords, isSearchingPrecedents, setIsSearchingPrecedents, precedents, setPrecedents, firstUrl, setFirstUrl, secondUrl, setSecondUrl, isFetchingUrl, setIsFetchingUrl, fetchFromUrl, targetUrl, response, errStr, errData, e, data, err, errorMsg, isGeneratingPetition, setIsGeneratingPetition, generatedPetition, setGeneratedPetition, generatedDocumentId, setGeneratedDocumentId, petitionLegalSources, setPetitionLegalSources, isExternalRetrievalUsed, setIsExternalRetrievalUsed, retrievalStatusMessage, setRetrievalStatusMessage, allowedCitations, setAllowedCitations, humanGateNote, setHumanGateNote, petitionVerification, v, appealEligibility, setAppealEligibility, eligibilityStatusTitle, setEligibilityStatusTitle, eligibilityReason, setEligibilityReason, proceduralRequirements, setProceduralRequirements, judgmentSummary, setJudgmentSummary, isAnalyzingSummaryOnly, setIsAnalyzingSummaryOnly, showSummaryInStep2, setShowSummaryInStep2, summaryCardRef, handleFileUpload, file, fullText, ocrRes, ocrData, ocrErr, text, handleTlrSearch, queryToUse, res, handleTlrFetchFulltext, targetField, textToInsert, handleJudicialAuth, handleFetchJDocToField, targetJid, activeToken, authRes, authData, fetchedContent, handleFetchJListInModal, handleDeidentify, modified, handleAnalyzeJudgment, match, handleSearchPrecedents, precedentList, handleGeneratePetition, selectedPrecedentsList, documentId, isVerifyingAi, setIsVerifyingAi, verifyNotice, setVerifyNotice, handleFullVerify, verifyRes, calculateDeadline, date, declDate, reasonDate, today, diffTime, daysLeft, deadlineInfo, handlePrint`;

const allVars = varsStr.split(',').map(s => s.trim()).filter(Boolean);

const imports = `import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";
`;

for (let i = 1; i <= 4; i++) {
  const stepContent = eval(`step${i}`);
  const usedVars = allVars.filter(v => {
    const regex = new RegExp(`\\b${v}\\b`);
    return regex.test(stepContent);
  });
  
  const destructuring = usedVars.join(',\n    ');
  
  const fileContent = `${imports}
export function AppealStep${i}({ ctx }: { ctx: any }) {
  const {
    ${destructuring}
  } = ctx;

  return (
    <>
      ${stepContent}
    </>
  );
}
`;
  fs.writeFileSync(`src/components/appeal/AppealStep${i}.tsx`, fileContent);
}

// Now replace in original file
const beforeSteps = content.slice(0, s1);
const afterSteps = content.slice(end);

const ctxObj = allVars.filter(v => {
  const regex = new RegExp(`\\b${v}\\b`);
  return regex.test(content.slice(0, s1)) || regex.test(content.slice(end));
}).join(', ');

// Wait, the variables must be in scope to be put in `ctx`.
// Let's just put all valid defined variables in `ctx`.
// We will generate the `ctx` object inside the render function before `return`.
// We can use the AST script for this.
