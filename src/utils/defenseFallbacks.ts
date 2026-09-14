import { DefenseTriageResult, MineScanResult } from '../types';

export function buildFallbackDefenseTriage(
  clientInput: string,
  caseType: string = 'civil',
  courtName: string = '臺灣臺北地方法院',
  caseNo: string = '113年度訴字第1234號'
): DefenseTriageResult {
  // Check if input has concrete clues like numbers, dates, invoices, bank, line, etc.
  const hasNumbers = /\d{2,}/.test(clientInput);
  const hasEvidenceKeywords = /匯款|對話|發票|簽名|照片|監視|合約|單據|存摺|LINE|證人|錄音|轉帳|借據/i.test(clientInput);
  const isEmotionalOnly = /生氣|黑心|法官不公|騙子|氣死|太扯|沒良心|天理不容|垃圾/i.test(clientInput) && !hasEvidenceKeywords;

  const decision = (hasEvidenceKeywords || (hasNumbers && !isEmotionalOnly)) 
    ? 'TRACK_1_FACTS' 
    : 'PHASE_2_COMMUNICATION';

  return {
    decision,
    confidenceScore: decision === 'TRACK_1_FACTS' ? 88 : 82,
    decisionReason: decision === 'TRACK_1_FACTS'
      ? '當事人陳述中包含具體之金流、通訊對話、單據或客觀時點線索，具備提煉為實體抗辯事實與待證清單之高度實益。'
      : '當事人陳述目前多偏向主觀推論、情緒表達或空泛爭執，缺少具體單據與客觀人事時地物，建議先啟動 Phase 2 溝通話術與 7 大問卷引導補強。',
    summaryOverview: clientInput.slice(0, 150) + (clientInput.length > 150 ? '...' : ''),
    concreteFacts: [
      {
        id: 'f1',
        category: 'DOCUMENT',
        factDescription: '當事人所提及之相關金流明細、對話紀錄或履約文件線索',
        involvedParties: '兩造當事人及相關承辦人員',
        timeframe: '爭端發生期間',
        location: '雙方約定履約地點或通訊軟體',
        evidenceClues: '銀行轉帳流水號、LINE通訊截圖、簽收單據',
        pendingProof: '證明雙方真實法律關係及履行進度，反駁對造片面主張',
        strategicValue: 'HIGH'
      },
      {
        id: 'f2',
        category: 'ACTION',
        factDescription: '當事人間之口頭約定或事後異議通知流程',
        involvedParties: '當事人與對造窗口',
        timeframe: '發現瑕疵或爭議當日',
        location: '電話或通訊紀錄',
        evidenceClues: '通話紀錄、現場照片、催告訊息',
        pendingProof: '證明已及時提出異議，且未承認對造所主張之債權',
        strategicValue: 'MEDIUM'
      }
    ],
    unfruitfulPoints: [
      {
        id: 'u1',
        point: '對造為人不老實、誠信破產，其所言均屬謊言',
        issueType: 'EMOTIONAL_VENT',
        whyUnfruitful: '民事審判採證據裁判原則（民訴§222），法官僅就具體客觀事證審查，道德人身攻擊無法形成有利心證。',
        judgePerspectiveRisk: '易使法官認為我方缺乏實質反證而流於情緒指責，降低書狀專業信服力。'
      },
      {
        id: 'u2',
        point: '引用多條法條強調對方行為違背誠信與正義',
        issueType: 'LEGAL_COPYPASTE',
        whyUnfruitful: '缺乏具體事實驗證之空泛法理拼貼，實務上會被視為欠缺實質爭點攻防。',
        judgePerspectiveRisk: '模糊真正關鍵爭點，浪費法官閱狀時間。'
      }
    ],
    section1EvidenceRiskAssessment: `【一、關鍵證據評估與訴訟風險說明】
您好，針對您剛才傳送的案件說明與筆記，我們非常理解您面對此案時所承受的委屈與憤慨。
然而在法院實務審判中，法官每天審理數十件案子，極度重視「客觀物證（如銀行流水、LINE對話、簽單合約）」與「法律要件事實」。若我們在書狀中僅著重於情緒描述或指責對造道德不彰，法官非但無法採為判決依據，更可能模糊我方原本有利的事實焦點。

目前本案的核心風險在於：對造已提出片面主張，若我方未能提出具體反證及精確時點紀錄，法院將依舉證責任分配原則做出對我方不利之認定。因此，我們必須將戰場拉回客觀證據的建立。`,
    section2LawyerAdvice: `【二、律師建議之訴訟方向】
1. 【鎖定爭點抗辯】：主攻雙方並未達成對造所主張之合意，並抗辯其請求權要件不符。
2. 【補強客觀證據鏈】：透過您提供之金流轉帳憑證與通訊紀錄，精確還原交易當下之真實脈絡。
3. 【聲請調查證據】：向有關金融機構或電信公司函調原始資料，以第三方法人紀錄擊破對造不實陳述。`,
    section3Questionnaire: [
      {
        qId: 1,
        title: "金流與交付明細核對",
        question: "針對對造所主張之款項，您是否有當時雙方的轉帳明細、存摺內頁或現場簽收單？",
        targetFact: "釐清款項交付之性質與確切時間點",
        guideNote: "請翻查網銀或存摺，提供轉帳日期、金額及帳號後五碼截圖。",
        suggestedAttachment: "存摺影本、網銀交易明細 PDF"
      },
      {
        qId: 2,
        title: "通訊對話紀錄與關鍵時點",
        question: "在爭議發生前後 3 日內，雙方是否有 LINE、微信、簡訊或 Email 對話？",
        targetFact: "證明雙方當時之真實約定與催告狀況",
        guideNote: "請匯出完整對話紀錄文字檔及關鍵截圖，包含頂部時間與雙方姓名。",
        suggestedAttachment: "LINE 完整對話截圖（需包含日期時間）"
      },
      {
        qId: 3,
        title: "現場在場證人與客觀目擊",
        question: "雙方洽談或事發當時，現場是否有其他非親屬第三人在場聽聞？",
        targetFact: "以客觀人證補強自由心證",
        guideNote: "請提供證人全名、聯絡方式及當時所見所聞之簡要筆記。",
        suggestedAttachment: "證人基本資料與聯絡電話"
      },
      {
        qId: 4,
        title: "書面契約、報價單與驗收簽名",
        question: "雙方是否曾簽署任何估價單、確認單、發票或交貨驗收紀錄？",
        targetFact: "確認契約成立與履行進度",
        guideNote: "任何有對方簽字或蓋章之紙本皆具關鍵效力。",
        suggestedAttachment: "紙本文件彩色掃描檔"
      },
      {
        qId: 5,
        title: "異議與瑕疵通知時點",
        question: "發現問題後，您第一次向對方提出抗議或要求修改的具體日期為何？透過何種方式？",
        targetFact: "證明已在民法規定期限內即時通知，避免權利失效",
        guideNote: "請翻找當時的發文日期、存證信函掛號收件回執或訊息時間。",
        suggestedAttachment: "存證信函回執、發信寄送紀錄"
      },
      {
        qId: 6,
        title: "對造主張之不實事實具體反駁",
        question: "對造書狀中哪一個具體段落（人事時地）與真實情況完全相反？有何反證？",
        targetFact: "針對對造不實指控進行精準打擊",
        guideNote: "請列出對造段落，並逐一對照我方所持有的反向證據。",
        suggestedAttachment: "對比照片、定位紀錄或出勤打卡紀錄"
      },
      {
        qId: 7,
        title: "主管機關或公部門相關紀錄",
        question: "本案是否曾向消保官、調解委員會、勞工局、派出所或建管處報案或申請調解？",
        targetFact: "調取公務機關之公文書作為無可爭辯之客觀證據",
        guideNote: "請提供報案三聯單號、調解不成立證明書或行政裁處公文案號。",
        suggestedAttachment: "調解紀錄、報案證明、公文影本"
      }
    ],
    isFallback: true
  };
}
export function buildFallbackMineScan(clientInput: string): MineScanResult {
  const mines: any[] = [];
  
  // Rule 1: Check for money/debt receipt admission
  if (/我確實有收到|我有拿錢|錢確實有進我戶頭|有拿去用|他有匯給我/i.test(clientInput)) {
    mines.push({
      id: 'm1',
      mineType: 'DEBT_OR_PAYMENT_ADMISSION',
      mineName: '誤認債務成立/未抗辯即認收受款項',
      riskLevel: 'FATAL_ADMISSION',
      triggerQuote: '陳述中涉及「確實有收到款項 / 錢有進戶頭」等語',
      legalTrap: '依民事訴訟法第279條自認規定，一旦承認收受款項，對造即免除交付金錢之舉證責任，轉由我方承擔舉證該款項非借款之極重舉證負擔。',
      articleBasis: '民事訴訟法第 279 條第 1 項、民法第 474 條',
      potentialConsequence: '法官可能直接認定消費借貸交付事實成立，造成敗訴極高風險。',
      modificationSuggestion: '應改為：「對造雖曾有款項匯入，然該款項實係兩造過往業務往來之代墊結算，兩造間從未有成立消費借貸之合意。」'
    });
  }

  // Rule 2: Check for prescription waiver / late repayment promise
  if (/不是不還|等我有錢|晚點再還|去年就說過要處理|手頭緊/i.test(clientInput)) {
    mines.push({
      id: 'm2',
      mineType: 'PRESCRIPTION_WAIVER_ADMISSION',
      mineName: '時效完成前/後之無保留債務承認',
      riskLevel: 'FATAL_ADMISSION',
      triggerQuote: '陳述中涉及「不是不還 / 晚點還 / 等有錢再處理」等語',
      legalTrap: '依民法第129條第1項第2款，對債務為承認將造成消滅時效中斷；若時效已完成，更構成拋棄時效利益，使我方喪失時效抗辯權。',
      articleBasis: '民法第 129 條、第 144 條',
      potentialConsequence: '徹底喪失時效抗辯防線，即使對造債權已逾 5 年或 15 年，法官仍得判令全額給付。',
      modificationSuggestion: '應刪除任何關於未來償還之承諾，純粹就兩造債權債務是否存在與結算爭點進行抗辯。'
    });
  }

  // Rule 3: Check for signature / seal admission
  if (/名字是我簽的|簽名是真的|印章是我蓋的/i.test(clientInput)) {
    mines.push({
      id: 'm3',
      mineType: 'EXECUTION_OR_SIGNATURE_GENUINE',
      mineName: '逕認私文書簽名/印章真正',
      riskLevel: 'HIGH_RISK',
      triggerQuote: '陳述中提及「簽名確實是我簽的 / 印章是我蓋的」等語',
      legalTrap: '依民事訴訟法第358條第1項，私文書經本人簽名蓋章者推定為真正。一旦承認簽名真正，即推定整份文件實質成立。',
      articleBasis: '民事訴訟法第 358 條第 1 項',
      potentialConsequence: '抗辯文件內容遭變造或被詐欺簽署之舉證門檻將大幅提高。',
      modificationSuggestion: '應陳述：「該私文書簽署時之情境與內容存在爭議，且該文書之實質作成並未具備兩造真實合意。」'
    });
  }

  // Fallback default warning if no specific keywords matched
  if (mines.length === 0) {
    mines.push({
      id: 'm_general',
      mineType: 'DUTY_OR_BREACH_ADMISSION',
      mineName: '審慎檢視過失或違約責任表述',
      riskLevel: 'TACTICAL_DEFECT',
      triggerQuote: clientInput.slice(0, 40) + '...',
      legalTrap: '未經律師防禦修飾之個人意見，容易在字裡行間無意中自認不利於己的行為細節或知悉時點。',
      articleBasis: '民事訴訟法第 279 條',
      potentialConsequence: '法官可能將非必要之情緒描述解讀為對部分不利事實之不爭執。',
      modificationSuggestion: '建議保留當事人情感與事實核心，但剔除任何可能被曲解為承認違約之字句。'
    });
  }

  return {
    hasFatalMines: mines.some(m => m.riskLevel === 'FATAL_ADMISSION'),
    totalMinesCount: mines.length,
    overallRiskSummary: mines.some(m => m.riskLevel === 'FATAL_ADMISSION')
      ? '【🔴 發現致命自認地雷！】陳述中包含對款項收受、債務承認或文書簽署之不利自認，若直接陳報法院將直接免除對造舉證責任，導致極高敗訴風險！'
      : '【🟡 偵測到常規法律風險】陳述中尚無直接致命自認，但部分文句偏向主觀推論，建議經安全修飾後再行陳報。',
    mines,
    cleanedTextSuggestion: clientInput
      .replace(/我確實有收到[^，。]+[，。]?/g, '對造雖有匯款，然實為過往代墊結算，非借貸。')
      .replace(/不是不還[^，。]+[，。]?/g, '雙方債權債務尚未依法結算釐清。'),
    isFallback: true
  };
}
