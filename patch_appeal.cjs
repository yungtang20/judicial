const fs = require('fs');

const content = fs.readFileSync('src/components/SmartAppealAssistant.tsx', 'utf-8');
const s1 = content.indexOf('{/* 步驟 1: 匯入判決 */}');
const end = content.lastIndexOf('</div>');

const beforeSteps = content.slice(0, s1);
const afterSteps = content.slice(end);

// Extract vars from beforeSteps
const varsStr = `saveAnalysis, addDocument, saveRetrievedCitations, markCitationFulltextRead, confirmDocument, activeCase, isFallbackMode, setIsFallbackMode, currentStep, setCurrentStep, outputTab, setOutputTab, rawText, setRawText, secondText, setSecondText, isDualMode, setIsDualMode, isParsingPdf, setIsParsingPdf, isAnalyzing, setIsAnalyzing, showJudicialModal, setShowJudicialModal, judicialModalTab, setJudicialModalTab, targetJudicialField, setTargetJudicialField, tlrQuery, setTlrQuery, tlrSearchType, setTlrSearchType, tlrLoading, setTlrLoading, tlrResults, setTlrResults, tlrNote, setTlrNote, tlrFetchingDocId, setTlrFetchingDocId, urlFetchSuccessMsg, setUrlFetchSuccessMsg, judicialJid, setJudicialJid, judicialAccount, setJudicialAccount, judicialPassword, setJudicialPassword, judicialToken, setJudicialToken, judicialAuthLoading, setJudicialAuthLoading, judicialFetchLoading, setJudicialFetchLoading, judicialMsg, setJudicialMsg, jlistData, setJlistData, jlistLoading, setJlistLoading, todayObj, todayIso, todayRoc, caseType, setCaseType, courtName, setCourtName, appealCourtName, setAppealCourtName, caseNo, setCaseNo, sectionCode, setSectionCode, claimAmount, setClaimAmount, deliveryDate, setDeliveryDate, travelDays, setTravelDays, appellantRole, setAppellantRole, appellantName, setAppellantName, appellantId, setAppellantId, appellantAddress, setAppellantAddress, appellantPhone, setAppellantPhone, appellantLegalRep, setAppellantLegalRep, appelleeRole, setAppelleeRole, appelleeName, setAppelleeName, appelleeId, setAppelleeId, appelleeAddress, setAppelleeAddress, deliveryAgent, setDeliveryAgent, deliveryAddress, setDeliveryAddress, claims, setClaims, attachmentText, setAttachmentText, tableCourtName, setTableCourtName, tableYear, setTableYear, tableWord, setTableWord, tableNo, setTableNo, tableSubmitter, setTableSubmitter, tableSubmitDate, setTableSubmitDate, issues, setIssues, evidences, setEvidences, keywords, setKeywords, isSearchingPrecedents, setIsSearchingPrecedents, precedents, setPrecedents, firstUrl, setFirstUrl, secondUrl, setSecondUrl, isFetchingUrl, setIsFetchingUrl, fetchFromUrl, targetUrl, response, errStr, errData, e, data, err, errorMsg, isGeneratingPetition, setIsGeneratingPetition, generatedPetition, setGeneratedPetition, generatedDocumentId, setGeneratedDocumentId, petitionLegalSources, setPetitionLegalSources, isExternalRetrievalUsed, setIsExternalRetrievalUsed, retrievalStatusMessage, setRetrievalStatusMessage, allowedCitations, setAllowedCitations, humanGateNote, setHumanGateNote, petitionVerification, v, appealEligibility, setAppealEligibility, eligibilityStatusTitle, setEligibilityStatusTitle, eligibilityReason, setEligibilityReason, proceduralRequirements, setProceduralRequirements, judgmentSummary, setJudgmentSummary, isAnalyzingSummaryOnly, setIsAnalyzingSummaryOnly, showSummaryInStep2, setShowSummaryInStep2, summaryCardRef, handleFileUpload, file, fullText, ocrRes, ocrData, ocrErr, text, handleTlrSearch, queryToUse, res, handleTlrFetchFulltext, targetField, textToInsert, handleJudicialAuth, handleFetchJDocToField, targetJid, activeToken, authRes, authData, fetchedContent, handleFetchJListInModal, handleDeidentify, modified, handleAnalyzeJudgment, match, handleSearchPrecedents, precedentList, handleGeneratePetition, selectedPrecedentsList, documentId, isVerifyingAi, setIsVerifyingAi, verifyNotice, setVerifyNotice, handleFullVerify, verifyRes, calculateDeadline, date, declDate, reasonDate, today, diffTime, daysLeft, deadlineInfo, handlePrint`;

const allVars = varsStr.split(',').map(s => s.trim()).filter(Boolean);
const activeVars = allVars.filter(v => {
  const regex = new RegExp(`\\b${v}\\b`);
  return regex.test(beforeSteps);
});

// We should also check for any missing imports, but we can just prepend.
const newContent = beforeSteps + `
      <AppealStep1 ctx={ctx} />
      <AppealStep2 ctx={ctx} />
      <AppealStep3 ctx={ctx} />
      <AppealStep4 ctx={ctx} />
` + afterSteps;

// We need to insert `const ctx = { ... };` right before `return (`
const returnIndex = newContent.lastIndexOf('return (');
const ctxDecl = `
  const ctx = {
    ${activeVars.join(',\n    ')}
  };
  `;

let finalContent = newContent.slice(0, returnIndex) + ctxDecl + newContent.slice(returnIndex);

const importsToAdd = `
import { AppealStep1 } from './appeal/AppealStep1';
import { AppealStep2 } from './appeal/AppealStep2';
import { AppealStep3 } from './appeal/AppealStep3';
import { AppealStep4 } from './appeal/AppealStep4';
`;

// Insert after the last import
const lastImportIndex = finalContent.lastIndexOf('import ');
const nextLine = finalContent.indexOf('\n', lastImportIndex);
finalContent = finalContent.slice(0, nextLine + 1) + importsToAdd + finalContent.slice(nextLine + 1);

fs.writeFileSync('src/components/SmartAppealAssistant.tsx', finalContent);
