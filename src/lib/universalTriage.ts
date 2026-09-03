import { buildFallbackToolboxResult } from '../utils/toolboxFallbacks.js';

export function buildIntelligentRuleBasedTriage(query: string) {
    const q = (query || "").toLowerCase();
    
    // 1. 寵物/動物傷害 (純民事侵權，無刑事責任，非告訴乃論)
    if (q.includes("貓") || q.includes("狗") || q.includes("寵物") || (q.includes("咬") && !q.includes("人咬人")) || q.includes("動物")) {
      const cat = "CIVIL_PET_DISPUTE";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "寵物遭鄰犬/動物咬傷侵權損害賠償爭議",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（動物占有人侵權損害賠償，無刑事責任）",
        legalBasis: [
          "民法第190條第1項（動物占有人侵權責任）",
          "民法第184條第1項前段（一般侵權行為）",
          "民法第196條（物之損害賠償/醫療修復費）",
          "民法第216條（損害賠償範圍）"
        ],
        statuteAnalysis: "民法第190條（動物占有人責任）、民法第184條第1項、民法第196條（物之損害賠償）",
        isPublicProsecution: false,
        statuteOfLimitations: "民事侵權行為損害賠償請求權時效為 2 年（民法第197條）。純財物/寵物受損事件無刑事犯罪（刑法毀損不罰過失），【絕非刑事告訴乃論罪】。",
        timeLimit: "民事侵權請求權時效為 2 年（民法第197條）",
        plainExplanation: "鄰居飼養之犬隻咬傷您的寵物貓，依民法第190條規定，動物占有人（飼主）對其動物所加損害應負賠償責任。在法律上寵物屬所有物（財產權客體），且刑法毀損罪不罰過失，因此【純屬民事侵權損害賠償事件，無刑事犯罪責任，亦非刑事告訴乃論】。您可以向加害犬隻飼主請求全額賠償寵物緊急救治、手術診療之必要醫療費用，以及減少之價額。請求時效為知悉損害及賠償義務人起 2 年。",
        recommendedAction: "1. 保全動物醫院診斷證明與醫療收據 2. 調閱監視器錄影 3. 寄發存證信函或向法院簡易庭起訴請求賠償。",
        suggestedActions: [
          "第一時間取得動物醫院正式診斷證明書、病歷及急救手術費用明細收據正本",
          "調閱現場路口或店家監視器錄影畫面，並拍攝寵物傷勢與加害犬隻照片保全證據",
          "確認加害犬隻飼主身分，寄發存證信函催告限期賠償醫療費用",
          "若對方拒不賠償，向管轄地方法院民事簡易庭具狀提起「民事損害賠償起訴狀」或聲請鄉鎮市調解"
        ],
        evidenceChecklist: [
          "動物醫院診斷證明書、病歷及手術醫療費用收據正本",
          "寵物受傷部位照片及現場事發監視器錄影光碟",
          "寵物晶片登記證明文件（證明原告所有權）",
          "與對造飼主協商溝通之對話紀錄截圖或存證信函影本"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 2. 傷害罪 / 互毆 / 正當防衛 (刑事告訴乃論，6個月時效)
    if (q.includes("打架") || q.includes("互毆") || q.includes("被揍") || q.includes("被打") || q.includes("毆打") || q.includes("打人") || q.includes("動手") || q.includes("還手") || (q.includes("傷害") && !q.includes("過失傷害")) || q.includes("正當防衛")) {
      const cat = "CRIMINAL_COMPLAINT_ASSAULT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "普通傷害罪 / 互毆與正當防衛法律爭議",
        category: cat,
        caseType: "CRIMINAL_COMPLAINT_REQUIRED",
        litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
        legalBasis: [
          "刑法第277條第1項（普通傷害罪）",
          "刑法第23條（正當防衛阻卻違法）",
          "民法第184條第1項（侵權行為損害賠償）",
          "民法第195條第1項（身體健康受損精神慰撫金）"
        ],
        statuteAnalysis: "刑法第277條第1項（普通傷害罪）、刑法第23條（正當防衛）、民法第184條、第195條",
        isPublicProsecution: false,
        statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內具狀提出告訴；民事侵權請求權時效為 2 年。",
        timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
        plainExplanation: "遭他人動手毆打成傷，構成刑法第277條普通傷害罪，依法為【告訴乃論】，必須在知悉犯人起 6 個月內具狀提告！若您在遭受現在不法侵害時僅為阻擋、推開或防衛自身，依刑法第23條屬於正當防衛不罰。提告時應強調對方先行動手之客觀事實，並檢附醫院驗傷單與現場錄影畫面，以防遭對方反咬互毆。",
        recommendedAction: "1. 立即前往醫院急診開立驗傷診斷書 2. 調閱路口/店家監視器錄影 3. 6個月內向地檢署具狀提告傷害並求償。",
        suggestedActions: [
          "立即前往公私立醫院急診進行驗傷，並載明傷勢成因與受傷部位開立診斷證明書正本",
          "請警方調閱案發現場路口監視器或向周邊店家調取錄影光碟保全事證",
          "依刑事訴訟法第237條，於知悉加害者身分起「6個月法定期間內」向地檢署提起刑事告訴狀",
          "刑事起訴後提起刑事附帶民事訴訟，請求醫藥費、不能工作損失與精神慰撫金"
        ],
        evidenceChecklist: [
          "公私立醫院急診驗傷診斷證明書正本（載明傷勢部位與受傷原因）",
          "案發現場路口監視器或店家錄影畫面光碟",
          "現場目擊證人聯絡資料與警詢筆錄",
          "醫療費用單據、因傷受損之衣物財物照片"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 3. 公然侮辱 / 誹謗 / 妨害名譽 / 直播辱罵 (刑事告訴乃論，6個月時效)
    if (q.includes("辱罵") || q.includes("罵我") || q.includes("侮辱") || q.includes("誹謗") || q.includes("名譽") || q.includes("造謠") || q.includes("抹黑") || q.includes("直播") || q.includes("酸民") || q.includes("公然") || q.includes("三字經")) {
      const cat = "DEFAMATION_CEASE_AND_DESIST";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "公然侮辱罪 / 誹謗罪 / 網路妨害名譽爭議",
        category: cat,
        caseType: "CRIMINAL_COMPLAINT_REQUIRED",
        litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
        legalBasis: [
          "刑法第309條（公然侮辱罪）",
          "刑法第310條（誹謗罪）",
          "民法第184條第1項（侵權行為損害賠償）",
          "民法第195條第1項（侵害名譽權精神慰撫金）"
        ],
        statuteAnalysis: "刑法第309條（公然侮辱罪）、刑法第310條（誹謗罪）、民法第184條、第195條",
        isPublicProsecution: false,
        statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內提出告訴；民事侵權請求權為 2 年。",
        timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
        plainExplanation: "於公開直播、網路社群或不特定人得以共見共聞之場所遭到公然辱罵或貶損人格名譽，構成刑法公然侮辱或誹謗罪。此罪依法為【告訴乃論】，若超過6個月未提告即喪失告訴權！民事部分可請求精神慰撫金及回復名譽之適當處分。",
        recommendedAction: "1. 立即完整錄影/截圖（含網址、帳號、時間、發言內容） 2. 向管轄地檢署具狀提出刑事告訴 3. 提起民事附帶民事求償。",
        suggestedActions: [
          "第一時間將直播存證影片、聊天室發言截圖（務必包含直播時間、使用者帳號ID、公開留言內容與網址URL）完整保全並列印",
          "依刑事訴訟法第237條，於知悉犯人起「6個月法定期間內」向轄區地檢署提出妨害名譽刑事告訴狀",
          "透過檢警調閱 IP 查明被告真實身分後，提起刑事附帶民事訴訟請求新臺幣精神慰撫金與公開道歉啟事"
        ],
        evidenceChecklist: [
          "直播存證側錄影片或聊天室完整留言截圖（含發言者帳號ID、留言時間、直播網址）",
          "受害人直播頻道主頁或實名證明文件（證明該頻道與名譽受損之連結性）",
          "精神受創就醫證明、心理諮商紀錄（供請求慰撫金評估佐證）",
          "已寄發存證信函或警告留言存根（若有）"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 4. 車禍案件 (受傷為過失傷害告訴乃論；純車損為純民事)
    if (q.includes("車禍") || q.includes("撞到") || q.includes("擦撞") || q.includes("車損") || q.includes("過失傷害")) {
      const hasInjury = q.includes("傷") || q.includes("骨折") || q.includes("痛") || q.includes("住院") || q.includes("急診") || q.includes("人受傷");
      if (hasInjury) {
        const cat = "CRIMINAL_COMPLAINT_TRAFFIC";
        const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
        return {
          identifiedIssue: "車禍事故過失傷害刑事告訴暨損害賠償求償",
          category: cat,
          caseType: "CRIMINAL_COMPLAINT_REQUIRED",
          litigationNatureText: "⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）",
          legalBasis: [
            "刑法第284條（過失傷害罪）",
            "道路交通安全規則相關規定",
            "民法第184條第1項前段（侵權損害賠償）",
            "民法第193條、第195條（醫療費、工作損失與精神慰撫金）"
          ],
          statuteAnalysis: "刑法第284條（過失傷害罪）、民法第184條、第193條、第195條",
          isPublicProsecution: false,
          statuteOfLimitations: "【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內提出告訴；民事求償時效為 2 年。",
          timeLimit: "【告訴乃論】知悉犯人起 6 個月內須具狀提告",
          plainExplanation: "車禍導致人員受傷，肇事駕駛涉犯刑法第284條過失傷害罪，此罪屬於【告訴乃論】，必須在車禍知悉犯人起 6 個月內具狀提告。提告後可於偵查庭或法院調解，起訴後亦可提起免費之刑事附帶民事訴訟求償。",
          recommendedAction: "1. 取得事故初判表與驗傷診斷書 2. 6個月內提出過失傷害告訴 3. 提起附帶民事訴訟。",
          suggestedActions: [
            "向警方申請「道路交通事故當事人登記聯單」及「初步分析研判表」釐清肇事責任",
            "前往醫院急診或門診開立載明傷勢與醫囑需休養天數之診斷證明書正本",
            "於知悉犯人起 6 個月法定時效內向地檢署或承辦警局提出過失傷害告訴",
            "檢察官起訴後，於一審辯論終結前提起刑事附帶民事訴訟求償醫療費、修車費與慰撫金"
          ],
          evidenceChecklist: [
            "道路交通事故當事人登記聯單及初判表",
            "公私立醫院診斷證明書正本及醫療費用單據",
            "行車記錄器錄影光碟或路口監視器畫面",
            "車輛維修估價單與受損部位照片"
          ],
          targetToolCategory: cat,
          recommendedToolId: cat,
          readyDocumentTitle: fallbackDoc.title,
          readyDocumentText: fallbackDoc.documentText,
          pleadingDraft: fallbackDoc.documentText,
          complianceChecklist: fallbackDoc.complianceChecklist,
          antiGhostVerification: fallbackDoc.antiGhostVerification
        };
      } else {
        const cat = "CIVIL_TORT_GENERAL";
        const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
        return {
          identifiedIssue: "車禍純財損修車費侵權損害賠償爭議",
          category: cat,
          caseType: "CIVIL",
          litigationNatureText: "💼 純民事事件（車輛財損侵權賠償，無刑事責任）",
          legalBasis: [
            "民法第184條第1項前段（過失侵權責任）",
            "民法第196條（物之損害賠償/零件折舊與工資計算）",
            "民法第213條（回復原狀原則）"
          ],
          statuteAnalysis: "民法第184條第1項、第196條（物之損害賠償）",
          isPublicProsecution: false,
          statuteOfLimitations: "民事侵權行為損害賠償請求權時效為 2 年（民法第197條）。純車損事件無人受傷，刑法毀損不罰過失，無刑事責任，非告訴乃論。",
          timeLimit: "民事侵權請求權時效為 2 年（民法第197條）",
          plainExplanation: "車禍若無任何人員受傷（純車輛毀損），因刑法第354條毀損罪不處罰過失行為，因此【純屬民事侵權損害賠償事件，無任何刑事犯罪責任，亦非告訴乃論】。您可以依民法第184條及第196條向肇事者請求車輛維修之工資與零件費用（零件需扣除折舊）。",
          recommendedAction: "1. 取得初判表確認責任比例 2. 開立修車估價單 3. 聲請調解或民事簡易庭起訴求償。",
          suggestedActions: [
            "向警方申請初步分析研判表以釐清雙方肇事主次因與過失責任比例",
            "至合格修車廠開立詳細估價單（區分零件費與工資費）並拍照存證",
            "向各鄉鎮市區調解委員會聲請調解，或向管轄法院簡易庭提起民事訴訟"
          ],
          evidenceChecklist: [
            "道路交通事故初步分析研判表與現場圖",
            "車輛受損部位清晰照片與維修估價單/發票",
            "行車記錄器錄影光碟"
          ],
          targetToolCategory: cat,
          recommendedToolId: cat,
          readyDocumentTitle: "民事侵權損害賠償起訴狀（車損求償）",
          readyDocumentText: fallbackDoc.documentText,
          pleadingDraft: fallbackDoc.documentText,
          complianceChecklist: fallbackDoc.complianceChecklist,
          antiGhostVerification: fallbackDoc.antiGhostVerification
        };
      }
    }

    // 5. 詐騙 / 寄卡 / 提款卡 / 人頭帳戶 / 洗錢 (刑事非告訴乃論/公訴罪)
    if (q.includes("卡片") || q.includes("寄卡") || q.includes("提款卡") || q.includes("人頭") || q.includes("詐騙") || q.includes("洗錢") || q.includes("買簿子") || q.includes("警示帳戶")) {
      const cat = "CRIMINAL_COMPLAINT_FRAUD";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "誤交提款卡/存摺遭詐騙集團利用（洗錢人頭帳戶自救與刑責防禦）",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴罪，檢警知悉即應主動偵辦）",
        legalBasis: [
          "刑法第339條（詐欺取財罪）",
          "刑法第30條（幫助犯）",
          "洗錢防制法第15條之2（無正當理由交付帳戶罪）",
          "刑法第339條之4（加重詐欺罪）"
        ],
        statuteAnalysis: "刑法第339條（詐欺罪）、刑法第30條（幫助犯）、洗錢防制法第15條之2",
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴罪）】檢警知悉即應主動追訴偵查，無告訴乃論6個月限制；請把握黃金時間立即掛失帳戶並向警局報案。",
        timeLimit: "【非告訴乃論】公訴罪無6個月限制，請立即掛失報案",
        plainExplanation: "因假求職、假貸款等騙局誤將提款卡或密碼寄出，涉及洗錢防制法人頭帳戶交付罪及詐欺罪幫助犯，此類犯罪均屬【非告訴乃論公訴罪】。為防止名下帳戶遭通報警示凍結並自證清白，必須立即搶先掛失並主動至警局報案說明。",
        recommendedAction: "1. 立即致電銀行客服掛失 2. 攜帶完整招募對話至派出所報案 3. 具狀向地檢署陳報被騙交付事實。",
        suggestedActions: [
          "立即致電發卡銀行 24H 客服辦理掛失停卡與止付，阻斷不法金流進出",
          "將假求職/假貸款之完整通訊軟體對話截圖、超商寄件小白單或宅配單據印出",
          "主動前往轄區派出所報案並取得「受處理案件證明單」，自證無交付人頭帳戶犯罪故意",
          "具狀向管轄地檢署陳報「被騙交付金融卡刑事答辯/自白陳報狀」爭取不起訴處分"
        ],
        evidenceChecklist: [
          "通訊軟體完整對話紀錄截圖（包含對方誘騙寄卡理由、寄件超商門市/收件人資訊及時間戳記）",
          "超商物流交寄單據、快遞託運單存根聯或寄件包裹編號紀錄",
          "當初吸引接觸之虛假徵才貼文、貸款代辦廣告、簡訊截圖或社團網址",
          "該涉案銀行帳戶存摺封面、近期交易明細及向銀行申請掛失止付之相關憑證"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 6. 借錢不還 / 債務催討 / 本票 (純民事事件)
    if (q.includes("借錢") || q.includes("欠錢") || q.includes("不還錢") || q.includes("借據") || q.includes("本票") || q.includes("支付命令") || q.includes("借款")) {
      const cat = "DEMAND_LETTER_DEBT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "消費借貸欠款催告返還暨支付命令爭議",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（消費借貸返還/支付命令，無刑事責任）",
        legalBasis: [
          "民法第478條（消費借貸返還請求權）",
          "民法第229條（給付遲延責任）",
          "民事訴訟法第508條（督促程序支付命令）",
          "票據法第123條（本票准許強制執行裁定）"
        ],
        statuteAnalysis: "民法第478條（消費借貸返還）、民事訴訟法第508條（支付命令）",
        isPublicProsecution: false,
        statuteOfLimitations: "借款本金請求權消滅時效為 15 年（民法第125條）；利息請求權為 5 年；本票追索權為 3 年。純民事債務不履行，無坐牢刑責，非告訴乃論。",
        timeLimit: "借款本金消滅時效為 15 年（民法第125條）",
        plainExplanation: "單純借錢未依約清償，屬於民事債務不履行事件（除非借款之初即使用虛構身分施用詐術）。【純屬民事事件，無刑事犯罪責任，亦非告訴乃論】。您可以寄發存證信函催告返還，若對方置之不理，可向法院聲請「民事支付命令」（規費僅500元、免開庭）或提起民事訴訟取得執行名義查封扣押對方薪水與財產。",
        recommendedAction: "1. 整理借據、匯款明細與催討對話 2. 寄發存證信函中斷時效 3. 向法院聲請支付命令。",
        suggestedActions: [
          "彙整借款契約借據、銀行跨行轉帳明細表及LINE約定還款日之對話截圖",
          "寄發「借款清償催告存證信函」定一個月以上相當期限催告對方返還",
          "若期限屆滿未還，向債務人戶籍地地方法院聲請「民事支付命令」或「本票裁定」",
          "支付命令確定後聲請強制執行查扣債務人銀行存款、不動產或按月扣薪"
        ],
        evidenceChecklist: [
          "借據、借貸契約書正本或借款LINE對話截圖",
          "銀行/郵局轉帳匯款成功明細表或支票本票存根",
          "借款人姓名、戶籍地址、身分證字號或聯絡資訊",
          "存證信函掛號收件回執"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 7. 恐嚇危安 / 威脅 (刑事非告訴乃論/公訴罪)
    if (q.includes("恐嚇") || q.includes("威脅") || q.includes("殺") || q.includes("打斷腿") || q.includes("要你好看")) {
      const cat = "CRIMINAL_COMPLAINT_INTIMIDATION";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "恐嚇危害安全罪 / 強制罪爭議",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴罪，檢警知悉即應主動偵辦）",
        legalBasis: [
          "刑法第305條（恐嚇危害安全罪）",
          "刑法第304條（強制罪）",
          "民法第184條（侵權行為損害賠償）"
        ],
        statuteAnalysis: "刑法第305條（恐嚇危害安全罪）、第304條（強制罪）",
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴罪）】檢警知悉即應依法偵辦追訴，無6個月告訴乃論限制；民事侵權請求權時效為2年。",
        timeLimit: "【非告訴乃論】公訴罪無6個月限制",
        plainExplanation: "以加害生命、身體、自由、名譽、財產之事恐嚇他人致生危害於安全，構成刑法第305條恐嚇危害安全罪，依法屬於【非告訴乃論公訴罪】。檢警機關知悉後即應依法主動偵查追訴。",
        recommendedAction: "1. 完整截圖並錄音存證 2. 前往派出所報警取得受處理證明 3. 具狀向地檢署提告。",
        suggestedActions: [
          "對所有恐嚇文字、語音留言及通話錄音進行完整備份存證（包含時間戳記）",
          "前往派出所報案並取得受理案件證明單",
          "具狀向管轄地檢署提起恐嚇危安罪刑事告訴狀"
        ],
        evidenceChecklist: [
          "恐嚇簡訊/LINE通聯對話完整截圖",
          "電話通話錄音光碟與譯文",
          "報案受處理案件證明單"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

        // 8-pre. 乘機性交/猥褻
    const isPreIncapacitated = q.includes("睡") || q.includes("熟睡") || q.includes("昏睡") || q.includes("意識不清") || q.includes("酒醉") || q.includes("灌醉") || q.includes("麻醉") || q.includes("昏迷") || q.includes("爛醉");
    const isPreSexualAct = q.includes("含住") || q.includes("口交") || q.includes("性交") || q.includes("猥褻") || q.includes("陰莖") || q.includes("摸") || q.includes("插入");

    if (isPreIncapacitated && isPreSexualAct) {
      const cat = "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      
      const isSpouse = q.includes("老公") || q.includes("老婆") || q.includes("丈夫") || q.includes("妻子") || q.includes("配偶");
      const isDomestic = isSpouse || q.includes("伴侶") || q.includes("同居");
      const hasImage = q.includes("拍攝") || q.includes("影像") || q.includes("影片") || q.includes("裸照") || q.includes("外流");
      
      const tools = [
          {
              toolId: cat,
              toolTitle: "妨害性自主刑事告訴狀",
              reason: "針對利用不能或不知抗拒之情形為性交/猥褻，依法提出刑事告訴。",
              urgency: "HIGH"
          }
      ];
      
      if (hasImage) {
          tools.push({
              toolId: "CRIMINAL_COMPLAINT_PRIVACY",
              toolTitle: "妨害秘密 / 未經同意散布性影像刑事告訴狀",
              reason: "針對未經同意拍攝及散布性影像，追加提告刑法妨害秘密及性私密影像防制相關罪名。",
              urgency: "HIGH"
          });
      }
      
      if (isDomestic) { 
          tools.push({
              toolId: "DOMESTIC_VIOLENCE_PROTECTION_ORDER",
              toolTitle: "親密關係伴侶 / 家暴保護令聲請狀",
              reason: "行為人為家庭成員或伴侶，符合家庭暴力防治法，可一併聲請保護令禁止接近與騷擾。",
              urgency: "HIGH"
          });
      }
      
      tools.push({
          toolId: "CIVIL_TORT_SEXUAL_ASSAULT",
          toolTitle: "侵害性自主權損害賠償民事起訴狀",
          reason: "除刑事責任外，可依法提起附帶民事訴訟或獨立民事訴訟請求精神慰撫金。",
          urgency: "MEDIUM"
      });

      return {
        identifiedIssue: "妨害性自主被害案件（乘機性交/猥褻）" + (hasImage ? "暨未經同意散布性影像" : "") + (isDomestic ? "（家暴事件）" : ""),
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        detectedDomain: "CRIMINAL_AND_CIVIL",
        litigationNatureText: "⚡ 刑事非告訴乃論（公訴重罪）" + (isSpouse ? "（配偶身分不影響本罪之公訴性質，因第225條不在刑法第229條之1告訴乃論列舉範圍內）" : "") + " + 民事侵權" + (isDomestic ? " + 家暴保護令" : ""),
        legalBasis: [
          "刑法第10條第5項（性交定義）",
          "刑法第225條（乘機性交猥褻罪）",
          hasImage ? "刑法第315條之1、第319條之3（散布性私密影像罪）" : "",
          isDomestic ? "家庭暴力防治法第2條（家暴及保護令）" : "",
          "民法第184條、第195條（精神慰撫金）"
        ].filter(Boolean),
        statuteAnalysis: `刑法第225條（非告訴乃論）、${isDomestic ? '家暴防治法、' : ''}民法第184/195條`,
        isPublicProsecution: true,
        statuteOfLimitations: "【非告訴乃論（公訴重罪）】無6個月限制；黃金72小時內請至急診驗傷採證。",
        timeLimit: "公訴重罪無6個月限制",
        plainExplanation: "利用他人睡眠、酒醉或昏迷等不知或不能抗拒之情形進行性行為，構成刑法乘機性交/猥褻罪。此罪與強制性交（強暴、脅迫）不同，即使沒有施加暴力強制，只要利用對方意識不清的狀態即成立。" + 
                          (isSpouse ? "需特別注意：刑法第225條乘機性交罪不在第229條之1告訴乃論範圍內，即使是對配偶為之，仍屬非告訴乃論（公訴罪）。" : "") +
                          (hasImage ? "若有未經同意拍攝或散布性影像，另構成妨害秘密與性私密影像犯罪。" : "") +
                          "請優先保全生物檢體與對話截圖，並可依家庭暴力防治法聲請保護令，同時依民法請求精神慰撫金。",
        recommendedAction: "1. 72小時內急診驗傷採證（勿洗澡更衣） 2. 保全對話截圖 3. 撥打113或向地檢署提出告訴 4. 聲請保護令並求償精神慰撫金。",
        suggestedActions: [
          "向管轄地檢署或婦幼警察隊具狀提出告訴",
          isDomestic ? "向管轄法院聲請通常保護令，禁止對方再有施暴或騷擾行為" : "",
          "提起刑事附帶民事訴訟請求醫療費、心理諮商費與精神慰撫金"
        ].filter(Boolean),
        evidenceChecklist: [
          "公私立醫院性侵害驗傷診斷書",
          "LINE案發前後通聯對話",
          hasImage ? "性影像散布網址、群組截圖或原始影片檔" : "",
          "錄音光碟與心理諮商就醫證明"
        ].filter(Boolean),
        targetToolCategory: cat,
        recommendedToolId: cat,
        recommendedTools: tools, 
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 8. 妨害性自主 / 強制性交 / 違反意願性交 (含配偶間性犯罪、乘機性交)
    const isIncapacitated = q.includes("睡覺") || q.includes("睡眠") || q.includes("酒醉") || q.includes("下藥") || q.includes("昏迷") || q.includes("不醒") || q.includes("不知抗拒") || q.includes("不能抗拒") || q.includes("乘機");
    const isForced = q.includes("強迫") || q.includes("強行") || q.includes("違反意願") || q.includes("強壓") || q.includes("按頭") || q.includes("反抗") || q.includes("拒絕") || q.includes("強暴") || q.includes("脅迫");
    const isSexualAct = q.includes("口交") || q.includes("性交") || q.includes("猥褻") || q.includes("陰蒂") || q.includes("陰莖") || q.includes("性器") || q.includes("含住");
    
    const isSexualAssault = q.includes("性侵") || q.includes("非自願") || q.includes("妨害性自主") || q.includes("強制性交") || q.includes("強姦") || q.includes("乘機性交") || (isSexualAct && (isForced || isIncapacitated));

    if (isSexualAssault) {
      const cat = "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      
      const isSpouse = q.includes("老公") || q.includes("老婆") || q.includes("丈夫") || q.includes("妻子") || q.includes("配偶");
      const isDomestic = isSpouse || q.includes("伴侶") || q.includes("同居");
      const hasImage = q.includes("拍攝") || q.includes("影像") || q.includes("影片") || q.includes("裸照") || q.includes("外流");
      
      let appliedStatute = "221/224";
      if (isIncapacitated) appliedStatute = "225";
      if (isForced) appliedStatute = "221/224"; // 強暴脅迫或反抗則優先檢討221/224
      
      const isTell = isSpouse && appliedStatute === "221/224"; // 225不在229-1範圍內，故對配偶乘機性交仍屬非告訴乃論
      
      const tools = [
          {
              toolId: cat,
              toolTitle: "妨害性自主刑事告訴狀",
              reason: appliedStatute === "225" ? "針對利用不能抗拒之情形為性交/猥褻，依法提出刑事告訴。" : "針對違反意願為性交/猥褻，依法提出刑事告訴。",
              urgency: "HIGH"
          }
      ];
      
      if (hasImage) {
          tools.push({
              toolId: "CRIMINAL_COMPLAINT_PRIVACY",
              toolTitle: "妨害秘密 / 未經同意散布性影像刑事告訴狀",
              reason: "針對未經同意拍攝及散布性影像，追加提告刑法妨害秘密及性私密影像防制相關罪名。",
              urgency: "HIGH"
          });
      }
      
      if (isDomestic) { 
          tools.push({
              toolId: "DOMESTIC_VIOLENCE_PROTECTION_ORDER",
              toolTitle: "親密關係伴侶 / 家暴保護令聲請狀",
              reason: "行為人為家庭成員或伴侶，符合家庭暴力防治法，可一併聲請保護令禁止接近與騷擾。",
              urgency: "HIGH"
          });
      }
      
      tools.push({
          toolId: "CIVIL_TORT_SEXUAL_ASSAULT",
          toolTitle: "侵害性自主權損害賠償民事起訴狀",
          reason: "除刑事責任外，可依法提起附帶民事訴訟或獨立民事訴訟請求精神慰撫金。",
          urgency: "MEDIUM"
      });

      return {
        identifiedIssue: "妨害性自主被害案件" + (appliedStatute === "225" ? "（乘機性交/猥褻）" : "") + (hasImage ? "暨未經同意散布性影像" : "") + (isDomestic ? "（家暴事件）" : ""),
        category: cat,
        caseType: isTell ? "CRIMINAL_PRIVATE" : "CRIMINAL_PUBLIC",
        detectedDomain: "CRIMINAL_AND_CIVIL",
        litigationNatureText: isTell ? "⚡ 刑事告訴乃論（刑法第229條之1）+ 民事侵權 + 家暴保護令" : "⚡ 刑事非告訴乃論（公訴重罪）+ 民事侵權",
        legalBasis: [
          "刑法第10條第5項（性交定義）",
          appliedStatute === "225" ? "刑法第225條（乘機性交猥褻罪）" : "刑法第221條（強制性交罪）或第224條（強制猥褻罪）",
          isTell ? "刑法第229條之1（對配偶犯妨害性自主罪之告訴乃論）" : "",
          isTell ? "刑事訴訟法第237條（告訴期間六個月）" : "",
          hasImage ? "刑法第315條之1、第319條之3（散布性私密影像罪）" : "",
          isDomestic ? "家庭暴力防治法第2條（家暴及保護令）" : "",
          "民法第184條、第195條（精神慰撫金）"
        ].filter(Boolean),
        statuteAnalysis: isTell 
          ? `刑法第${appliedStatute}條、刑法第229條之1（告訴乃論）、家暴防治法、民法第184/195條` 
          : `刑法第${appliedStatute}條（非告訴乃論）、${isDomestic ? '家暴防治法、' : ''}民法第184/195條`,
        isPublicProsecution: !isTell,
        statuteOfLimitations: isTell ? "【告訴乃論】依刑事訴訟法第237條，須於知悉犯人起6個月內提出告訴。黃金72小時內請至急診驗傷。" : "【非告訴乃論（公訴重罪）】無6個月限制；黃金72小時內請至急診驗傷採證。",
        timeLimit: isTell ? "須於知悉後 6 個月內提出刑事告訴" : "公訴重罪無6個月限制",
        plainExplanation: (appliedStatute === "225" ? "利用他人睡眠、酒醉或昏迷等不知或不能抗拒之情形進行性行為，構成刑法乘機性交/猥褻罪。" : "強迫進行性交（包含口交）或猥褻，即使發生在夫妻或伴侶之間，依然構成刑法犯罪。") + 
                          (isTell ? "對配偶犯強制性交或猥褻罪，依刑法第229條之1為告訴乃論，必須在6個月內提告。" : (isSpouse && appliedStatute === "225" ? "需注意：刑法第225條乘機性交罪不在第229條之1告訴乃論範圍內，即使是對配偶為之，仍屬非告訴乃論（公訴罪）。" : "")) +
                          (hasImage ? "若有未經同意拍攝或散布性影像，另構成妨害秘密與性私密影像犯罪。" : "") +
                          "請優先保全生物檢體與對話截圖，並可依家庭暴力防治法聲請保護令，同時依民法請求精神慰撫金。",
        recommendedAction: "1. 72小時內急診驗傷採證（勿洗澡更衣） 2. 保全對話截圖 3. 撥打113或向地檢署提出告訴 4. 聲請保護令並求償精神慰撫金。",
        suggestedActions: [
          isTell ? "依刑事訴訟法第237條規定，務必於知悉犯人起6個月內向地檢署提出告訴" : "向管轄地檢署或婦幼警察隊具狀提出告訴",
          isDomestic ? "向管轄法院聲請通常保護令，禁止對方再有施暴或騷擾行為" : "",
          "提起刑事附帶民事訴訟請求醫療費、心理諮商費與精神慰撫金"
        ].filter(Boolean),
        evidenceChecklist: [
          "公私立醫院性侵害驗傷診斷書",
          "LINE案發前後通聯對話",
          hasImage ? "性影像散布網址、群組截圖或原始影片檔" : "",
          "錄音光碟與心理諮商就醫證明"
        ].filter(Boolean),
        targetToolCategory: cat,
        recommendedToolId: cat,
        recommendedTools: tools, 
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 9. 竊盜 / 侵占// 9. 竊盜 / 侵占// 9. 竊盜 / 侵占// 9. 竊盜 / 侵占 (公訴罪，親屬同居特例為告訴乃論)
    if (q.includes("偷") || q.includes("竊盜") || q.includes("侵占") || q.includes("拿走") || q.includes("偷竊")) {
      const cat = "CRIMINAL_COMPLAINT_THEFT";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "竊盜罪 / 侵占罪 / 親屬伴侶財產侵害爭議",
        category: cat,
        caseType: "CRIMINAL_PUBLIC",
        litigationNatureText: "⚡ 刑事非告訴乃論（一般伴侶公訴罪；同居親屬為告訴乃論）",
        legalBasis: [
          "刑法第320條（普通竊盜罪）",
          "刑法第324條（親屬同居特例）",
          "刑法第335條（普通侵占罪）",
          "民法第767條（所有物返還請求權）"
        ],
        statuteAnalysis: "刑法第320條（竊盜罪）、刑法第324條（親屬間竊盜特例）、民法第184條、民法第767條（所有物返還）",
        isPublicProsecution: true,
        statuteOfLimitations: "未同居一般伴侶為非告訴乃論公訴罪（隨時可追訴）；若為同居伴侶或親屬，依刑法第324條為告訴乃論，應自知悉犯人之日起6個月內提告。",
        timeLimit: "一般為公訴罪；同居親屬須於 6 個月內提告",
        plainExplanation: "未經同意拿取他人財物或霸佔借用物拒還，構成竊盜罪或侵占罪。若雙方非同居親屬，屬於非告訴乃論公訴罪；同居親屬間則為告訴乃論。",
        recommendedAction: "1. 保全證據（監視器、對話自承截圖、銀行金流） 2. 向地檢署提出刑事告訴狀 3. 提起刑事附帶民事訴訟或民事起訴求償。",
        suggestedActions: [
          "第一時間保全監視器、催討對話截圖與失竊物品所有權憑證",
          "向管轄地檢署具狀提出刑事竊盜/侵占告訴",
          "提起刑事附帶民事訴訟或民事起訴請求返還原物與損害賠償"
        ],
        evidenceChecklist: [
          "失竊物品購買憑證或照片",
          "案發現場監視器畫面",
          "通訊軟體催討對話截圖與被告自承紀錄",
          "存摺盜領/盜刷銀行交易明細"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: fallbackDoc.title,
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 10. 租屋糾紛 / 漏水 / 房屋瑕疵 (純民事事件)
    if (q.includes("租屋") || q.includes("房東") || q.includes("房客") || q.includes("漏水") || q.includes("押金") || q.includes("裝潢") || q.includes("修繕")) {
      const cat = "CIVIL_TORT_GENERAL";
      const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
      return {
        identifiedIssue: "租賃契約修繕爭議 / 房屋漏水侵權損害賠償",
        category: cat,
        caseType: "CIVIL",
        litigationNatureText: "💼 純民事事件（民事契約與瑕疵修繕請求，無刑事責任）",
        legalBasis: [
          "民法第429條、第430條（出租人修繕義務）",
          "民法第184條第1項前段（侵權損害賠償）",
          "民法第493條（承攬瑕疵修補）"
        ],
        statuteAnalysis: "民法第429條、第430條（租賃修繕義務）、民法第184條",
        isPublicProsecution: false,
        statuteOfLimitations: "民事契約與瑕疵修補請求權時效（租賃物修繕/民事請求2年侵權或15年契約時效）。純民事糾紛無刑事責任，非告訴乃論。",
        timeLimit: "民事請求權時效（侵權2年 / 契約15年）",
        plainExplanation: "租賃房屋修繕、漏水問題或押金返還，屬於民法債篇之契約與侵權爭議。【純屬民事事件，無刑事犯罪責任，亦非告訴乃論】。您可以寄發存證信函定期催告修繕，若對方逾期不修，得自行雇工修復後自租金扣抵，或提起民事訴訟求償。",
        recommendedAction: "1. 拍攝漏水受損部位照片 2. 寄發存證信函限期修繕 3. 聲請鄉鎮市調解或民事簡易庭起訴。",
        suggestedActions: [
          "拍攝房屋漏水、瑕疵部位之照片並取得水電技師修復估價單",
          "寄發存證信函定相當期限（如7至10日）催告房東或樓上住戶進場修繕",
          "向房屋所在地鄉鎮市區調解委員會聲請調解或向地方法院簡易庭起訴"
        ],
        evidenceChecklist: [
          "租賃契約書或建物所有權狀影本",
          "漏水現場受損照片與水電工程鑑定估價單",
          "通訊軟體催告對話截圖與存證信函回執"
        ],
        targetToolCategory: cat,
        recommendedToolId: cat,
        readyDocumentTitle: "民事損害賠償暨請求修繕起訴狀",
        readyDocumentText: fallbackDoc.documentText,
        pleadingDraft: fallbackDoc.documentText,
        complianceChecklist: fallbackDoc.complianceChecklist,
        antiGhostVerification: fallbackDoc.antiGhostVerification
      };
    }

    // 11. 通用預設 (根據有無刑法關鍵字做嚴謹定性)
    const cat = "UNIVERSAL_AI_PLEADING";
    const fallbackDoc = buildFallbackToolboxResult(cat, { incidentDetails: query, searchQuery: query });
    return {
      identifiedIssue: "生活爭議法律案件實體法與程序法即時診斷",
      category: cat,
      caseType: "CIVIL",
      litigationNatureText: "💼 民事/司法爭議事件（權利行使與救濟）",
      legalBasis: ["民法第184條（侵權行為損害賠償）", "民法第767條（物上請求權）"],
      statuteAnalysis: "依民法第184條、第767條或實體法相關規定",
      isPublicProsecution: false,
      statuteOfLimitations: "民事侵權請求權時效為 2 年（民法第197條）；若涉及刑事告訴乃論罪則應於知悉犯人起 6 個月內提出。",
      timeLimit: "民事侵權時效 2 年 / 刑事告訴乃論 6 個月",
      plainExplanation: `針對您的爭議情況「${query}」，系統已啟動全能法律實務診斷，為您彙整實體法要件、時效限制與救濟程序。`,
      recommendedAction: "第一時間保全相關物證、通訊軟體截圖與錄音紀錄，向主管機關或管轄地院具狀提出。",
      suggestedActions: [
        "第一時間保全相關事證、截圖與錄音錄影紀錄",
        "向管轄司法警察機關、地檢署或法院具狀提出",
        "使用法律工具箱產製專屬合法書狀主張權益"
      ],
      evidenceChecklist: [
        "通訊軟體完整對話紀錄截圖",
        "相關合約、單據憑證或交易明細",
        "身分證明文件與物證照片"
      ],
      targetToolCategory: cat,
      recommendedToolId: cat,
      readyDocumentTitle: fallbackDoc.title,
      readyDocumentText: fallbackDoc.documentText,
      pleadingDraft: fallbackDoc.documentText,
      complianceChecklist: fallbackDoc.complianceChecklist,
      antiGhostVerification: fallbackDoc.antiGhostVerification
    };
  }


/**
 * 雙層校驗機制 (Layer 2 Guardrail)：
 * 針對 LLM 分類後的結果進行強制一致性與法理校正，
 * 避免 LLM 產生幻覺（例如將配偶乘機性交誤判為告訴乃論，或是在性侵害案件中引用物上請求權）。
 */
export function enforceTriageConsistency(payload: any, query: string): any {
  if (!payload) return payload;
  const p = { ...payload };
  const isSpouse = query.includes("老公") || query.includes("老婆") || query.includes("配偶") || query.includes("妻子") || query.includes("丈夫");
  
  const has225 = (p.legalBasis && p.legalBasis.some((b: string) => b.includes("225"))) || 
                 (p.statuteAnalysis && p.statuteAnalysis.includes("225"));
  
  const isSexualAssault = p.category === "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT";

  // 規則 1：只要成立刑法第225條，無論是否為配偶，絕對是非告訴乃論 (公訴重罪)。
  // 覆寫 LLM 產生的錯誤狀態。
  if (has225) {
    p.isPublicProsecution = true;
    p.caseType = "CRIMINAL_PUBLIC";
    
    // 修正訴訟性質文字
    if (p.litigationNatureText) {
       p.litigationNatureText = p.litigationNatureText.replace(/告訴乃論/g, "非告訴乃論");
       if (!p.litigationNatureText.includes("非告訴乃論")) {
         p.litigationNatureText = "⚡ 刑事非告訴乃論（公訴重罪）" + p.litigationNatureText;
       }
    } else {
       p.litigationNatureText = "⚡ 刑事非告訴乃論（公訴重罪）";
    }
    
    // 補上配偶警告
    if (isSpouse && !p.litigationNatureText.includes("不影響本罪之公訴性質")) {
       p.litigationNatureText += "（配偶身分不影響本罪之公訴性質，因第225條不在刑法第229條之1告訴乃論列舉範圍內）";
    }

    // 修正時效描述
    p.statuteOfLimitations = "【非告訴乃論（公訴重罪）】無6個月限制；黃金72小時內請至急診驗傷採證。";
    p.timeLimit = "公訴重罪無6個月限制";

    // 剔除幽靈引用 (225 不適用 229-1)
    if (p.legalBasis) {
       p.legalBasis = p.legalBasis.filter((b: string) => !b.includes("229條之1") && !b.includes("229-1"));
    }
    if (p.statuteAnalysis) {
       p.statuteAnalysis = p.statuteAnalysis.replace(/刑法第229條之1/g, "").replace(/告訴乃論/g, "非告訴乃論").replace(/、、/g, "、");
    }
  }

  // 規則 2：性自主權案件嚴禁出現財產權之物上請求權 (767)
  if (isSexualAssault || has225) {
    if (p.legalBasis) {
       p.legalBasis = p.legalBasis.filter((b: string) => !b.includes("767"));
    }
    if (p.statuteAnalysis) {
       p.statuteAnalysis = p.statuteAnalysis.replace(/民法第767條/g, "").replace(/物上請求權/g, "").replace(/、、/g, "、");
    }
  }

  return p;
}
