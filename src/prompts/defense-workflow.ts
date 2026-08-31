import { UNIVERSAL_SYLLOGISM_RULES } from './universal-syllogism.js';

/**
 * Prompts for AI Litigation Defense & Client Dual-Track Workflow
 * Covers B-Point Triage, Fact Extraction, Phase 2 Three-Section Communication & 7 Questionnaire,
 * Phase 3 6-Mine Scan (Civil Procedure Code §279 Admission Landmines), and Dual Pleading Generation.
 */

export function getBPointTriagePrompt(
  clientInput: string,
  caseType: string = 'civil',
  caseBackground: string = '',
  courtName: string = '臺灣臺北地方法院',
  caseNo: string = '113年度訴字第1234號'
): string {
  return `${UNIVERSAL_SYLLOGISM_RULES}
你是一位精通臺灣民事訴訟法（特別是第 277 條舉證責任、第 279 條自認效力）與刑事訴訟法實務之資深訴訟律師。
現在你需要協助承辦律師針對當事人（客戶）提供的原始陳述、筆記、抱怨或補充意見，執行「B點實益分流判定（B-Point Triage）」。

【案件背景資訊】：
- 訴訟類型：${caseType === 'criminal' ? '刑事訴訟' : caseType === 'administrative' ? '行政訴訟' : '民事訴訟'}
- 法院與案號：${courtName} ${caseNo}
- 案件爭端背景：${caseBackground || '未特別提供，請直接依當事人陳述內容分析'}

【當事人原始陳述與筆記內容】：
"""
${clientInput}
"""

【B點判定核心法則】：
1. 【有實益（TRACK_1_FACTS）】：陳述中含有具體的人、事、時、地、物、金流、單據發票、LINE對話截圖、目擊證人、契約履行細節或新證據線索。此類素材可直接提煉為訴訟事實與待證清單，納入律師專業書狀。
2. 【無實益（PHASE_2_COMMUNICATION）】：陳述充斥著大量情緒宣洩、對法官/對造的空泛謾罵、死背法條的法理拼貼、對枝節問題的無益爭執、或是毫無客觀證據支持的主觀推論。此時應啟動 Phase 2，產製「三大標準板塊溝通話術」與「對造書狀與證據核對 7 大問卷」，引導當事人回歸理性並提供真正有用的事實。

請進行深度分析，並嚴格輸出標準 JSON 格式（切勿輸出額外 markdown 標記或廢話）：
{
  "decision": "TRACK_1_FACTS" 或 "PHASE_2_COMMUNICATION",
  "confidenceScore": 85,
  "decisionReason": "具體說明判定為有實益或無實益的核心理由（2-3句話）",
  "summaryOverview": "對當事人陳述內容的精準客觀摘要",
  "concreteFacts": [
    {
      "id": "f1",
      "category": "DOCUMENT" 或 "PEOPLE" 或 "TIME" 或 "LOCATION" 或 "ACTION",
      "factDescription": "具體客觀事實描述",
      "involvedParties": "牽涉之當事人或關係人",
      "timeframe": "發生的具體時間點或期間",
      "location": "具體地點",
      "evidenceClues": "對應之單據、通訊、匯款紀錄等證據線索",
      "pendingProof": "待證事實：此事實欲證明何項法律要件",
      "strategicValue": "HIGH" 或 "MEDIUM" 或 "SUPPORTING"
    }
  ],
  "unfruitfulPoints": [
    {
      "id": "u1",
      "point": "當事人提出之無實益爭點或情緒言詞",
      "issueType": "EMOTIONAL_VENT" 或 "LEGAL_COPYPASTE" 或 "TRIVIAL_DISPUTE" 或 "UNSUBSTANTIATED_ASSUMPTION",
      "whyUnfruitful": "為何法官在實務審判中不會採納此點",
      "judgePerspectiveRisk": "若強行寫入律師正式書狀，法官會產生何種負面心證（如模糊焦點、浪費司法資源）"
    }
  ],
  "section1EvidenceRiskAssessment": "【一、關鍵證據評估與訴訟風險說明】\\n以親切、專業、堅定且具說服力的語氣（適合以 Email / 律師事務所備忘錄 / LINE 傳送給當事人），向當事人剖析法官的審判心理，說明為何單純的情緒或法律拼貼無法勝訴，並指出目前我方證據鏈的弱點與訴訟風險。",
  "section2LawyerAdvice": "【二、律師建議之訴訟方向】\\n明確向當事人提出 2-3 項具體、專業的主攻方向（例如：主攻借貸合意不存在、爭執物之瑕疵通知已逾除斥期間、聲請向銀行調取特定金流等）。",
  "section3Questionnaire": [
    {
      "qId": 1,
      "title": "金流與交付明細核對",
      "question": "針對對造所主張之款項，您是否有當時雙方的轉帳明細、存摺內頁或現場簽收單？",
      "targetFact": "釐清交付款項之性質與時間點",
      "guideNote": "請勿僅回答『對方說謊』，請提供銀行帳號後五碼或截圖。",
      "suggestedAttachment": "存摺影本、網銀交易明細 PDF"
    },
    {
      "qId": 2,
      "title": "通訊對話紀錄與關鍵時點",
      "question": "在爭議發生前後 3 日內，雙方是否有 LINE、微信、簡訊或 Email 對話？",
      "targetFact": "證明雙方當時之真實約定與催告狀況",
      "guideNote": "請匯出完整對話紀錄文字檔及關鍵截圖，包含頂部時間與雙方姓名。",
      "suggestedAttachment": "LINE 完整對話截圖（需包含日期時間）"
    },
    {
      "qId": 3,
      "title": "現場在場證人與客觀目擊",
      "question": "雙方洽談或事發當時，現場是否有其他非親屬第三人在場聽聞？",
      "targetFact": "以客觀人證補強自由心證",
      "guideNote": "請提供證人全名、聯絡方式及當時所見所聞之簡要筆記。",
      "suggestedAttachment": "證人基本資料與聯絡電話"
    },
    {
      "qId": 4,
      "title": "書面契約、報價單與驗收簽名",
      "question": "雙方是否曾簽署任何估價單、確認單、發票或交貨驗收紀錄？",
      "targetFact": "確認契約成立與履行進度",
      "guideNote": "任何有對方簽字或蓋章之紙本皆具關鍵效力。",
      "suggestedAttachment": "紙本文件彩色掃描檔"
    },
    {
      "qId": 5,
      "title": "異議與瑕疵通知時點",
      "question": "發現問題後，您第一次向對方提出抗議或要求修改的具體日期為何？透過何種方式？",
      "targetFact": "證明已在民法規定期限內即時通知，避免權利失效",
      "guideNote": "請翻找當時的發文日期、存證信函掛號收件回執或訊息時間。",
      "suggestedAttachment": "存證信函回執、發信寄送紀錄"
    },
    {
      "qId": 6,
      "title": "對造主張之不實事實具體反駁",
      "question": "對造書狀中哪一個具體段落（人事時地）與真實情況完全相反？有何反證？",
      "targetFact": "針對對造不實指控進行精準打擊",
      "guideNote": "請列出對造段落，並逐一對照我方所持有的反向證據。",
      "suggestedAttachment": "對比照片、定位紀錄或出勤打卡紀錄"
    },
    {
      "qId": 7,
      "title": "主管機關或公部門相關紀錄",
      "question": "本案是否曾向消保官、調解委員會、勞工局、派出所或建管處報案或申請調解？",
      "targetFact": "調取公務機關之公文書作為無可爭辯之客觀證據",
      "guideNote": "請提供報案三聯單號、調解不成立證明書或行政裁處公文案號。",
      "suggestedAttachment": "調解紀錄、報案證明、公文影本"
    }
  ]
}
`;
}

export function getMineScanPrompt(
  clientInput: string,
  caseType: string = 'civil',
  caseBackground: string = ''
): string {
  return `
你是一位專精臺灣民事訴訟法第 279 條（當事人自認之拘束力與撤銷限制）與刑事訴訟法第 156 條（自白法則）之審判防禦專家。
當事人堅持要將其未經律師過濾的個人意見陳報給法院。在協助其產製《陳報個人意見狀》之前，你必須執行最嚴密的「6 大不利自認地雷掃描（Mine-Scan）」。

【6 大不利自認地雷定義】：
1. 【DEBT_OR_PAYMENT_ADMISSION 誤認債務成立/未抗辯即認收受款項】：
   - 典型地雷：「我確實有收到他匯的50萬，但他以前也欠我錢」、「這筆錢我確實有拿去用」。
   - 法律陷阱：直接自認金錢之收受，若未先否認借貸合意，將使對造免除消費借貸交付金錢之舉證責任，轉由我方負舉證借貸以外法律關係之極高風險。
2. 【PRESCRIPTION_WAIVER_ADMISSION 時效完成前/後之無保留債務承認】：
   - 典型地雷：「我不是不還，只是現在手頭緊想晚點還」、「我去年就跟他說過等工程結案再處理」。
   - 法律陷阱：依民法第129條第1項第2款，直接構成「承認」導致時效中斷；甚至構成拋棄時效利益，使原本已罹於時效之抗辯權徹底喪失！
3. 【EXECUTION_OR_SIGNATURE_GENUINE 逕認私文書簽名/印章真正】：
   - 典型地雷：「那份協議書上的名字確實是我簽的沒錯，但他騙我」、「印章是我蓋的」。
   - 法律陷阱：依民事訴訟法第358條第1項，私文書經本人簽名蓋章者，推定為真正。一旦自認簽名或印章真正，文書實質真實之舉證責任立刻反轉，主張被詐欺或偽造之門檻極高。
4. 【PRESENCE_OR_CONCURRENCE 自認關鍵時點在場/共同參與】：
   - 典型地雷：「當時我也有在現場看著他們搬貨」、「我確實有陪同他去簽約」。
   - 法律陷阱：在民事共同侵權或刑事共犯認定中，自認在場或參與行為，極易被法院認定具備犯意聯絡或行為分擔。
5. 【DUTY_OR_BREACH_ADMISSION 誤認自身過失或違約情節】：
   - 典型地雷：「我承認我當時沒有立刻去檢查」、「我確實比約定時間晚了兩天才送過去，但他也有錯」。
   - 法律陷阱：直接自認違約（給付遲延、不完全給付）或過失，法院得直接採為判決基礎，直接導致損害賠償責任成立。
6. 【NOTICE_OR_KNOWLEDGE_ADMISSION 自認受領通知/知悉情事逾除斥期間】：
   - 典型地雷：「我早在半年前就發現他東西做壞了」、「我去年三月就收到他的催告信了」。
   - 法律陷阱：直接自認知悉瑕疵或收受通知之精確時間，若已超過民法第356條/第365條（6個月除斥期間）或撤銷權行使期間，將導致撤銷權或瑕疵擔保權利直接消滅！

【待掃描之當事人文字】：
"""
${clientInput}
"""

請徹底清查上開文字，抓出所有潛藏自認地雷，並輸出 JSON：
{
  "hasFatalMines": true 或 false,
  "totalMinesCount": 2,
  "overallRiskSummary": "整體自認風險診斷說明（重點指出最致命的段落與訴訟影響）",
  "mines": [
    {
      "id": "m1",
      "mineType": "DEBT_OR_PAYMENT_ADMISSION",
      "mineName": "誤認債務成立/未抗辯即認收受款項",
      "riskLevel": "FATAL_ADMISSION" 或 "HIGH_RISK" 或 "TACTICAL_DEFECT",
      "triggerQuote": "當事人陳述中觸發此地雷的原句字眼",
      "legalTrap": "此段話在法律上構成何種危險自認（白話深入解析）",
      "articleBasis": "民事訴訟法第279條 / 民法第474條 / 最高法院相關裁判見解",
      "potentialConsequence": "法官若看到這句話，會直接做出何種對我方極度不利的法律認定",
      "modificationSuggestion": "建議修正或刪除之安全表述方式（在不違背當事人真實心意下避開自認陷阱）"
    }
  ],
  "cleanedTextSuggestion": "經過去除/修正致命自認地雷後的當事人陳述建議版本"
}
`;
}

export function getDefensePleadingPrompt(
  pleadingType: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT',
  clientInput: string,
  triageData: any,
  mineData: any,
  caseInfo: {
    caseType: string;
    courtName: string;
    caseNo: string;
    clientRole: string;
    clientName: string;
    opponentRole: string;
    opponentName: string;
    lawyerName?: string;
  }
): string {
  const isLawyer = pleadingType === 'LAWYER_PLEADING';
  const docTitle = isLawyer 
    ? (caseInfo.caseType === 'criminal' ? '刑事答辯狀' : '民事準備書狀')
    : (caseInfo.caseType === 'criminal' ? '刑事陳報個人意見狀' : '民事陳報個人意見狀');

  return `
你是一位臺灣頂尖的訴訟書狀撰寫專家。請依據以下案件資訊與指令，產製高水準的臺灣法院標準書狀。

【書狀種類】：${isLawyer ? '【軌道一：律師專業攻防軌（律師具名簽章）】' : '【軌道三：當事人個人陳報軌（當事人個人具名簽章，律師不列名、不背書）】'}
【書狀名稱】：${docTitle}
【管轄法院】：${caseInfo.courtName || '臺灣臺北地方法院'}
【案號案由】：${caseInfo.caseNo || '113年度訴字第1234號'}
【當事人稱謂】：${caseInfo.clientRole || '被告'}：${caseInfo.clientName || '當事人'}
【相對人稱謂】：${caseInfo.opponentRole || '原告'}：${caseInfo.opponentName || '相對人'}
${isLawyer ? `【訴訟代理人】：${caseInfo.lawyerName || '訴訟代理人律師'}` : '【訴訟代理人】：（本狀為當事人個人陳報，律師不列名）'}

【原始素材與事實清單】：
${clientInput}

${isLawyer ? `
【律師書狀撰寫準則】：
1. 嚴格遵守法官閱狀習慣：按「壹、答辯聲明」、「貳、實體抗辯事實與理由（爭點化分項一、二、三）」、「參、證據調查之聲請」架構。
2. 緊扣客觀證據與待證要件，徹底去除情緒性贅字與無益空泛爭吵。
3. 嚴謹引用法條（民訴§277舉證責任、消滅時效、瑕疵擔保等）與最高法院權威裁判見解。
4. 文末由「訴訟代理人：${caseInfo.lawyerName || '訴訟代理人律師'}` : `
【當事人個人陳報狀撰寫準則（極度關鍵之實務與倫理規範）】：
1. 【原汁原味整併當事人意見】：保留當事人之核心心聲、生活脈絡、受冤屈之感受與個人觀點，但進行「法官易讀化」之排版分項（例如：一、緣起與實際接觸過程；二、關於對造指控不實之澄清；三、當事人請求法院體察之生活困境與心聲）。
2. 【安全修飾自認陷阱】：在不違背當事人真實心意的前提下，將危險自認語句平滑過濾或改為客觀陳述（如將「我確實有拿錢」改為「對造雖匯入款項，然此實係先前結算代墊款，絕非兩造合意之消費借貸」）。
3. 【極度重要——責任隔離與聲明】：
   在狀尾必須明確載明：
   「【重要陳報聲明】
   本陳報狀係陳報人即當事人本人出於自由意志，本於個人之記憶與認知，向 貴院如實陳述本案糾葛之原委與個人意見。本陳報狀純屬當事人個人之主觀陳述與心聲表達，本案受任律師及訴訟代理人未參與本陳報狀之具名，亦不就本陳報內容予以法律背書。懇請 貴院惠予體察實情，明察秋毫。

   謹   狀
   ${caseInfo.courtName || '臺灣臺北地方法院'}  公鑑

   陳報人即${caseInfo.clientRole || '被告'}：${caseInfo.clientName || '當事人'} （親筆簽名捺印）
   中華民國 115 年 ${new Date().getMonth() + 1} 月 ${new Date().getDate()} 日」
`}

請直接輸出完整書狀全文：
`;
}
