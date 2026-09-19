export interface GuideSection {
  title: string;
  content: string;
  practicalTips?: string[];
}

export interface DocumentToolGuide {
  summary: string;
  courtOrAgency: string;
  feeStandard: string;
  keyElements: string[];
  requiredDocuments: string[];
  guideSections?: GuideSection[];
}

const DEFAULT_GUIDES: Record<string, DocumentToolGuide> = {
  CRIMINAL_COMPLAINT_TRAFFIC: {
    summary: '針對交通事故致傷案件，依法向管轄地檢署或警察機關提起刑事過失傷害罪告訴。',
    courtOrAgency: '事故發生地或被告住居所地之地方法院檢察署',
    feeStandard: '刑事告訴免繳納裁判費',
    keyElements: [
      '事故發生日之 6 個月內提出告訴（刑事訴訟法第237條告訴乃論之罪告訴期間）',
      '被告具有注意義務、違反注意義務（過失），並與傷害結果具相當因果關係',
      '提出診斷證明書載明確切傷害診斷與就診日期'
    ],
    requiredDocuments: [
      '道路交通事故當事人登記聯單',
      '道路交通事故初步分析研判表（事故後30日得申請）',
      '醫院甲種/乙種診斷證明書正本',
      '醫療費用收據、車損估價單或照片'
    ],
    guideSections: [
      {
        title: '刑事告訴期限與時效防範',
        content: '刑法過失傷害罪屬告訴乃論，告訴期間為知悉犯人之日起 6 個月內，逾期即不得再提刑事告訴。',
        practicalTips: [
          '若雙方仍在進行鄉鎮市調解，務必注意 6 個月期限，避免因協商延誤導致告訴權消滅。',
          '得於刑事訴訟程序中提起附帶民事訴訟，免徵第一審民事裁判費。'
        ]
      }
    ]
  },
  DIVORCE_AGREEMENT: {
    summary: '兩願協議離婚書狀，載明雙方身分、未成年子女親權監護、扶養費給付及夫妻財產協議。',
    courtOrAgency: '雙方任一方戶籍所在地之戶政事務所',
    feeStandard: '戶政換證規費每張 50 元、換發戶口名簿每份 30 元',
    keyElements: [
      '須有二人以上之合格證人簽名（民法第1050條）',
      '夫妻雙方須共同親自至戶政事務所辦理登記',
      '約定未成年子女權利義務之行使或負擔'
    ],
    requiredDocuments: [
      '離婚協議書正本一式三份（雙方各一份、戶政留存一份）',
      '雙方身分證、戶口名簿、印章或親自簽名',
      '最近兩年內兩吋半身彩色照片'
    ]
  },
  PAYMENT_ORDER_PETITION: {
    summary: '請求法院核發支付命令，程序迅速、規費低廉，確定後具執行名義。',
    courtOrAgency: '債務人住所地、營業所地之地方法院',
    feeStandard: '聲請費新臺幣 500 元',
    keyElements: [
      '請求給付金錢、有價證券或其他代替物之一定數量',
      '須能送達至債務人（不得公示送達）',
      '債務人收受後 20 日內未聲明異議即確定'
    ],
    requiredDocuments: [
      '支付命令聲請狀及繕本',
      '借據、本票、匯款明細、催告存證信函等債權證明文件',
      '債務人戶籍謄本（待法院命補正時向戶政申請）'
    ]
  },
  CIVIL_COMPLAINT_GENERAL: {
    summary: '向地方法院提起第一審民事訴訟，請求裁判命被告給付或履行義務。',
    courtOrAgency: '被告住所地地方法院或契約履行地／侵權行為地法院',
    feeStandard: '依訴訟標的金額依法定累進費率繳納第一審裁判費',
    keyElements: [
      '載明訴之聲明、訴訟標的及其原因事實',
      '符合當事人適格與訴訟能力規定',
      '起訴前依規定先行調解程序者除外'
    ],
    requiredDocuments: [
      '民事起訴狀及按被告人數備具之繕本',
      '原告身分證明文件',
      '相關契約書、憑證、往來紀錄及證據清冊'
    ]
  }
};

export function getDocumentToolGuide(toolId: string): DocumentToolGuide | undefined {
  return DEFAULT_GUIDES[toolId] || undefined;
}
