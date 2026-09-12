export type FieldType = 'text' | 'textarea' | 'number' | 'checkbox';

export interface ToolFieldDef {
  key: string;
  label: string;
  type: FieldType;
  rows?: number;
  showAiSuggest?: boolean;
}

export const TOOL_FIELD_SCHEMAS: Record<string, ToolFieldDef[]> = {
  "JUDICIAL_CIVIL_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：民事起訴狀、民事答辯狀)", "type": "text", "showAiSuggest": true },
    { "key": "caseContext", "label": "案件事實與請求內容", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": true }
  ],
  "JUDICIAL_CRIMINAL_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：刑事告訴狀、刑事附帶民事訴訟起訴狀)", "type": "text", "showAiSuggest": true },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": true }
  ],
  "JUDICIAL_ADMIN_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：行政訴訟起訴狀、交通裁決起訴狀)", "type": "text", "showAiSuggest": true },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": true }
  ],
  "JUDICIAL_FAMILY_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：家事聲請狀-常態保護令、拋棄繼承)", "type": "text", "showAiSuggest": true },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": true }
  ],
  "JUDICIAL_EXECUTION_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：民事聲請強制執行狀、聲明異議狀)", "type": "text", "showAiSuggest": true },
    { "key": "caseContext", "label": "案件事實與執行標的說明", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "evidenceList", "label": "相關證據清單 (執行名義、財產清單)", "type": "textarea", "rows": 2, "showAiSuggest": true }
  ],
  "CRIMINAL_COMPLAINT_TRAFFIC": [
    {
      "key": "prosecutorOffice",
      "label": "受文地檢署",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "complainantName",
      "label": "告訴人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "complainantPhone",
      "label": "告訴人電話",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告（肇事者）姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDate",
      "label": "案發時間與交岔路口",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "車禍肇事情節與傷勢",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_FRAUD": [
    {
      "key": "complainantName",
      "label": "受騙被害人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "fraudAmount",
      "label": "受騙總金額（元）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "bankCode",
      "label": "受款人頭帳戶銀行及帳號",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "詐騙通訊軟體與假冒手法",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_DEFAMATION": [
    {
      "key": "complainantName",
      "label": "被害人（告訴人）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告（網路ID/真實姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "insultWords",
      "label": "侮辱言論與公開媒介",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT": [
    {
      "key": "prosecutorOffice",
      "label": "受文地檢署",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "complainantName",
      "label": "告訴人（被害人姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告（加害人/女友/伴侶）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "relationship",
      "label": "雙方關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDate",
      "label": "案發時間",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentLocation",
      "label": "案發地點",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "違反意願手段與具體案發過程",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    },
    {
      "key": "evidenceList",
      "label": "已掌握證據（驗傷單/通訊軟體自承紀錄/錄音等）",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "DOMESTIC_VIOLENCE_PROTECTION_ORDER": [
    {
      "key": "complainantName",
      "label": "聲請人（被害人姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "相對人（加害伴侶姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "relationship",
      "label": "伴侶關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "courtName",
      "label": "管轄地方法院",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "不法侵害事實與騷擾情節",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    },
    {
      "key": "requestedRelief",
      "label": "聲請命令項目",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "CIVIL_TORT_SEXUAL_ASSAULT": [
    {
      "key": "complainantName",
      "label": "原告（被害人）姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告（加害人）姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "claimTotalAmount",
      "label": "請求賠償總金額（元）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "courtName",
      "label": "管轄地方法院",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "injuryDetails",
      "label": "侵害情節與精神身心創傷事由",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_THEFT": [
    {
      "key": "prosecutorOffice",
      "label": "受文地檢署",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "complainantName",
      "label": "告訴人（被害人姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告（女友/伴侶/他人）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "relationship",
      "label": "雙方關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "stolenItems",
      "label": "失竊或遭侵占之物品與金額估計",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "案發時間、地點與手法事實經過",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    },
    {
      "key": "evidenceList",
      "label": "已掌握之證據清單",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_INTIMIDATION": [
    {
      "key": "prosecutorOffice",
      "label": "受文地檢署",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "complainantName",
      "label": "告訴人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "恐嚇威脅具體言論與情節",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_COMPLAINT_PRIVACY": [
    {
      "key": "complainantName",
      "label": "告訴人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "偷拍竊錄或未經同意散布情節",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CIVIL_TORT_GENERAL": [
    {
      "key": "complainantName",
      "label": "原告姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "被告姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "stolenItems",
      "label": "請求返還之標的物",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "claimTotalAmount",
      "label": "請求損害賠償金額（元）",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "UNIVERSAL_AI_PLEADING": [
    {
      "key": "complainantName",
      "label": "具狀人（我方姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "accusedName",
      "label": "相對人（對方/被告姓名）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "爭議具體經過與事實細節",
      "type": "textarea",
      "rows": 6,
      "showAiSuggest": true
    }
  ],
  "CRIMINAL_SUPPLEMENTARY_CIVIL": [
    {
      "key": "caseNo",
      "label": "刑事案號與股別",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "claimTotalAmount",
      "label": "請求總金額（元）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "medicalExpense",
      "label": "醫療費",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "workLoss",
      "label": "工作損失",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "solatium",
      "label": "精神慰撫金",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "INHERITANCE_CALCULATOR": [
    {
      "key": "deceasedName",
      "label": "被繼承人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "hasSpouse",
      "label": "是否有配偶",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "childrenCount",
      "label": "子女數",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "FORCED_SHARE_CALCULATOR": [
    {
      "key": "deceasedName",
      "label": "被繼承人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "hasSpouse",
      "label": "是否有配偶",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "childrenCount",
      "label": "子女數",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "SELF_WRITTEN_WILL": [
    {
      "key": "testatorName",
      "label": "立遺囑人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "idNo",
      "label": "身分證字號",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "realEstateAddress",
      "label": "指定分配不動產門牌/坐落地號",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "realEstateBeneficiary",
      "label": "指定繼承人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "executorName",
      "label": "指定遺囑執行人",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "WAIVER_OF_INHERITANCE": [
    {
      "key": "petitionerName",
      "label": "聲請人（拋棄人）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "deceasedName",
      "label": "被繼承人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "deathDate",
      "label": "被繼承人死亡日期",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "knowDate",
      "label": "知悉得繼承日期（起算3月）",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "DIVORCE_AGREEMENT": [
    {
      "key": "husbandName",
      "label": "夫方姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "wifeName",
      "label": "妻方姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "custodyParent",
      "label": "監護權歸屬（單獨/共同）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "childSupport",
      "label": "每月扶養費（元）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "特約條款與財產分配協議",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "GUARDIANSHIP_PETITION": [
    {
      "key": "wardName",
      "label": "委任人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "petitionerName",
      "label": "聲請人/受任人姓名及關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "cdrScore",
      "label": "失智醫療評估（CDR 分數）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "supervisorName",
      "label": "會同開具財產清冊人",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "ASSISTANCE_PETITION": [
    {
      "key": "wardName",
      "label": "委任人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "petitionerName",
      "label": "聲請人/受任人姓名及關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "cdrScore",
      "label": "失智醫療評估（CDR 分數）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "supervisorName",
      "label": "會同開具財產清冊人",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "CONTRACTUAL_GUARDIANSHIP": [
    {
      "key": "wardName",
      "label": "委任人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "petitionerName",
      "label": "聲請人/受任人姓名及關係",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "cdrScore",
      "label": "失智醫療評估（CDR 分數）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "supervisorName",
      "label": "會同開具財產清冊人",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "PROMISSORY_NOTE_RULING": [
    {
      "key": "creditorName",
      "label": "執票人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "發票人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtAmount",
      "label": "金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "interestRate",
      "label": "約定週年利率",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "noteDate",
      "label": "發票日",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "noteDueDate",
      "label": "到期日",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "PAYMENT_ORDER_PETITION": [
    {
      "key": "creditorName",
      "label": "債權人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "債務人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtAmount",
      "label": "金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "interestRate",
      "label": "利息起算日",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "請求原因事實",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "LOAN_AGREEMENT": [
    {
      "key": "creditorName",
      "label": "貸與人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "借用人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtAmount",
      "label": "借款金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "interestRate",
      "label": "約定利率",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "loanDate",
      "label": "借款日期",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "dueDate",
      "label": "還款期限",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "INTEREST_CALCULATOR": [
    {
      "key": "debtAmount",
      "label": "本金",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "interestRate",
      "label": "年利率",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "days",
      "label": "計息天數",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "EXECUTION_SALARY_ATTACHMENT": [
    {
      "key": "creditorName",
      "label": "債權人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "債務人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "employerName",
      "label": "任職公司全名（第三人扣繳義務人）",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "EXECUTION_BANK_REAL_ESTATE": [
    {
      "key": "creditorName",
      "label": "債權人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "債務人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "titleCaseNo",
      "label": "執行名義案號",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "PROVISIONAL_ATTACHMENT": [
    {
      "key": "creditorName",
      "label": "債權人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "debtorName",
      "label": "債務人姓名",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "titleCaseNo",
      "label": "執行名義案號",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "RESIDENTIAL_LEASE_CONTRACT": [
    {
      "key": "landlordName",
      "label": "房東（出租人）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "tenantName",
      "label": "房客（承租人）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "rentalAddress",
      "label": "租賃房屋門牌地址",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "depositAmount",
      "label": "押金金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "monthlyRent",
      "label": "每月租金",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "startDate",
      "label": "起租日",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "endDate",
      "label": "退租日",
      "type": "text",
      "showAiSuggest": true
    }
  ],
  "SPOUSAL_RIGHT_INFRINGEMENT": [
    {
      "key": "plaintiffName",
      "label": "原告（配偶）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "defendant1Name",
      "label": "被告一（侵權配偶）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "defendant2Name",
      "label": "被告二（第三者）",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "marriageDate",
      "label": "結婚日期",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "infringementStart",
      "label": "外遇發現日期",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "侵害配偶權具體情節",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    },
    {
      "key": "evidenceList",
      "label": "已掌握之證據",
      "type": "textarea",
      "rows": 3,
      "showAiSuggest": true
    }
  ],
  "DEMAND_LETTER_DEBT": [
    {
      "key": "senderName",
      "label": "寄件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "recipientName",
      "label": "收件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "amount",
      "label": "催告金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "催告事由經過",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "DEMAND_LETTER_DEFECT": [
    {
      "key": "senderName",
      "label": "寄件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "recipientName",
      "label": "收件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "amount",
      "label": "催告金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "催告事由經過",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "DEMAND_LETTER_LABOR": [
    {
      "key": "senderName",
      "label": "寄件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "recipientName",
      "label": "收件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "amount",
      "label": "催告金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "催告事由經過",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "DEMAND_LETTER_RENT_DEFAULT": [
    {
      "key": "senderName",
      "label": "寄件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "recipientName",
      "label": "收件人",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "amount",
      "label": "催告金額",
      "type": "text",
      "showAiSuggest": true
    },
    {
      "key": "incidentDetails",
      "label": "催告事由經過",
      "type": "textarea",
      "rows": 5,
      "showAiSuggest": true
    }
  ],
  "CHILD_CUSTODY_ASSESSMENT": [
    { "key": "childAge", "label": "子女年齡", "type": "number", "showAiSuggest": true },
    { "key": "primaryCaregiver", "label": "目前主要照顧者", "type": "text", "showAiSuggest": true },
    { "key": "livingEnvironment", "label": "居住與成長環境現況", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "supportSystem", "label": "家族親友支援系統", "type": "text", "showAiSuggest": true }
  ],
  "INHERITANCE_PORTION_CALCULATOR": [
    { "key": "estateTotal", "label": "遺產總額（元）", "type": "number", "showAiSuggest": true },
    { "key": "hasSpouse", "label": "是否有生存配偶", "type": "text", "showAiSuggest": true },
    { "key": "heirCount", "label": "該順位繼承人人數", "type": "number", "showAiSuggest": true },
    { "key": "details", "label": "遺產項目與親屬備註", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "CHILD_SUPPORT_CALCULATOR": [
    { "key": "region", "label": "居住縣市", "type": "text", "showAiSuggest": true },
    { "key": "childCount", "label": "子女總人數", "type": "number", "showAiSuggest": true },
    { "key": "payerIncome", "label": "給付方每月實質收入", "type": "number", "showAiSuggest": true },
    { "key": "receiverIncome", "label": "照顧方每月實質收入", "type": "number", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "扶養給付特別約定", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "RESIDUAL_PROPERTY_CALCULATOR": [
    { "key": "husbandAsset", "label": "夫現存婚後財產", "type": "number", "showAiSuggest": true },
    { "key": "husbandDebt", "label": "夫婚後債務", "type": "number", "showAiSuggest": true },
    { "key": "wifeAsset", "label": "妻現存婚後財產", "type": "number", "showAiSuggest": true },
    { "key": "wifeDebt", "label": "妻婚後債務", "type": "number", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "免計入財產說明（贈與、慰撫金等）", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "PROPERTY_VALUATION_ESTIMATOR": [
    { "key": "location", "label": "不動產坐落區域", "type": "text", "showAiSuggest": true },
    { "key": "areaPing", "label": "房屋建物坪數", "type": "number", "showAiSuggest": true },
    { "key": "unitPrice", "label": "每坪預估行情（萬元）", "type": "number", "showAiSuggest": true },
    { "key": "existingMortgage", "label": "尚餘房貸餘額（萬元）", "type": "number", "showAiSuggest": true }
  ],
  "DIVORCE_PROCEDURE_ASSESSMENT": [
    { "key": "marriageYears", "label": "婚姻存續年數", "type": "number", "showAiSuggest": true },
    { "key": "disputeReason", "label": "主要婚姻重大破綻事由", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "mediationWillingness", "label": "是否願意接受法院家事調解", "type": "text", "showAiSuggest": true }
  ],
  "VISITATION_PLAN_GENERATOR": [
    { "key": "childName", "label": "未成年子女姓名與年齡", "type": "text", "showAiSuggest": true },
    { "key": "regularVisitation", "label": "平日與隔週週末會面方式", "type": "text", "showAiSuggest": true },
    { "key": "holidayArrangement", "label": "寒暑假與農曆春節輪流方式", "type": "textarea", "rows": 4, "showAiSuggest": true },
    { "key": "handoverLocation", "label": "接送與會面地點", "type": "text", "showAiSuggest": true }
  ],
  "IOU_PROMISSORY_NOTE_GENERATOR": [
    { "key": "creditorName", "label": "貸與人／受款人（債權人）", "type": "text", "showAiSuggest": true },
    { "key": "debtorName", "label": "借用人／發票人（債務人）", "type": "text", "showAiSuggest": true },
    { "key": "loanAmount", "label": "借款／票面金額（元）", "type": "text", "showAiSuggest": true },
    { "key": "repaymentDate", "label": "約定還款／到期日", "type": "text", "showAiSuggest": true },
    { "key": "interestRate", "label": "約定週年利率（%）", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "借款交付方式與擔保說明", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "CIVIL_COMPLAINT_GENERAL": [
    { "key": "courtName", "label": "管轄地方法院", "type": "text", "showAiSuggest": true },
    { "key": "plaintiffName", "label": "原告姓名", "type": "text", "showAiSuggest": true },
    { "key": "defendantName", "label": "被告姓名", "type": "text", "showAiSuggest": true },
    { "key": "claimAmount", "label": "訴訟標的金額（元）", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "起訴請求事實與理由", "type": "textarea", "rows": 5, "showAiSuggest": true }
  ],
  "COURT_FEE_CALCULATOR": [
    { "key": "claimAmount", "label": "訴訟標的金額（元）", "type": "number", "showAiSuggest": true },
    { "key": "stage", "label": "訴訟審級或程序", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "案件類型備註", "type": "textarea", "rows": 3, "showAiSuggest": true }
  ],
  "DEBT_COLLECTION_SELECTOR": [
    { "key": "evidenceType", "label": "持有債權憑證（借據/本票/匯款紀錄）", "type": "text", "showAiSuggest": true },
    { "key": "debtAmount", "label": "欠款金額（元）", "type": "text", "showAiSuggest": true },
    { "key": "debtorAssetStatus", "label": "債務人名下財產現況概況", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "TRAFFIC_COMPENSATION_CALCULATOR": [
    { "key": "medicalExpenses", "label": "醫療實支費用（元）", "type": "number", "showAiSuggest": true },
    { "key": "workLoss", "label": "不能工作之薪資損失（元）", "type": "number", "showAiSuggest": true },
    { "key": "solatium", "label": "精神慰撫金請求額（元）", "type": "number", "showAiSuggest": true },
    { "key": "myFaultRatio", "label": "我方肇事責任比例（%）", "type": "number", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "肇事情節與各項求償單據清冊", "type": "textarea", "rows": 5, "showAiSuggest": true }
  ],
  "TRAFFIC_SETTLEMENT_GENERATOR": [
    { "key": "partyA", "label": "甲方（肇事人／給付人）姓名", "type": "text", "showAiSuggest": true },
    { "key": "partyB", "label": "乙方（受害人／受領人）姓名", "type": "text", "showAiSuggest": true },
    { "key": "settlementAmount", "label": "和解賠償總金額（元）", "type": "text", "showAiSuggest": true },
    { "key": "accidentSummary", "label": "事故時間地點與車號", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "撤回刑事告訴與拋棄請求權約定", "type": "textarea", "rows": 5, "showAiSuggest": true }
  ],
  "TRAFFIC_PROCEDURE_ASSESSMENT": [
    { "key": "injuryStatus", "label": "是否有受傷就醫", "type": "text", "showAiSuggest": true },
    { "key": "accidentDate", "label": "事故發生日期", "type": "text", "showAiSuggest": true },
    { "key": "analysisReportStatus", "label": "是否已申請初步分析研判表", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "雙方目前調解或談判爭議點", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "VEHICLE_VALUATION_ESTIMATOR": [
    { "key": "vehicleBrand", "label": "車輛廠牌與車型", "type": "text", "showAiSuggest": true },
    { "key": "vehicleAgeYears", "label": "出廠車齡（年）", "type": "number", "showAiSuggest": true },
    { "key": "partsCost", "label": "維修更換零件總額（元）", "type": "number", "showAiSuggest": true },
    { "key": "laborCost", "label": "板金烤漆工資（不折舊，元）", "type": "number", "showAiSuggest": true }
  ],
  "SEVERANCE_PAY_CALCULATOR": [
    { "key": "monthlySalary", "label": "月平均工資（元）", "type": "number", "showAiSuggest": true },
    { "key": "seniorityYears", "label": "工作年資（年）", "type": "number", "showAiSuggest": true },
    { "key": "unusedLeaveDays", "label": "未休特別休假日數", "type": "number", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "終止契約事由與特別約定", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ],
  "DEMAND_LETTER_GENERAL": [
    { "key": "senderName", "label": "寄件人姓名", "type": "text", "showAiSuggest": true },
    { "key": "recipientName", "label": "收件人姓名/公司", "type": "text", "showAiSuggest": true },
    { "key": "amount", "label": "催告/請求金額（元，無則填0）", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "存證催告事由與限期履行要求", "type": "textarea", "rows": 5, "showAiSuggest": true }
  ],
  "USED_CAR_SALE_CONTRACT": [
    { "key": "sellerName", "label": "出賣人（車主）姓名", "type": "text", "showAiSuggest": true },
    { "key": "buyerName", "label": "買受人姓名", "type": "text", "showAiSuggest": true },
    { "key": "carPlateNumber", "label": "車輛牌照號碼與排氣量", "type": "text", "showAiSuggest": true },
    { "key": "salePrice", "label": "約定買賣總價金（元）", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "車況保證（無重大事故、無泡水、里程數確認）", "type": "textarea", "rows": 5, "showAiSuggest": true }
  ],
  "STATUTE_LIMITATIONS_CALCULATOR": [
    { "key": "claimType", "label": "請求權或犯罪類型", "type": "text", "showAiSuggest": true },
    { "key": "startDate", "label": "起算日期（知悉日/發生日）", "type": "text", "showAiSuggest": true },
    { "key": "incidentDetails", "label": "是否有承認、起訴或催告中斷事由", "type": "textarea", "rows": 4, "showAiSuggest": true }
  ]
};
