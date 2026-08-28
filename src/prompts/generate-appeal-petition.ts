export function getGenerateAppealPetitionPrompt(body: any): string {
  const {
    caseType,
    courtName,
    appealCourtName,
    caseNo,
    sectionCode,
    claimAmount,
    claims,
    appellantName,
    appellantRole,
    appellantId,
    appellantAddress,
    appellantPhone,
    appellantLegalRep,
    appelleeName,
    appelleeRole,
    appelleeAddress,
    deliveryAgent,
    deliveryAddress,
    judgmentDeliveryDate,
    issues,
    evidences,
    selectedPrecedents
  } = body;

  let petitionTitle = "民事上訴理由狀";
  let proceduralLawRef = "依民事訴訟法第 441 條規定";

  if (caseType === "criminal") {
    petitionTitle = "刑事上訴理由狀";
    proceduralLawRef = "依刑事訴訟法第 361 條規定";
  } else if (caseType === "administrative") {
    petitionTitle = "行政訴訟上訴狀（兼上訴理由狀）";
    proceduralLawRef = "依行政訴訟法第 244 條規定";
  } else if (caseType === "criminal_compensation") {
    petitionTitle = "刑事補償覆審聲請狀";
    proceduralLawRef = "依刑事補償法第 17 條第 1 項規定";
  }

  const formattedIssues = Array.isArray(issues) && issues.length > 0
    ? issues.map((item: any, idx: number) => {
        const strengthLabel = item.legalStrength === 'NEED_SUPPLEMENT' 
          ? '【⚠️ 需補充證據爭點】（請於書狀中指摘原審事實認定證據不足，並結合聲請調查證據表請求法院調查）' 
          : '【🎯 重點攻擊爭點】（請於書狀中重點深入論述，引用權威判例/實務見解精準打擊）';
        return `（${idx + 1}）爭點【${item.title || `爭點 ${idx + 1}`}】 ${strengthLabel}：
- 原審認定指摘：${item.originalHolding || "未審酌相關事證"}
- 我方上訴攻擊理由：${item.appealArgument || "認定顯有違背經驗法則與論理法則"}
- 對應證據編號：${item.relatedEvidenceCodes || "詳如聲請調查證據表"}
- 援引法條/判解依據：${item.legalBasis || "訴訟法相關規定"}`;
      }).join("\n")
    : "（無特定爭點，請全盤指摘原審判決違背法令與認定瑕疵）";

  const formattedEvidences = Array.isArray(evidences) && evidences.length > 0
    ? evidences.map((item: any, idx: number) => `調查證據聲請第【${item.code || item.index || idx + 1}】項：
- 所涉爭點：${item.relatedIssue || item.relatedIssueTitle || "本案事實認定"}
- 調查事項：${item.investigationItem || item.method || "訊問證人/函調資料"}
- 調查對象：${item.investigationTarget || item.target || "詳卷/機關單位"}
- 對象地址及聯絡方式：${item.targetAddress || item.holder || "詳卷內通訊錄"}
- 待證事實（限50字）：${item.provenFact || "證明本案關鍵事實"}`).join("\n")
    : "（證物一：原裁判書影本乙份）";

  const formattedPrecedents = Array.isArray(selectedPrecedents) && selectedPrecedents.length > 0
    ? selectedPrecedents.map((item: any, idx: number) => `【援引權威見解 ${idx + 1}】：${item.citation || "最高法院判決"}
- 要旨與核心理由：${item.summary || ""}
- 運用於本案：${item.applicationReason || ""}`).join("\n")
    : "（請依通用實務見解論證）";

  return `你是一位精通台灣訴訟實務與司法院標準書狀規範之資深律師。請為當事人撰寫一份 100% 完全符合司法院官方訴訟書狀範例規格（參考司法院 lp-1370-1-xCat2-21 書狀範例專區標準）之正式 ${petitionTitle}。

【必須 100% 嚴格遵守之司法院官方訴訟書狀格式與法律公文規範】：

一、狀頭標題（置中粗體）：
   頁首正中間標示正式書狀名稱「${petitionTitle}」。

二、案號與股別標註（右上角）：
   - 案號：${caseNo || "○○年度○○字第○○號"}
   - 股別：${sectionCode || "○股"}
   ${caseType === 'criminal_compensation' ? `- 案由：刑事補償事件` : caseType !== 'criminal' ? `- 訴訟標的金額：${claimAmount || "新臺幣 ○○○○ 元"}` : `- 案由：${claims || "○○事件"}`}

三、當事人完整表格欄（必須完整條列，符合司法院標準格式）：
   - ${appellantRole || (caseType === 'criminal_compensation' ? "補償請求人" : "上訴人")}（即原告/被告/受判決人）：${appellantName || "○○○"}
     身分證字號/統編：${appellantId || "詳卷"}
     性別/出生年月日：詳卷
     住居所/戶籍地：${appellantAddress || "詳卷"}
     送達處所/電話：${appellantPhone || "詳卷"}
     ${appellantLegalRep ? `法定代理人：${appellantLegalRep}` : ''}
   - ${appelleeRole || (caseType === 'criminal_compensation' ? "原決定機關" : "被上訴人")}：${appelleeName || (caseType === 'criminal_compensation' ? courtName : "○○○")}
     ${caseType !== 'criminal_compensation' ? `住居所/機關所在地：${appelleeAddress || "詳卷"}` : ''}
   ${deliveryAgent ? `- 送達代收人：${deliveryAgent}，送達處所：${deliveryAddress || appellantAddress}` : ''}

四、案由與前言（開宗明義）：
   ${caseType === 'criminal_compensation'
     ? `為不服 ${courtName || "原決定機關"} 民國 ○○ 年 ○ 月 ○ 日宣辦之 ${caseNo || "○○年度刑補字第○○號"} 刑事補償決定，於法定 20 日不變期間內，${proceduralLawRef}，依法聲請覆審事：`
     : `為不服 ${courtName || "臺灣○○地方法院"} 民國 ○○ 年 ○ 月 ○ 日宣判之 ${caseNo || "○○年度○○字第○○號"} 第一審判決，於法定 20 日不變期間內，${proceduralLawRef}，依法提起上訴事：`
   }

五、訴之聲明（或上訴之聲明 / 覆審聲明）：
   ${caseType === 'criminal_compensation'
     ? `一、原決定關於准予補償每日折算金額過低部分廢棄。\n二、上開廢棄部分，請准予改按每日新臺幣 5,000 元或適當高額折算補償。`
     : `一、原判決廢棄。\n二、${claims || "上開廢棄部分，被上訴人在第一審之訴及假執行之聲請均駁回。"}\n三、第一、二審訴訟費用由被上訴人負擔。`
   }

六、事實及理由（訴訟攻防核心——三位一體扣合）：
   （一）程序事項（上訴合法性）：
         具狀人於民國 ${judgmentDeliveryDate || "○○年○月○日"} 收受原裁判/決定書，扣除在途期間，於法定 20 日不變期間內依法提出，程序完全合法，合先敘明。
   （二）實體上訴理由（爭點剖析與指摘原審瑕疵）：
         請將以下爭點，逐一結合【原審認定瑕疵】+【我方客觀證據】+【權威實務見解/函釋背書】，嚴密論述：
${formattedIssues}
   （三）援引權威實務見解背書（憲法法庭判決/最高法院/大法庭/高等法院座談會/主管機關函釋）：
${formattedPrecedents}

七、證據名稱及件數（聲請調查證據表，完全依司法院書狀附件格式）：
${formattedEvidences}

八、狀尾送達機關轉呈與簽章欄（標準公文結尾）：
   此致
   ${courtName || "原決定機關"} 轉呈
   ${appealCourtName || (caseType === 'criminal_compensation' ? "司法院刑事補償法庭" : "臺灣高等法院")} 公鑒

   附繳證物名稱及件數：${Array.isArray(evidences) && evidences.length > 0 ? evidences.map((e: any) => `${e.code || '證物'}（影本）乙份`).join('、') : '證物一（影本）乙份'}

   具狀人：${appellantName || "○○○"} （簽名蓋章）
   撰狀人/訴訟代理人：○○○ 律師 （簽名蓋章）

   中華民國 ○○○ 年 ○ 月 ○ 日

請直接輸出極度嚴謹、無任何贅言、100% 完全符合司法院官方書狀規範格式之正式全文內容。`;
}
