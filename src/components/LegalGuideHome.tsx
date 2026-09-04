import React, { useState, useMemo, useEffect } from 'react';
import { LegalSourcesDisplay } from './LegalSourcesDisplay';
import { LEGAL_TOOLS } from './LegalToolbox';
import { useCaseStore } from '../store/useCaseStore';
import { 
  Compass, 
  Search, 
  ArrowRight, 
  Car, 
  Coins, 
  ShieldAlert, 
  HeartHandshake, 
  UserCheck, 
  Home, 
  Scale, 
  FileCheck2, 
  Sparkles,
  FileSignature, 
  HelpCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  BookmarkCheck,
  Zap,
  BookOpen,
  PhoneCall,
  ShieldCheck,
  ChevronDown,
  GripVertical
} from 'lucide-react';

interface LegalGuideHomeProps {
  onSelectTool: (toolId: string, subTab?: string, initialData?: any) => void;
  onNavigate?: (toolId: string) => void;
}

interface ScenarioItem {
  id: string;
  category: string;
  icon: any;
  color: string;
  title: string;
  plainDesc: string;
  situation: string;
  recommendedAction: string;
  targetToolId: string;
  targetSubTab?: string;
  targetSubTool?: string;
  feeInfo: string;
  timeInfo: string;
  mustPrepare: string[];
  tags: string[];
}

export const LegalGuideHome: React.FC<LegalGuideHomeProps> = ({ onSelectTool, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const loadTagClicks = (): Record<string, number> => {
    try { return JSON.parse(localStorage.getItem(QUICK_TAG_CLICK_KEY) || "{}"); } catch { return {}; }
  };
const [tagClicks, setTagClicks] = useState<Record<string, number>>(loadTagClicks);
  const [showExtendedTags, setShowExtendedTags] = useState<boolean>(false);
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioItem | null>(null);

  // Dynamic AI Universal Triage state
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<any | null>(null);
  const [showAiTriageModal, setShowAiTriageModal] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [syllogismAnswers, setSyllogismAnswers] = useState<Record<number, { option: string, text: string }>>({});
  const [sourceTab, setSourceTab] = useState<'statutes' | 'judgments' | 'references' | 'literature'>('statutes');
  const saveTriage = useCaseStore(s => s.saveTriage);
  const saveRetrievedCitations = useCaseStore(s => s.saveRetrievedCitations);

  useEffect(() => {
    if (!aiTriageResult || !searchQuery.trim()) return;
    saveTriage(searchQuery.trim(), aiTriageResult);
    const retrieved = (aiTriageResult.sources?.judgments || []).map((source: any, index: number) => ({
      id: source.citation || `retrieved-${index}`,
      type: 'TLR 檢索結果',
      citation: source.citation || source.title || '未命名來源',
      summary: source.excerpt || source.title || '',
      applicationReason: '導診檢索候選；尚未完成全文閱讀與人工確認。',
      selected: false,
      sourceProvider: 'tw-legal-rag',
      sourceUrl: source.sourceUrl,
      sourceStatus: 'RETRIEVED_UNREAD',
      fetchedAt: new Date().toISOString()
    }));
    if (retrieved.length) saveRetrievedCitations(retrieved);
  }, [aiTriageResult, searchQuery, saveTriage, saveRetrievedCitations]);

  const handleRunAiTriage = async (customQuery?: string) => {
    const q = (customQuery || searchQuery).trim();
    if (!q) return;
    
    setAiTriageLoading(true);
    setShowAiTriageModal(true);
    setSyllogismAnswers({});
    setCopiedDraft(false);

    try {
      const res = await fetch('/api/triage/universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      if (!res.ok) throw new Error(`Triage request failed: ${res.statusText}`);
      const data = await res.json();
      
      const rawCaseType = data.caseType || (
        data.isPublicProsecution 
          ? 'CRIMINAL_PUBLIC' 
          : (Array.isArray(data.legalBasis) && data.legalBasis.some((b: string) => b.includes('刑法')) ? 'CRIMINAL_COMPLAINT_REQUIRED' : 'CIVIL')
      );

      const normalized = {
        category: data.category || data.targetToolCategory || 'UNIVERSAL_AI_PLEADING',
        recommendedToolId: data.recommendedToolId || data.targetToolCategory || 'UNIVERSAL_AI_PLEADING',
        caseType: rawCaseType,
        litigationNatureText: data.litigationNatureText || (
          rawCaseType === 'CIVIL' 
            ? '💼 純民事事件（民事損害賠償/調解，無刑事責任）'
            : (rawCaseType === 'CRIMINAL_PUBLIC' 
                ? '⚡ 包含公訴罪 / 非告訴乃論（檢警知悉即應偵辦）' 
                : '⚠️ 刑事告訴乃論（知悉犯人起 6 個月內須具狀提告）')
        ),
        legalBasis: Array.isArray(data.legalBasis) 
          ? data.legalBasis 
          : (data.statuteAnalysis ? data.statuteAnalysis.split('、') : ['民法第184條']),
        isPublicProsecution: rawCaseType === 'CRIMINAL_PUBLIC',
        timeLimit: data.timeLimit || data.statuteOfLimitations || (rawCaseType === 'CIVIL' ? '民事請求權時效為 2 年' : '知悉犯人起 6 個月內提告'),
        plainExplanation: data.plainExplanation || data.statuteAnalysis || '針對您的情況，系統已完成實體法與程序法初步分析，引用結果仍需人工查證。',
        suggestedActions: Array.isArray(data.suggestedActions)
          ? data.suggestedActions
          : (data.recommendedAction ? [data.recommendedAction] : ['第一時間保全相關證物', '向管轄機關具狀提出']),
        evidenceChecklist: Array.isArray(data.evidenceChecklist)
          ? data.evidenceChecklist
          : ['相關證據單據與對話截圖', '身分憑證'],
        pleadingDraft: data.pleadingDraft || data.readyDocumentText || '',
        isSyllogismComplete: data.isSyllogismComplete !== false,
        missingQuestions: data.missingQuestions || [],
        isSensitive: !!data.isSensitive,
        protectionNotice: data.protectionNotice || '',
        sources: {
          ...(data.sources || { enabled: false, statutes: [], judgments: [], references: [], literature: [], disclaimer: '目前未啟用外部法律檢索。' }),
          // 導診已判定的法規依據先作為本機結果顯示；外部 TLR 結果仍單獨標示來源。
          statutes: (data.sources?.statutes?.length ? data.sources.statutes : (Array.isArray(data.legalBasis) ? data.legalBasis : []).map((citation: string) => ({ kind: 'statutes', citation, title: citation })))
        },
      };

      setAiTriageResult(normalized);
      setSourceTab('statutes');
    } catch (err) {
      console.error('AI Triage error:', err);
      // Fallback offline triage
      const lower = q.toLowerCase();
      const isPet = lower.includes('貓') || lower.includes('狗') || lower.includes('寵物') || (lower.includes('咬') && !lower.includes('人咬人')) || lower.includes('動物');
      const isAssault = lower.includes('打架') || lower.includes('互毆') || lower.includes('被揍') || lower.includes('被打') || lower.includes('毆打') || lower.includes('動手') || lower.includes('傷害') || lower.includes('正當防衛');
      const isCardFraud = lower.includes('卡') || lower.includes('詐騙') || lower.includes('人頭') || lower.includes('洗錢') || lower.includes('買簿子') || lower.includes('警示帳戶');
      const isDefamation = lower.includes('辱罵') || lower.includes('罵我') || lower.includes('侮辱') || lower.includes('誹謗') || lower.includes('名譽') || lower.includes('直播') || lower.includes('酸民') || lower.includes('三字經');
      const isDebt = lower.includes('借錢') || lower.includes('欠錢') || lower.includes('不還錢') || lower.includes('借據') || lower.includes('本票') || lower.includes('借款');

      if (isPet) {
        setAiTriageResult({
          category: 'CIVIL_PET_DISPUTE',
          recommendedToolId: 'CIVIL_PET_DISPUTE',
          caseType: 'CIVIL',
          litigationNatureText: '💼 純民事事件（動物占有人侵權損害賠償，無刑事責任）',
          legalBasis: [
            '民法第190條第1項（動物占有人侵權責任）',
            '民法第184條第1項前段（一般侵權行為）',
            '民法第196條（物之損害賠償/醫療費）'
          ],
          isPublicProsecution: false,
          timeLimit: '民事侵權行為損害賠償請求權時效為 2 年（民法第197條）。純財物/寵物受損事件無刑事犯罪（刑法毀損不罰過失），【絕非刑事告訴乃論罪】。',
          plainExplanation: '鄰居飼養之犬隻咬傷您的寵物貓，依民法第190條規定，動物占有人（飼主）對其動物所加損害應負賠償責任。在法律上寵物屬所有物（財產權客體），且刑法毀損罪不罰過失，因此【純屬民事侵權損害賠償事件，無刑事犯罪責任，亦非刑事告訴乃論】。您可以向加害犬隻飼主請求全額賠償寵物緊急救治、手術診療之必要醫療費用，以及減少之價額。請求時效為知悉損害及賠償義務人起 2 年。',
          suggestedActions: [
            '第一時間取得動物醫院正式診斷證明書、病歷及急救手術費用明細收據正本',
            '調閱現場路口或店家監視器錄影畫面，並拍攝寵物傷勢與加害犬隻照片保全證據',
            '確認加害犬隻飼主身分，寄發存證信函催告限期賠償醫療費用',
            '若對方拒不賠償，向管轄地方法院民事簡易庭具狀提起「民事損害賠償起訴狀」或聲請鄉鎮市調解'
          ],
          evidenceChecklist: [
            '動物醫院診斷證明書、病歷及手術醫療費用收據正本',
            '寵物受傷部位照片及現場事發監視器錄影光碟',
            '寵物晶片登記證明文件（證明原告所有權）',
            '與對造飼主協商溝通之對話紀錄截圖或存證信函影本'
          ],
          pleadingDraft: `民事起訴狀（動物占有人侵權損害賠償）\n\n原告：[請填寫原告姓名]\n住居所：[請填寫地址]\n電話：[請填寫電話]\n\n被告：[請填寫犬隻飼主姓名]\n住居所：[請填寫地址]\n\n為請求侵權行為損害賠償事件，依法提起起訴事：\n\n訴之聲明：\n一、被告應給付原告新臺幣[填寫金額]元整，及自起訴狀繕本送達翌日起至清償日止，按週年利率百分之五計算之利息。\n二、訴訟費用由被告負擔。\n\n事實及理由：\n原告飼養之寵物貓於[日期]在[地點]，遭被告所管領之犬隻無故追咬成傷，經緊急送往動物醫院施以清創手術及住院治療，支出醫療費用共計新臺幣[金額]元整。\n按民法第190條第1項前段規定：「動物加損害於他人者，由其占有人負損害賠償責任。」被告未妥善管領犬隻，致侵害原告之權益，爰依法提起本訴。\n\n謹狀\n臺灣[地區]地方法院民事庭 公鑒\n具狀人：[簽名蓋章]\n中華民國 年 月 日`
        });
        return;
      }

      if (isAssault) {
        setAiTriageResult({
          category: 'CRIMINAL_COMPLAINT_ASSAULT',
          recommendedToolId: 'CRIMINAL_COMPLAINT_ASSAULT',
          caseType: 'CRIMINAL_COMPLAINT_REQUIRED',
          litigationNatureText: '⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）',
          legalBasis: [
            '刑法第277條第1項（普通傷害罪）',
            '刑法第23條（正當防衛阻卻違法）',
            '民法第184條第1項（侵權行為損害賠償）',
            '民法第195條第1項（身體健康受損精神慰撫金）'
          ],
          isPublicProsecution: false,
          timeLimit: '【告訴乃論（6個月極限）】依刑事訴訟法第237條，必須自知悉犯人之日起 6 個月內提出告訴；民事侵權請求權為 2 年。',
          plainExplanation: '遭他人動手毆打成傷，構成刑法第277條普通傷害罪，依法為【告訴乃論】，必須在知悉犯人起 6 個月內具狀提告！若您在遭受現在不法侵害時僅為阻擋、推開或防衛自身，依刑法第23條屬於正當防衛不罰。提告時應強調對方先行動手之事實，並檢附醫院驗傷單與監視器畫面。',
          suggestedActions: [
            '立即前往公私立醫院急診進行驗傷，並載明傷勢成因與受傷部位開立診斷證明書正本',
            '請警方調閱案發現場路口監視器或向周邊店家調取錄影光碟保全事證',
            '依刑事訴訟法第237條，於知悉加害者身分起「6個月法定期間內」向地檢署提起刑事告訴狀',
            '刑事起訴後提起刑事附帶民事訴訟，請求醫藥費、不能工作損失與精神慰撫金'
          ],
          evidenceChecklist: [
            '公私立醫院急診驗傷診斷證明書正本（載明傷勢部位與受傷原因）',
            '案發現場路口監視器或店家錄影畫面光碟',
            '現場目擊證人聯絡資料與警詢筆錄',
            '醫療費用單據、因傷受損之衣物財物照片'
          ],
          pleadingDraft: `刑事告訴狀（傷害罪）\n\n告訴人：[請填寫姓名]\n住居所：[請填寫地址]\n電話：[請填寫電話]\n\n被告：[請填寫姓名]\n住居所：[請填寫地址]\n\n為被告涉犯刑法第277條第1項傷害罪，依法提出告訴事：\n\n訴之聲請：\n懇請 鈞署依法偵查，起訴被告傷害罪嫌，以懲不法。\n\n犯罪事實與理由：\n被告於民國[年]月[日]在[地點]，因故與告訴人發生口角，竟基於傷害人身體之犯意，出手毆打告訴人，致告訴人受有[傷勢說明]之傷害...\n按刑法第277條第1項規定：「傷害人之身體或健康者，處五年以下有期徒刑、拘役或五十萬元以下罰金。」被告犯行明確，爰依法提出告訴。\n\n證據清單：\n一、醫院驗傷診斷證明書正本乙份。\n二、案發現場監視器錄影光碟乙份。\n\n謹狀\n臺灣[地區]地方檢察署 公鑒\n告訴人：[簽名蓋章]\n中華民國 年 月 日`
        });
        return;
      }

      if (isDefamation) {
        setAiTriageResult({
          category: 'DEFAMATION_CEASE_AND_DESIST',
          recommendedToolId: 'DEFAMATION_CEASE_AND_DESIST',
          caseType: 'CRIMINAL_COMPLAINT_REQUIRED',
          litigationNatureText: '⚠️ 刑事告訴乃論罪（知悉犯人起 6 個月內須具狀提告）',
          legalBasis: [
            '刑法第309條（公然侮辱罪）',
            '刑法第310條（誹謗罪）',
            '民法第184條第1項（侵權行為損害賠償）',
            '民法第195條第1項（侵害名譽權精神慰撫金）'
          ],
          isPublicProsecution: false,
          timeLimit: '【告訴乃論】依刑事訴訟法第237條，應自知悉犯人之日起6個月內具狀提告；民事侵權請求權為2年。',
          plainExplanation: '於公開直播、網路社群等不特定人得以共見共聞之場所遭到辱罵，構成刑法公然侮辱罪或誹謗罪。此罪依法為【告訴乃論】，必須在知悉犯人身分起 6 個月內提出告訴，否則喪失追訴權！民事可求償非財產上損害賠償（精神慰撫金）。',
          suggestedActions: [
            '第一時間將直播存證影片、聊天室發言截圖（務必包含直播時間、使用者帳號ID、公開留言內容與網址URL）完整保全並列印',
            '依刑事訴訟法第237條，於知悉犯人起「6個月法定期間內」向轄區地檢署提出妨害名譽刑事告訴狀',
            '透過檢警調閱 IP 查明被告真實身分後，提起刑事附帶民事訴訟請求新臺幣精神慰撫金與公開道歉啟事'
          ],
          evidenceChecklist: [
            '直播存證側錄影片或聊天室完整留言截圖（含發言者帳號ID、留言時間、直播網址）',
            '受害人直播頻道主頁或實名證明文件（證明該頻道與名譽受損之連結性）',
            '精神受創就醫證明、心理諮商紀錄（供請求慰撫金評估佐證）',
            '已寄發存證信函或警告留言存根（若有）'
          ],
          pleadingDraft: `刑事告訴狀（妨害名譽）\n\n告訴人：[請填寫姓名]\n住居所：[請填寫地址]\n電話：[請填寫電話]\n\n被告：[請填寫姓名或網路帳號ID]\n住居所：年籍不詳（請 檢察官向平台調閱IP及註冊資料）\n\n為被告涉犯刑法第309條公然侮辱罪及第310條誹謗罪，依法提出告訴事：\n\n訴之聲請：\n懇請 鈞署依法偵查，起訴被告罪嫌，以懲不法。\n\n犯罪事實與理由：\n告訴人於進行網路直播時，被告於公開聊天室發表侮辱性及不實言論...\n此行為已使不特定多數人得以共見共聞，嚴重貶損告訴人之社會評價及名譽。\n\n證據清單：\n一、直播側錄影片光碟乙份。\n二、聊天室發言截圖及留言網址。\n\n謹狀\n臺灣[地區]地方檢察署 公鑒\n告訴人：[簽名蓋章]\n中華民國 年 月 日`
        });
        return;
      }

      if (isDebt) {
        setAiTriageResult({
          category: 'DEMAND_LETTER_DEBT',
          recommendedToolId: 'DEMAND_LETTER_DEBT',
          caseType: 'CIVIL',
          litigationNatureText: '💼 純民事事件（消費借貸返還/支付命令，無刑事責任）',
          legalBasis: [
            '民法第478條（消費借貸返還請求權）',
            '民法第229條（給付遲延責任）',
            '民事訴訟法第508條（督促程序支付命令）'
          ],
          isPublicProsecution: false,
          timeLimit: '借款本金請求權消滅時效為 15 年（民法第125條）；利息為 5 年。純民事債務不履行，無坐牢刑責，非告訴乃論。',
          plainExplanation: '單純借錢未依約清償，屬於民事債務不履行事件。【純屬民事事件，無刑事犯罪責任，亦非告訴乃論】。您可以寄發存證信函催告返還，若對方置之不理，可向法院聲請「民事支付命令」（規費僅500元、免開庭）以取得執行名義強制執行。',
          suggestedActions: [
            '彙整借款契約借據、銀行跨行轉帳明細表及LINE約定還款日之對話截圖',
            '寄發「借款清償催告存證信函」定一個月以上相當期限催告對方返還',
            '若期限屆滿未還，向債務人戶籍地地方法院聲請「民事支付命令」',
            '支付命令確定後聲請強制執行查扣債務人銀行存款、不動產或扣薪'
          ],
          evidenceChecklist: [
            '借據、借貸契約書正本或借款LINE對話截圖',
            '銀行/郵局轉帳匯款成功明細表或支票本票存根',
            '借款人姓名、戶籍地址、身分證字號或聯絡資訊',
            '存證信函掛號收件回執'
          ],
          pleadingDraft: `民事支付命令聲請狀\n\n聲請人（即債權人）：[請填寫姓名]\n住居所：[請填寫地址]\n\n相對人（即債務人）：[請填寫姓名]\n住居所：[請填寫戶籍地址]\n\n為聲請核發支付命令事：\n\n請求之標的及其數量：\n一、相對人應向聲請人清償新臺幣[金額]元整，及自支付命令送達翌日起至清償日止，按週年利率百分之五計算之利息。\n二、督促程序費用新臺幣伍佰元由相對人負擔。\n\n請求之原因事實：\n相對人於民國[年]月[日]向聲請人借款新臺幣[金額]元，約定應於民國[年]月[日]清償。詎屆期經聲請人多次催討，相對人均置之不理，尚欠前揭金額未還...\n\n謹狀\n臺灣[地區]地方法院民事庭 公鑒\n聲請人：[簽名蓋章]\n中華民國 年 月 日`
        });
        return;
      }

      setAiTriageResult({
        category: isCardFraud ? 'CRIMINAL_COMPLAINT_FRAUD' : 'UNIVERSAL_AI_PLEADING',
        recommendedToolId: isCardFraud ? 'CRIMINAL_COMPLAINT_FRAUD' : 'UNIVERSAL_AI_PLEADING',
        caseType: isCardFraud ? 'CRIMINAL_PUBLIC' : 'CIVIL',
        litigationNatureText: isCardFraud ? '⚡ 刑事非告訴乃論（公訴罪，檢警知悉即應主動偵辦）' : '💼 純民事事件（民事損害賠償/調解，無刑事責任）',
        legalBasis: isCardFraud 
          ? ['刑法第339條（詐欺取財罪）', '刑法第30條（幫助犯）', '洗錢防制法第15條之2（交付帳戶罪）', '刑法第339條之4（加重詐欺罪）']
          : ['民法第184條（侵權行為損害賠償）', '民法第767條（物上請求權）'],
        isPublicProsecution: isCardFraud ? true : false,
        timeLimit: isCardFraud 
          ? '【非告訴乃論（公訴罪）】檢警知悉即應主動追訴偵辦；請把握黃金時間立即掛失帳戶並向警局報案！'
          : '民事侵權請求權時效為 2 年（民法第197條）',
        plainExplanation: isCardFraud
          ? '因求職、貸款等話術誤將提款卡或密碼寄出，涉及洗錢防制法人頭帳戶交付罪及詐欺罪幫助犯，此類犯罪均屬【非告訴乃論公訴罪】。為防止名下帳戶遭警示凍結並自證清白，必須立即搶先掛失並主動至警局報案說明。'
          : `針對您的情況「${q}」，系統已啟動全能法律實務診斷，為您彙整法規要件與訴訟程序。`,
        suggestedActions: isCardFraud
          ? [
              '立即致電發卡銀行 24H 客服辦理掛失停卡與止付，阻斷不法金流進出',
              '將假求職/假貸款之完整通訊軟體對話截圖、超商寄件小白單或宅配單據印出',
              '主動前往轄區派出所報案並取得「受處理案件證明單」，自證無交付人頭帳戶犯罪故意',
              '具狀向管轄地檢署陳報「被騙交付金融卡刑事答辯/自白陳報狀」爭取不起訴處分'
            ]
          : [
              '第一時間保全相關物證、通訊軟體截圖與錄音紀錄',
              '向主管機關、司法警察機關或管轄地院具狀提出',
              '使用法律工具箱產製專屬合法書狀'
            ],
        evidenceChecklist: isCardFraud
          ? [
              '通訊軟體完整對話紀錄截圖（包含對方誘騙寄卡理由、寄件超商門市/收件人資訊及時間戳記）',
              '超商物流交寄單據、快遞託運單存根聯或寄件包裹編號紀錄',
              '當初吸引接觸之虛假徵才貼文、貸款代辦廣告、簡訊截圖或社團網址',
              '該涉案銀行帳戶存摺封面、近期交易明細及向銀行申請掛失止付之相關憑證'
            ]
          : ['相關合約或通訊截圖', '出入紀錄或監視器影像', '被害人身分證明文件'],
        pleadingDraft: isCardFraud
          ? `刑事陳報暨答辯狀\n\n案號：臺灣地方法院檢察署[填寫案號] 股別：[填寫股別]\n陳報人（即被告/告訴人）：[姓名]\n案由：為涉嫌洗錢防制法及詐欺取財案件，主動具狀陳報案發經過，依法聲請不起訴處分事：\n\n事實與理由：\n一、陳報人因求職/辦理貸款誤信詐騙集團話術，遭詐騙交付提款卡...\n二、陳報人於知悉受騙後，第一時間即向銀行掛失停卡並主動報警，絕無幫助詐欺或洗錢之故意...\n三、懇請 檢察官明察，賜予不起訴處分。`
          : `民事起訴狀暨訴求說明書\n\n案由：針對「${q}」之民事損害賠償與權益主張\n原告/具狀人：[請填寫姓名]\n被告/相對人：[請填寫姓名]\n\n事實與理由：\n原告面臨「${q}」之具體權益侵害情事，特具狀依法請求民事損害賠償與返還。`
      });
    } finally {
      setAiTriageLoading(false);
    }
  };

  // --- 快捷標籤 localStorage helpers ---
  const QUICK_TAG_STORAGE_KEY = "legal_guide_tag_order";
  const QUICK_TAG_CLICK_KEY = "legal_guide_tag_clicks";

  type QuickTagItem = { label: string; tool: "litigation" | "legalToolbox"; tag: string };

  const ALL_CORE_TAGS: QuickTagItem[] = [
    { label: "車禍求償", tool: "litigation", tag: "traffic_accident" },
    { label: "家事糾紛", tool: "litigation", tag: "family_dispute" },
    { label: "欠款追討", tool: "legalToolbox", tag: "debt_collection" },
    { label: "詐騙受害", tool: "litigation", tag: "fraud_victim" },
    { label: "租屋爭議", tool: "litigation", tag: "rental_dispute" },
    { label: "勞動爭議", tool: "legalToolbox", tag: "labor_dispute" },
  ];

  const EXTENDED_TAGS: QuickTagItem[] = [
    { label: "離婚", tool: "litigation", tag: "divorce" },
    { label: "遺產繼承", tool: "litigation", tag: "inheritance" },
    { label: "過失傷害", tool: "litigation", tag: "negligence" },
    { label: "職場霸凌", tool: "legalToolbox", tag: "workplace_bullying" },
    { label: "家暴保護令", tool: "legalToolbox", tag: "domestic_violence" },
    { label: "人頭帳戶", tool: "litigation", tag: "money_mule" },
    { label: "卡債", tool: "legalToolbox", tag: "credit_card_debt" },
    { label: "遷讓房屋", tool: "litigation", tag: "eviction" },
  ];


  const saveTagClicks = (clicks: Record<string, number>) => {
    try { localStorage.setItem(QUICK_TAG_CLICK_KEY, JSON.stringify(clicks)); } catch {}
  };

  const loadTagOrder = (): string[] | null => {
    try { return JSON.parse(localStorage.getItem(QUICK_TAG_STORAGE_KEY) || "null"); } catch { return null; }
  };

  const saveTagOrder = (order: string[]) => {
    try { localStorage.setItem(QUICK_TAG_STORAGE_KEY, JSON.stringify(order)); } catch {}
  };

  const getSortedCoreTags = (clicks: Record<string, number>): QuickTagItem[] => {
    const saved = loadTagOrder();
    const tagMap = new Map(ALL_CORE_TAGS.map(t => [t.tag, t]));
    if (saved && saved.length === ALL_CORE_TAGS.length) {
      return saved.filter(t => tagMap.has(t)).map(t => tagMap.get(t)!);
    }
    return [...ALL_CORE_TAGS].sort((a, b) => (clicks[b.tag] || 0) - (clicks[a.tag] || 0));
  };

  // 熱門關鍵字快捷搜尋（核心6標籤，按使用頻率排序）
  const CORE_TAGS: QuickTagItem[] = getSortedCoreTags(loadTagClicks());

  const scenarios: ScenarioItem[] = [
    // 0. 性侵害 / 妨害性自主 / 伴侶非自願性行為
    {
      id: 'sexual-assault-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      title: '遭到性侵 / 被伴侶（女友/男友）強迫非自願性行為 / 妨害性自主',
      plainDesc: '遭受他人或親密伴侶（女友/男友/同居人）違反意願強迫性交。臺灣刑法第221條男女平等受保護，且為「非告訴乃論公訴罪」，不受6個月告訴乃論限制，檢警知悉即應依法主動追訴。請把握72小時黃金期一站式驗傷採證，可提出刑事告訴並同步聲請保護令與民事求償。',
      situation: '遭受違反意願之性行為、伴侶不顧拒絕強行發生關係、面臨恐嚇或有身體擦挫傷、或持有對話承認紀錄。',
      recommendedAction: '使用「妨害性自主罪刑事告訴狀」向地檢署提出告訴，並可同步聲請「親密關係伴侶民事保護令」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
      feeInfo: '刑事告訴 0 元；可撥打 113 全國保護專線或申請法律扶助基金會免費律師扶助',
      timeInfo: '非告訴乃論（公訴罪）無6個月限制；但醫院DNA採證黃金期為「72小時內」，請勿沐浴更衣直接前往急診採證',
      mustPrepare: ['公私立醫院一站式性侵害驗傷採證診斷證明書', '通訊軟體（LINE/簡訊）案發前後對話紀錄與自承道歉截圖', '案發時衣物、錄音光碟、心理諮商或精神科門診就醫證明'],
      tags: [
        '性侵', '被性侵', '女友性侵', '男友性侵', '伴侶性侵', '強暴', '強制性交', 
        '妨害性自主', '非自願性行為', '違反意願', '女友', '男友', '被我女友性侵', 
        '我被我女友性侵了', '親密暴力', '驗傷單', '113', '性侵告訴'
      ]
    },
    // 0.1 親密關係暴力 / 恐怖情人保護令
    {
      id: 'domestic-violence-protection-order',
      category: 'SAFETY',
      icon: HeartHandshake,
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-400',
      title: '親密關係暴力 / 恐怖情人恐嚇騷擾與肢體攻擊（聲請保護令）',
      plainDesc: '遭受男女朋友、同居伴侶或前任暴力攻擊、恐嚇威脅、跟蹤騷擾或強迫性行為。可依家庭暴力防治法第63條之1（恐怖情人條款），向法院聲請保護令，命相對人遠離住居所與工作地至少100公尺，並禁止騷擾與通訊。',
      situation: '男女朋友或同居人施以肢體暴力、性暴力、恐嚇威脅、瘋狂傳送騷擾訊息。',
      recommendedAction: '向地方法院聲請「親密關係伴侶民事保護令」，並向警局報案取得受處理案件證明單。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER',
      feeInfo: '保護令聲請免徵裁判費（0 元）',
      timeInfo: '隨時可具狀向法院聲請，情況緊急可由警方協助聲請緊急保護令',
      mustPrepare: ['醫院急診驗傷診斷證明書影本', '恐嚇騷擾之 LINE 截圖、錄音錄影與通聯紀錄', '警察局受處理家庭暴力事件紀錄表'],
      tags: ['家暴', '保護令', '恐怖情人', '親密暴力', '跟蹤騷擾', '被打', '威脅', '女友家暴', '男友家暴', '家庭暴力防治法', '暫時保護令']
    },
    // 0.2 侵害性自主權民事損害賠償
    {
      id: 'civil-tort-sexual-assault',
      category: 'SAFETY',
      icon: Scale,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
      title: '性侵害 / 妨害性自主請求精神慰撫金與醫療損害賠償',
      plainDesc: '遭受性侵害或非自願性行為導致身心人格權遭受重大創傷。依民法第184條及第195條，可向法院提起民事訴訟，請求加害人賠償非財產上精神慰撫金、心理諮商費與醫療復健支出。',
      situation: '刑事案件偵辦中或起訴後，欲向加害者求償精神慰撫金與醫療復健費用。',
      recommendedAction: '產製「侵害性自主權損害賠償民事起訴狀」，或於刑事庭審理中提出刑事附帶民事訴訟（免裁判費）。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CIVIL_TORT_SEXUAL_ASSAULT',
      feeInfo: '刑事起訴後提附帶民事免裁判費；獨立民事起訴依請求金額徵收裁判費',
      timeInfo: '民事侵權時效：知悉損害及賠償義務人起 2 年內，或行為後 10 年內',
      mustPrepare: ['精神科診斷證明書與心理諮商收據單據', '相關刑事告訴狀、筆錄或判決資料', '案發事實與對話截圖證物'],
      tags: ['性侵求償', '精神慰撫金', '慰撫金', '妨害性自主民事', '侵權行為', '心理諮商費', '損害賠償']
    },
    // 0.3 遭伴侶/同居人/他人竊盜、侵占或盜領
    {
      id: 'theft-embezzlement-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-amber-500/20 to-red-500/20 border-amber-500/30 text-amber-400',
      title: '被女友/男友/同居人/他人竊盜財物、盜領存摺或侵占不還',
      plainDesc: '伴侶、同居人或他人未經同意拿走現金、偷拿存摺印章盜領存款、盜刷信用卡、或借用貴重物品（筆電/名牌包/車輛）拒不返還。一般伴侶為非告訴乃論公訴罪（刑法§320竊盜、§335侵占）；若為同居親屬依刑法§324須於6個月內提告。可具狀提告並請求物上返還與賠償。',
      situation: '發現財物失竊、銀行存款被伴侶擅自提領、或借用之貴重物品被霸佔不歸還。',
      recommendedAction: '使用「竊盜罪/侵占罪刑事告訴狀」向地檢署提告，並可產製「返還所有物民事起訴狀」民事求償。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_THEFT',
      feeInfo: '刑事提告 0 元；民事返還起訴依訴訟標的徵收裁判費',
      timeInfo: '一般人/非同居伴侶為公訴罪隨時可偵辦；同居伴侶/親屬為告訴乃論「6個月內」必須具狀提出',
      mustPrepare: ['失竊/遭侵占物品購買發票、原廠盒裝保卡或照片', '住處監視器畫面或大樓出入監控紀錄', '通訊軟體催討對話截圖（被告承認拿取/道歉對話）', '銀行存摺明細或ATM盜領影像'],
      tags: [
        '竊盜', '被竊盜', '偷竊', '被偷', '女友竊盜', '男友竊盜', '被我女友竊盜了', 
        '我被我女友竊盜了', '同居人偷錢', '盜領', '盜刷', '侵占', '侵占財物', 
        '東西不還', '偷拿存摺', '偷拿印章', '偷錢', '偷手機', '小偷', '親屬竊盜'
      ]
    },
    // 0.4 遭受恐嚇威脅與強制
    {
      id: 'intimidation-threat-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400',
      title: '遭受他人或恐怖情人言語恐嚇、傳訊威脅或強迫限制自由',
      plainDesc: '對方以言詞、文字訊息（如揚言加害生命、身體、家人、名譽或毀損財物）恐嚇威脅，致心生畏懼。依刑法第305條恐嚇危害安全罪或第304條強制罪，向地檢署提出告訴，並可向警局聲請告誡或保護令。',
      situation: '收到恐嚇簡訊、電話中揚言對當事人不利、遭強行阻擋去路或強迫做無義務之事。',
      recommendedAction: '提出「恐嚇危害安全罪刑事告訴狀」，並可同步聲請親密關係保護令。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_INTIMIDATION',
      feeInfo: '刑事提告 0 元',
      timeInfo: '恐嚇罪為非告訴乃論公訴罪，檢警知悉即應主動追訴',
      mustPrepare: ['恐嚇文字通訊軟體（LINE/簡訊）完整截圖', '電話錄音光碟與譯文', '警局報案證明單'],
      tags: ['恐嚇', '威脅', '被威脅', '恐怖情人', '恐嚇簡訊', '揚言打人', '強制罪', '妨害自由']
    },
    // 0.5 偷拍、妨害秘密與散布性影像
    {
      id: 'privacy-sexual-image-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
      title: '遭偷拍窺視、竊錄私密部位、或遭威脅散布性私密影像',
      plainDesc: '遭人無故偷拍更衣沐浴、竊錄私密活動，或前任/他人揚言外流散布私密照。刑法第315條之1妨害秘密罪及第319條之3未經同意散布性影像罪（重刑公訴罪），檢警得緊急扣押並向法院聲請銷毀刪除。',
      situation: '發現被裝針孔偷拍、被偷拍裙底、或對方以私密照片作為威脅籌碼。',
      recommendedAction: '提出「妨害秘密/散布性影像刑事告訴狀」，並請求檢察官扣押相關設備與雲端檔案。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_PRIVACY',
      feeInfo: '刑事提告 0 元',
      timeInfo: '散布性私密影像為非告訴乃論重罪；妨害秘密為6個月告訴乃論',
      mustPrepare: ['偷拍設備照片、發現針孔位置照片', '散布網址、群組對話截圖與檔案傳輸紀錄', '遭恐嚇外流之對話證據'],
      tags: ['偷拍', '妨害秘密', '散布私密照', '性私密影像', '針孔', '私密照威脅', '外流']
    },
    // 0.6 民事請求返還所有物與侵權求償
    {
      id: 'civil-restitution-property',
      category: 'DEBT',
      icon: Scale,
      color: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 text-emerald-400',
      title: '物品被侵占/借走不還（請求返還所有物與金錢損害賠償）',
      plainDesc: '個人所有之貴重物品、名車、珠寶或生財器具被他人無權占有或霸佔拒還。依民法第767條物上請求權與第184條侵權行為，向法院起訴請求返還原物，若原物已滅失或毀損，則請求金錢等價賠償。',
      situation: '物品借給朋友/伴侶後對方霸佔不還、或遭他人無權侵占處分。',
      recommendedAction: '寄發「催告返還存證信函」或提起「返還所有物民事起訴狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CIVIL_TORT_GENERAL',
      feeInfo: '依返還標的物之市價核算民事裁判費（約1%~1.5%）',
      timeInfo: '民事侵權時效為 2 年，物上返還請求權時效為 15 年（不動產無消滅時效）',
      mustPrepare: ['購買發票、所有權證明或出資購買流水帳', '雙方催討返還之對話紀錄與存證信函', '物品被他人占有使用之照片或證物'],
      tags: ['物上請求權', '所有物返還', '東西不還', '侵占物品', '返還財物', '損害賠償']
    },
    // 1. 車禍事故
    {
      id: 'car-accident-injury',
      category: 'ACCIDENT',
      icon: Car,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      title: '發生車禍有人受傷（對方不賠償/想告過失傷害）',
      plainDesc: '車禍造成受傷，對方態度消極不賠償。可在「6個月內」向地檢署或警察局提出刑事過失傷害告訴，迫使對方出面調解，並於刑事起訴後提出「附帶民事訴訟」免繳裁判費求償。',
      situation: '車禍發生後 6 個月內、有醫院驗傷單、對方拒絕和解或賠償金額談不攏。',
      recommendedAction: '使用「車禍過失傷害刑事告訴狀」提告，並準備「刑事附帶民事起訴狀」求償醫療費與車損。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_TRAFFIC',
      feeInfo: '提告刑事 0 元（附帶民事訴訟免徵裁判費）',
      timeInfo: '時效極嚴：車禍發生日起「6個月內」必須提出',
      mustPrepare: ['道路交通事故當事人登記聯單 / 初判表', '公私立醫院診斷證明書（載明傷勢）', '醫療收據、修車估價單、行車記錄器影片'],
      tags: ['車禍', '受傷', '過失傷害', '附帶民事', '修車費', '診斷書']
    },
    // 2. 債務催討
    {
      id: 'debt-default-unpaid',
      category: 'DEBT',
      icon: Coins,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      title: '朋友/他人借錢不還（有借據或LINE對話紀錄）',
      plainDesc: '借錢給別人到了還款日一直拖延。先發「存證信函」催告並中斷時效，若對方仍不還，可向法院聲請「支付命令」（僅500元規費、免開庭）或本票裁定，快速取得強制執行名義查封對方薪水與財產。',
      situation: '借款期限已到期、有匯款紀錄/借據/對話紀錄、對方已讀不回或避不見面。',
      recommendedAction: '先寄「借款清償催告存證信函」，屆期不理則聲請「民事支付命令」或「本票裁定」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DEMAND_LETTER_DEBT',
      feeInfo: '存證信函郵資約 100~200 元；法院支付命令聲請費 500 元',
      timeInfo: '借款本金消滅時效為 15 年，但應儘速催討避免對方脫產',
      mustPrepare: ['借據契約或借款LINE對話截圖', '銀行/郵局轉帳匯款明細', '借款人姓名、戶籍地址或身分證字號'],
      tags: ['借錢不還', '借據', '支付命令', '存證信函', '本票', '強制執行', '扣押薪水']
    },
    // 3. 詐騙防禦
    {
      id: 'fraud-scam-victim',
      category: 'FRAUD',
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      title: '遭遇網路詐騙 / 假投資 / 被騙匯款到人頭帳戶',
      plainDesc: '誤信網路投資、交友或網購詐騙，將錢轉入他人帳戶。應立即報警（165圈存），並具狀向地檢署提出「加重詐欺罪刑事告訴狀」，請求檢警清查人頭帳戶、車手與金流，後續提起刑事附帶民事求償。',
      situation: '已將款項匯出、對方失聯封鎖或帳戶被警示。',
      recommendedAction: '提出「網路詐騙/投資詐欺刑事告訴狀」，詳列受款帳號與通訊紀錄。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_FRAUD',
      feeInfo: '刑事告訴 0 元',
      timeInfo: '越快報案越有機會在人頭帳戶被提領前凍結款項',
      mustPrepare: ['所有匯款單據、網銀轉帳成功截圖', '詐騙集團通訊軟體完整對話紀錄', '假投資平台網址、帳號、截圖'],
      tags: ['詐騙', '假投資', '人頭帳戶', '車手', '刑事告訴', '加重詐欺']
    },
    // 3.1 誤將提款卡/存摺寄給詐騙集團（人頭帳戶與洗錢防禦）
    {
      id: 'fraud-card-sent-victim',
      category: 'FRAUD',
      icon: ShieldAlert,
      color: 'from-red-600/20 to-rose-600/20 border-red-500/40 text-red-400',
      title: '誤把銀行提款卡/存摺寄給詐騙集團（求職/貸款被騙，防止變人頭帳戶）',
      plainDesc: '因假求職、假貸款、租借帳戶或虛擬幣兼職，誤將提款卡、密碼、存摺以超商賣貨便或快遞寄出。這有高度風險淪為「詐欺幫助犯」及「洗錢防制法人頭帳戶」並遭列警示帳戶！必須黃金時間採 3 步驟：立即掛失停卡、前往警局報案並取得受理案件證明單、保留完整對話截圖以自證無犯罪故意。',
      situation: '已把金融卡或密碼寄給對方、對方稱要美化金流或測試帳戶後失聯。',
      recommendedAction: '1. 立即致電銀行 24H 客服掛失 2. 備齊對話紀錄至派出所報案自首/說明 3. 具狀向地檢署陳報「刑事自白/被騙陳報狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_FRAUD',
      feeInfo: '掛失停卡 0 元；警局報案 0 元',
      timeInfo: '「極度緊急」：必須在該帳戶有被害人受騙匯入變成「警示帳戶」前立即辦理掛失與報案！',
      mustPrepare: ['假貸款/假求職的完整通訊軟體（LINE/FB）招募對話截圖', '超商寄件小白單、包裹配送單號憑證', '銀行掛失紀錄與警局報案受處理案件證明單'],
      tags: [
        '我把卡片寄給詐騙集團了', '卡片寄給詐騙', '寄卡片', '寄提款卡', '寄存摺', '把卡片寄出', 
        '卡片被騙', '寄提款卡給詐騙集團', '買簿子', '人頭帳戶', '警示帳戶', '洗錢防制法', 
        '假求職寄卡', '假貸款寄卡', '被當人頭帳戶', '幫助詐欺'
      ]
    },
    // 4. 家事與遺產
    {
      id: 'inheritance-and-will',
      category: 'FAMILY',
      icon: HeartHandshake,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      title: '長輩過世分遺產 / 算特留分 / 拋棄繼承 / 預立自書遺囑',
      plainDesc: '長輩過世面對遺產分配爭議，或長輩生前想立合法遺囑。系統提供法定應繼分與特留分試算、自書遺囑合規模板（民法1190條要件防呆）、以及負債大於財產時的拋棄繼承聲請狀（3個月內）。',
      situation: '長輩身故分配遺產、被剝奪繼承權想爭取特留分、或過世長輩負債大於遺產。',
      recommendedAction: '使用「法定繼承系統表與應繼分試算」，或產生「拋棄繼承聲請狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'INHERITANCE_CALCULATOR',
      feeInfo: '拋棄繼承家事法院規費 1,000 元',
      timeInfo: '拋棄繼承必須在「知悉得繼承之日起 3 個月內」向法院提出',
      mustPrepare: ['被繼承人死亡證明書或除戶戶籍謄本', '全體繼承人現戶戶籍謄本與繼承系統表', '印鑑證明與印鑑章（拋棄繼承用）'],
      tags: ['遺產', '繼承', '特留分', '應繼分', '自書遺囑', '拋棄繼承', '分產']
    },
    // 5. 兩願離婚與侵害配偶權
    {
      id: 'divorce-spousal-rights',
      category: 'FAMILY',
      icon: HeartHandshake,
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400',
      title: '夫妻協議離婚 / 配偶出軌外遇求償（侵害配偶權）',
      plainDesc: '雙方同意平順離婚，需簽署具備兩位見證人的標準離婚協議書，並約定子女監護、探視與剩餘財產分配；若配偶與第三者外遇交往，可提起民事侵害配偶權起訴狀請求連帶精神慰撫金。',
      situation: '協議和平離婚辦理登記，或蒐集到外遇出軌證據請求精神賠償。',
      recommendedAction: '產製標準「兩願離婚協議書」或「侵害配偶權民事起訴狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DIVORCE_AGREEMENT',
      feeInfo: '協議離婚戶政登記規費數十元；侵害配偶權民事訴訟依請求金額徵收裁判費',
      timeInfo: '侵害配偶權時效：知悉損害及賠償義務人起 2 年內，或行為後 10 年內',
      mustPrepare: ['戶口名簿與身分證', '未成年子女監護與扶養費協議內容', '外遇對話紀錄、出遊照片、旅館發票或承認外遇錄音'],
      tags: ['離婚協議書', '監護權', '扶養費', '侵害配偶權', '外遇', '出軌', '精神慰撫金']
    },
    // 6. 高齡長輩防掏空
    {
      id: 'elderly-guardianship',
      category: 'ELDERLY',
      icon: UserCheck,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
      title: '長輩失智/中風/無法自理（防被騙賣房或財產被掏空）',
      plainDesc: '長輩患有失智症或意識不清，擔心遭有心人士誘騙過戶房屋、提領存款或借貸。向法院聲請「監護宣告」（完全無判斷力）或「輔助宣告」（輕度失智），由法院指定監護人管理財產並由親屬會同開具清冊，徹底鎖死名下資產。',
      situation: '長輩診斷出中重度失智（CDR≥1）、中風臥床、無法辨識法律行為效果。',
      recommendedAction: '產生「民事監護宣告聲請狀」或「民事輔助宣告聲請狀」，向法院家事庭聲請。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'GUARDIANSHIP_PETITION',
      feeInfo: '家事法院聲請費 1,000 元（需配合法院指定醫院精神鑑定，鑑定費約 1~2 萬元由聲請人代墊）',
      timeInfo: '自具狀至法院裁定約需 3~6 個月',
      mustPrepare: ['長輩之公私立醫院診斷證明書（載明失智程度/心智狀況）', '長輩與聲請人戶籍謄本', '全體推定繼承人同意書與財產清冊（房屋土地權狀、存摺）'],
      tags: ['失智', '監護宣告', '輔助宣告', '防掏空', '意定監護', '老人財產']
    },
    // 7. 租屋糾紛與買賣裝潢
    {
      id: 'rental-and-defect',
      category: 'CONTRACT',
      icon: Home,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      title: '房客欠租不搬 / 房東亂扣押金 / 裝潢工程瑕疵延宕',
      plainDesc: '房客積欠租金達 2 個月以上經催告仍不付，可寄發存證信函終止租約並請求搬遷；買賣房屋漏水或裝潢工程施工偷工減料，依法發函限期修補，逾期得解除契約或雇工代修求償。',
      situation: '房客欠租扣抵押金後滿2個月、租約到期賴著不走、或裝潢施工出現重大瑕疵。',
      recommendedAction: '寄發「積欠租金催告暨終止租約存證信函」或「工程瑕疵限期修補存證信函」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DEMAND_LETTER_RENT_DEFAULT',
      feeInfo: '郵局存證信函每份郵資約 100~200 元',
      timeInfo: '瑕疵通知後 6 個月內需行使權利',
      mustPrepare: ['租賃契約書或工程承攬合約書', '欠租金額計算表、催告簡訊紀錄', '瑕疵照片、影片、第三方驗屋報告或修繕估價單'],
      tags: ['租屋', '欠租', '終止租約', '存證信函', '裝潢瑕疵', '押金', '房屋買賣']
    },
    // 8. 收到法院判決要上訴
    {
      id: 'court-appeal-litigation',
      category: 'LITIGATION',
      icon: Scale,
      color: 'from-amber-500/20 to-yellow-500/20 border-yellow-500/30 text-yellow-400',
      title: '收到法院判決書不服（想要提上訴 / 算20天上訴期）',
      plainDesc: '收到地方法院判決後如果對結果不服，必須在「判決送達後 20 日內」提出上訴狀。一站式上訴系統可自動拆解原判決的認定缺失、法條適用錯誤與理由不備，直接生成具體上訴理由書。',
      situation: '剛收到法院寄來的民事或刑事一審判決書、想在法定期間內聲明上訴。',
      recommendedAction: '進入「訴訟與上訴一站式中心」，先試算 20 天死線，再匯入判決書自動產製上訴理由狀。',
      targetToolId: 'litigation',
      targetSubTab: 'appeal',
      feeInfo: '上訴民事二審需依訴訟標的繳納裁判費（約本金1.5%），刑事上訴免裁判費',
      timeInfo: '極度緊急：判決合法送達次日起算「20 日內」必須提出上訴狀！',
      mustPrepare: ['法院一審判決書全文（PDF或文字）', '判決書送達證書或郵差投遞簽收日期', '原審未被採納之重要證據或有利證人名單'],
      tags: ['上訴', '判決書', '20天死線', '上訴理由書', '原判決違背法令', '二審']
    },
    // 9. 檢查律師或對造書狀有無假法條
    {
      id: 'doc-ai-anti-ghost',
      category: 'CHECKER',
      icon: FileCheck2,
      color: 'from-emerald-500/20 to-green-500/20 border-green-500/30 text-green-400',
      title: '收到對方律師書狀或判決（想查案號真偽 / AI防幽靈檢核）',
      plainDesc: '對方提告提出的書狀、或自己準備的法律文件，擔心引用了不存在的「假案號」或「過期幽靈法條」。使用司法院真實裁判資料庫比對，1秒抓出虛構判決與法律錯誤。',
      situation: '準備向法院遞狀前自我檢查，或審閱對造當事人提出之答辯狀與引證判例。',
      recommendedAction: '使用「司法院判決檢索與 AI 真確性檢核」，貼上文字一鍵掃描。',
      targetToolId: 'checker',
      targetSubTab: 'antiGhost',
      feeInfo: '免費檢核',
      timeInfo: '即時檢核（約 1~2 秒完成）',
      mustPrepare: ['欲檢核之書狀、答辯狀或合約文字'],
      tags: ['檢核', '防幽靈法條', '假判決', '司法院檢索', '案號查證', 'AI查核']
    }
  ];

  const categories = [
    { id: 'ALL', label: '全部生活情境' },
    { id: 'SAFETY', label: '🛡️ 性侵/家暴/人身安全' },
    { id: 'ACCIDENT', label: '🚗 車禍求償' },
    { id: 'DEBT', label: '💰 借錢欠款' },
    { id: 'FRAUD', label: '⚠️ 詐騙被騙' },
    { id: 'FAMILY', label: '👨‍👩‍👧 離婚遺產' },
    { id: 'ELDERLY', label: '🧓 高齡安養' },
    { id: 'CONTRACT', label: '🏠 租屋契約' },
    { id: 'LITIGATION', label: '⚖️ 訴訟上訴' },
    { id: 'CHECKER', label: '🔍 查假法條' }
  ];

  // 智慧關鍵字與自然語意比對
  const filteredScenarios = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();

    return scenarios.filter(s => {
      const matchCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
      if (!matchCategory) return false;
      if (!rawQuery) return true;

      // 1. 直覺欄位包含檢索
      if (
        s.title.toLowerCase().includes(rawQuery) ||
        s.plainDesc.toLowerCase().includes(rawQuery) ||
        s.situation.toLowerCase().includes(rawQuery) ||
        s.tags.some(t => t.toLowerCase().includes(rawQuery))
      ) {
        return true;
      }

      // 2. 逆向標籤比對（例：使用者輸入整句「我填寫我被我女友性侵了」包含標籤「性侵」、「女友性侵」、「被我女友性侵」）
      if (s.tags.some(t => t.length >= 2 && rawQuery.includes(t.toLowerCase()))) {
        return true;
      }

      // 3. 語句斷詞過濾無效助詞後比對
      const cleaned = rawQuery.replace(/[我你他在了的個被有想請幫忙怎辦如何？?，。！!、\s]+/g, ' ');
      const tokens = cleaned.split(' ').filter(tok => tok.length >= 2);
      if (tokens.some(tok => 
        s.title.toLowerCase().includes(tok) || 
        s.plainDesc.toLowerCase().includes(tok) || 
        s.tags.some(t => t.toLowerCase().includes(tok))
      )) {
        return true;
      }

      return false;
    });
  }, [scenarios, selectedCategory, searchQuery]);

  // 判斷是否呈現人身安全/性侵緊急求助指引卡片
  const isSafetyQuery = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return selectedCategory === 'SAFETY' || 
      ['性侵', '強暴', '強制性交', '妨害性自主', '女友性侵', '男友性侵', '保護令', '家暴', '親密暴力', '恐怖情人'].some(kw => q.includes(kw));
  }, [searchQuery, selectedCategory]);

  const handleLaunchScenario = (scenario: ScenarioItem) => {
    if (scenario.targetToolId === 'legalToolbox' && scenario.targetSubTool) {
      onSelectTool('legalToolbox', undefined, { preselectedToolId: scenario.targetSubTool });
    } else {
      onSelectTool(scenario.targetToolId, scenario.targetSubTab);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Hero Banner: 非法律人友善引導 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 md:p-10 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide">
              <Compass className="w-3.5 h-3.5" />
              非法律專業專用 · 生活情境智能導診
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              您遇到什麼法律問題？<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300">
                點選生活情境，3 秒找到解答與標準書狀
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              不用背艱澀法條！直接選擇您發生的狀況，系統以白話文引導您了解
              <span className="text-amber-300 font-semibold">「何時提告、要花多少錢、該準備哪些證物」</span>，並依循司法實務規則一鍵產製具法律效力的合規書狀。
            </p>

            {/* 即時智慧搜尋欄 */}
            <div className="pt-2">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-slate-400" />
                <textarea rows={4}
                  
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && searchQuery.trim()) {
                      e.preventDefault();
                      handleRunAiTriage(searchQuery);
                    }
                  }}
                  placeholder="輸入任何法律問題或狀況，例如：被女友竊盜了、車禍受傷、房客欠租、朋友借錢、收到判決..."
                  className="w-full pl-12 pr-44 py-3.5 min-h-[120px] resize-y rounded-2xl bg-slate-950/80 border border-indigo-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      清除
                    </button>
                  )}
                  <button
                    onClick={() => handleRunAiTriage(searchQuery)}
                    disabled={!searchQuery.trim() || aiTriageLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 診斷與產狀</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <Scale className="w-96 h-96 text-indigo-400" />
          </div>
        </div>

        {/* AI 即時動態導診橫幅（當有輸入內容時突顯） */}
        {searchQuery.trim().length > 0 && (
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-purple-950/70 to-slate-900 border border-indigo-500/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                <span>AI 全能案件分析與法律書狀一鍵產製</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                針對您輸入的「<span className="text-amber-300 font-semibold">{searchQuery}</span>」，AI 可即時分析適用法條、程序管轄、公訴/告訴乃論時效防呆，並直接生成專屬訴狀草稿。
              </p>
            </div>
            <button
              onClick={() => handleRunAiTriage(searchQuery)}
              disabled={aiTriageLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/40 transition-all flex items-center gap-2 shrink-0 w-full md:w-auto justify-center"
            >
              {aiTriageLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI 正在深入診斷案件...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>立即為「{searchQuery.slice(0, 10)}...」進行 AI 診斷與產狀</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 緊急安全支援指引（當使用者查詢性侵、暴力、保護令時主動顯示） */}
        {isSafetyQuery && (
          <div className="rounded-2xl p-5 bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/50 border border-rose-800/80 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>受害保護與緊急求助指引（男女平等受刑法保護）</span>
              </div>
              <a 
                href="tel:113" 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                撥打 113 保護專線（24小時免費）
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-rose-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" /> 1. 非告訴乃論公訴罪
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  刑法第221條妨害性自主為公訴罪，不受6個月告訴時效限制。不論受害者為男性或女性、不論加害者是否為現任伴侶/女友，法律一律平等究責追訴。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> 2. 72小時驗傷採證黃金期
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  請儘速前往公私立醫院急診進行「一站式性侵害採證」，切勿先行沐浴、刷牙或更換衣物，並將衣物放入紙袋保存DNA生物跡證。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-sky-200 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-sky-400" /> 3. 伴侶保護令與社工陪同
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  受親密伴侶肢體暴力、性暴力或恐嚇騷擾，可依家庭暴力防治法第63條之1聲請保護令；警詢與偵訊時可要求社工全程陪同並隱匿個人身分。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 法律流程引導（互動式表單）橫幅推薦 */}
        <div 
          onClick={() => onSelectTool('processGuide')}
          className="cursor-pointer rounded-2xl p-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-rose-950/60 border border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-950/50 hover:shadow-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-600 text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  法律流程引導精靈（互動式問答與案件過濾）
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  性侵/家暴/人身案件安全篩查
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                不確定自己的遭遇屬於民事或刑事？透過 4 步驟互動問答，自動分析法律屬性、檢查時效與舉證要件，並指引專屬處置路徑。
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <span>開始流程引導</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3大核心捷徑入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => onSelectTool('legalToolbox')}
            className="group cursor-pointer rounded-2xl p-5 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-lg relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {LEGAL_TOOLS.length} 項實用法務
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-indigo-300 transition-colors">
              常用生活法務與契約總匯
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              妨害性自主告訴、親密關係保護令、車禍、借據、存證信函、支付命令、自書遺囑。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              立即前往產生書狀 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>

          <div 
            onClick={() => onSelectTool('litigation')}
            className="group cursor-pointer rounded-2xl p-5 bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all shadow-lg relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Scale className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
                一站式工作台
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-amber-300 transition-colors">
              訴訟與上訴一站式中心
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              判決書智慧上訴、原告/被告防禦、爭點證據整理、法定 20 天期限試算。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              進入訴訟分析系統 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>

          <div 
            onClick={() => onSelectTool('checker')}
            className="group cursor-pointer rounded-2xl p-5 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all shadow-lg relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                司法院 API 整合
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-emerald-300 transition-colors">
              判決檢索與 AI 防幽靈檢核
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              查裁判白話文解讀、書狀一鍵查核「幽靈假法條與假案號」真實性。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              檢驗文件與查判決 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>

        {/* 分類標籤切換 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

          {/* 熱門關鍵字快捷搜尋（核心標籤 + 可展開更多標籤） */}
          <div className="pb-4 border-b border-slate-800/50 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mr-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                快捷搜尋
              </span>
              {CORE_TAGS.map((qt) => (
                <button
                  key={qt.tag}
                  draggable
                  onDragStart={(e) => { setDraggedTag(qt.tag); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedTag || draggedTag === qt.tag) return;
                    const saved = loadTagOrder() || ALL_CORE_TAGS.map(t => t.tag);
                    const fromIdx = saved.indexOf(draggedTag);
                    const toIdx = saved.indexOf(qt.tag);
                    if (fromIdx === -1 || toIdx === -1) return;
                    const newOrder = [...saved];
                    newOrder.splice(fromIdx, 1);
                    newOrder.splice(toIdx, 0, draggedTag);
                    saveTagOrder(newOrder);
                    setDraggedTag(null);
                    window.location.reload();
                  }}
                  onDragEnd={() => setDraggedTag(null)}
                  onClick={() => {
                    const newClicks = { ...tagClicks, [qt.tag]: (tagClicks[qt.tag] || 0) + 1 };
                    setTagClicks(newClicks);
                    saveTagClicks(newClicks);
                    setSearchQuery(qt.label);
                    setSelectedCategory(qt.tag);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-grab active:cursor-grabbing
                    selectedCategory === qt.tag
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 border-slate-700/50 hover:border-indigo-600/50 hover:text-indigo-300"
                  }`}
                >
                  <span className="flex items-center gap-1"><GripVertical className="w-3 h-3 opacity-40" />#{qt.label}</span>
                </button>
              ))}
              {/* 更多標籤折疊按鈕 */}
              <button
                onClick={() => setShowExtendedTags(!showExtendedTags)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center gap-1"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showExtendedTags ? "rotate-180" : ""}`} />
                更多標籤
              </button>
            </div>
            {/* 展開的更多標籤區域 */}
            {showExtendedTags && (
              <div className="flex flex-wrap items-center gap-2 pl-6 animate-in slide-in-from-top-1 duration-200">
                {EXTENDED_TAGS.map((qt) => (
                  <button
                    key={qt.tag}
                    onClick={() => {
                      setSearchQuery(qt.label);
                      setSelectedCategory(qt.tag);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* 生活情境清單 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              常見法律狀況速查指引（共 {filteredScenarios.length} 種生活情境）
            </h2>
            <span className="text-xs text-slate-400">點選卡片查看詳細白話解法與必備文件</span>
          </div>

          {/* 當無靜態情境符合時呈現動態 AI 深度診斷卡 */}
          {filteredScenarios.length === 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/70 border border-indigo-500/40 p-8 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">
                  針對「{searchQuery}」未找到預設情境？
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  別擔心！我國法律體系龐大，系統已配備<strong>全能 AI 法律爭議即時診斷與書狀生成器</strong>。請直接點擊下方按鈕，AI 將依據臺灣實體法與訴訟法為您即時診斷並產製標準書狀！
                </p>
              </div>
              <button
                onClick={() => handleRunAiTriage(searchQuery)}
                disabled={aiTriageLoading}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
              >
                {aiTriageLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>AI 正在深入診斷法律要件...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>立即啟動「{searchQuery}」AI 爭議診斷與書狀產製</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((scenario) => {
              const IconComponent = scenario.icon;
              return (
                <div
                  key={scenario.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all hover:shadow-xl space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${scenario.color} border flex-shrink-0`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-100 leading-snug">
                          {scenario.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {scenario.plainDesc}
                        </p>
                      </div>
                    </div>

                    {/* 資訊摘要 */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate text-slate-400">規費：<strong className="text-slate-200">{scenario.feeInfo.split('（')[0]}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate text-slate-400">時效：<strong className="text-slate-200">{scenario.timeInfo.split('：')[1] || scenario.timeInfo}</strong></span>
                      </div>
                    </div>

                    {/* 標籤 */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scenario.tags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedScenario(scenario)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      白話步驟與準備清單
                    </button>
                    <button
                      onClick={() => handleLaunchScenario(scenario)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      一鍵啟用此工具
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 新手自保 3 大黃金原則 */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-900/40 p-6 space-y-4">
          <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-indigo-400" />
            實務法務重點：非法律人打官司/自保 3 大黃金步驟
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">步驟 1</span>
              <h4 className="font-bold text-slate-200 text-sm">第一時間固定證據</h4>
              <p className="text-slate-400 leading-relaxed">
                車禍立即報警拿初判表、借錢留存對話與金流、外遇截圖存檔。證據越早固定，對方越無法事後卸責狡辯。
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">步驟 2</span>
              <h4 className="font-bold text-slate-200 text-sm">善用低成本非訟程序</h4>
              <p className="text-slate-400 leading-relaxed">
                不要動輒花幾萬元請律師打官司！優先使用「郵局存證信函（中斷時效）」或「法院支付命令（只要500元）」，以最低成本合法要錢。
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">步驟 3</span>
              <h4 className="font-bold text-slate-200 text-sm">切記法定不變期間</h4>
              <p className="text-slate-400 leading-relaxed">
                刑事車禍提告限期「6個月」、收到法院判決上訴限期「20天」、拋棄繼承限期「3個月」。逾期權利直接歸零喪失，萬萬不可拖延！
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 詳細情境說明 Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${selectedScenario.color} border`}>
                  {React.createElement(selectedScenario.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedScenario.title}</h3>
                  <span className="text-xs text-indigo-400 font-semibold">白話法律指引與教戰手冊</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedScenario(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> 什麼時候該用這個？（適用時機）
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedScenario.situation}</p>
              </div>

              <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 律師建議的最佳解法
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedScenario.recommendedAction}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> 法院或行政規費
                  </span>
                  <p className="text-slate-300 text-xs">{selectedScenario.feeInfo}</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 重要法定期間與時效
                  </span>
                  <p className="text-slate-300 text-xs">{selectedScenario.timeInfo}</p>
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> 必備文件與證據清單（請先準備好）
                </span>
                <ul className="space-y-1.5 pl-2">
                  {selectedScenario.mustPrepare.map((item, idx) => (
                    <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              {/* 左側：快捷導引 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const target = selectedScenario;
                    setSelectedScenario(null);
                    onSelectTool('unified');
                  }}
                  className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  查看類似判決
                </button>
                <button
                  onClick={() => {
                    const target = selectedScenario;
                    setSelectedScenario(null);
                    onSelectTool('legalToolbox', undefined, {
                      preselectedToolId: 'UNIVERSAL_AI_PLEADING',
                      prefilledData: {
                        incidentDetails: target.situation
                      }
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  一鍵產書狀
                </button>
              </div>
              {/* 右側：主操作 */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setSelectedScenario(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
                >
                  返回選單
                </button>
                <button
                  onClick={() => {
                    const target = selectedScenario;
                    setSelectedScenario(null);
                    handleLaunchScenario(target);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  立即啟用此工具
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI 全能即時診斷與書狀生成 Modal */}
      {showAiTriageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>AI 全能案件深度法律診斷報告</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                      臺灣實體法與實務規則校準
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    針對爭議：「<strong className="text-slate-200">{searchQuery}</strong>」
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAiTriageModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {aiTriageLoading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">正在連線司法院實務規章與法律知識庫...</p>
                  <p className="text-xs text-slate-400">分析管轄法院、適用法條、追訴時效及起訴/告訴狀標準格式</p>
                </div>
              </div>
            ) : aiTriageResult ? (
              <div className="space-y-5 text-xs md:text-sm">
                {/* 敏感案件保護路徑強制提醒 */}
                {aiTriageResult.protectionNotice && (
                  <div id="triage-sensitive-protection-notice" className="bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 p-4 rounded-2xl shadow-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-rose-300">緊急人身保護與通報提醒</div>
                      <div className="text-xs leading-relaxed">{aiTriageResult.protectionNotice}</div>
                    </div>
                  </div>
                )}

                {/* 適用法條與時效防呆提醒 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-indigo-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" /> 適用實體法依據
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiTriageResult.legalBasis?.map((basis: string, idx: number) => (
                        <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
                          {basis}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={`bg-slate-950/70 p-4 rounded-2xl border space-y-1.5 ${
                    aiTriageResult.caseType === 'CIVIL'
                      ? 'border-blue-900/50'
                      : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                        ? 'border-rose-900/50'
                        : 'border-amber-900/50'
                  }`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      aiTriageResult.caseType === 'CIVIL'
                        ? 'text-blue-400'
                        : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5" /> 訴訟性質與時效警示
                    </span>
                    <p className="text-slate-200 text-xs leading-relaxed font-semibold flex items-center gap-1.5">
                      {aiTriageResult.litigationNatureText || (
                        aiTriageResult.caseType === 'CIVIL'
                          ? '💼 純民事事件（民事損害賠償/調解，無刑事責任）'
                          : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                            ? '⚡ 包含公訴罪 / 非告訴乃論（檢警知悉即應偵辦）'
                            : '⚠️ 刑事告訴乃論（知悉犯人起 6 個月內須具狀提告）'
                      )}
                    </p>
                    <p className="text-slate-400 text-xs">
                      時效說明：{aiTriageResult.timeLimit}
                    </p>
                  </div>
                </div>

                {/* 外部法律資料分組檢索 */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> 法規／裁判／函釋檢索</span>
                    <div className="flex items-center gap-2"><a href="https://www.lawbank.com.tw/SearchResult.aspx" target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:text-sky-300">Lawbank 外部搜尋 ↗</a><span className="text-[10px] text-slate-500">{aiTriageResult.sources?.enabled ? 'tw-legal-rag 外部資料源' : '未啟用外部資料源'}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
                    {([
                      ['statutes', '法規'], ['judgments', '裁判'], ['references', '函釋'], ['literature', '論著']
                    ] as const).map(([key, label]) => (
                      <button key={key} onClick={() => setSourceTab(key)} className={`px-3 py-1.5 rounded-full text-xs border ${sourceTab === key ? 'border-sky-400 text-sky-300 bg-sky-950/50' : 'border-slate-700 text-slate-400'}`}>
                        {label} {(aiTriageResult.sources?.[key] || []).length}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(aiTriageResult.sources?.[sourceTab] || []).length === 0 ? (
                      <p className="text-xs text-slate-500">目前沒有可顯示的結果；查無結果不代表法源不存在。</p>
                    ) : (aiTriageResult.sources[sourceTab] || []).map((source: any, index: number) => (
                      <div key={`${source.citation}-${index}`} className="border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                        <div className="flex items-start justify-between gap-2"><span className="font-semibold text-slate-200">{source.title}</span>{source.status && <span className="text-[10px] text-amber-300">{source.status}</span>}</div>
                        {source.excerpt && <p className="text-xs text-slate-400 leading-relaxed mt-1">{source.excerpt}</p>}
                        {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:text-sky-300">查看來源 ↗</a>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">{aiTriageResult.sources?.disclaimer || '外部資料僅供查考，引用前請閱讀原文與官方來源。'}</p>
                </div>

                {/* 白話診斷分析 */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 白話案情與法律要件剖析
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {aiTriageResult.isSyllogismComplete === false && aiTriageResult.missingQuestions?.length > 0 && (
                      <div className="mb-4 p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                          <ShieldAlert className="w-5 h-5" />
                          <span>⚠️ 關鍵事實補正提醒 (三段論法檢核未通過)</span>
                        </div>
                        <p className="text-slate-300 text-xs">
                          您的案情描述過於簡略，為了確保書狀具備法律效力並符合構成要件，AI 發現以下關鍵事實尚未釐清：
                        </p>
                        <ul className="space-y-3 mt-2">
                          {aiTriageResult.missingQuestions.map((q: any, i: number) => {
                            const currentAnswer = syllogismAnswers[i] || { option: '', text: '' };
                            return (
                            <li key={i} className="text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                              <div className="font-bold text-amber-300 mb-1">Q: {q.question}</div>
                              <div className="text-slate-400 mb-2">📝 {q.reason}</div>
                              
                              {q.options && q.options.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <label key={optIdx} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                      <input 
                                        type="radio" 
                                        name={`q-${i}`} 
                                        value={opt}
                                        checked={currentAnswer.option === opt}
                                        onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                        className="mt-0.5 accent-indigo-500"
                                      />
                                      <span className="text-slate-300">{opt}</span>
                                    </label>
                                  ))}
                                  <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                    <input 
                                      type="radio" 
                                      name={`q-${i}`} 
                                      value="自行輸入"
                                      checked={currentAnswer.option === '自行輸入'}
                                      onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                      className="mt-0.5 accent-indigo-500"
                                    />
                                    <span className="text-slate-300">其他 (自行輸入)</span>
                                  </label>
                                </div>
                              )}

                              {(!q.options || q.options.length === 0 || currentAnswer.option === '自行輸入') && (
                                <textarea
                                  placeholder="請在此回答補齊關鍵事實..."
                                  value={currentAnswer.text}
                                  onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, text: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white focus:border-indigo-500 outline-none resize-y min-h-[60px]"
                                />
                              )}
                            </li>
                          )})}
                        </ul>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => {
                              const appended = Object.values(syllogismAnswers)
                                .map((ans: any) => {
                                  if (ans.option === '自行輸入' || !ans.option) return ans.text;
                                  return ans.option + (ans.text ? ` (${ans.text})` : '');
                                })
                                .filter(Boolean)
                                .join("\n");

                              if (appended) {
                                setSearchQuery(searchQuery + "\n補充說明：\n" + appended);
                                setShowAiTriageModal(false);
                                setTimeout(() => handleRunAiTriage(searchQuery + "\n補充說明：\n" + appended), 300);
                              }
                            }}
                            className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md"
                          >
                            送出補充事實並重新分析
                          </button>
                        </div>
                        <div className="text-xs text-rose-300 mt-2 font-medium">
                          * 建議：請關閉此視窗，在上方輸入框補充上述資訊後再次診斷，或點擊下方直接產生「待補正」之書狀。
                        </div>
                      </div>
                    )}
                    {aiTriageResult.plainExplanation}
                  </p>
                </div>
                
                <LegalSourcesDisplay 
                  sources={aiTriageResult.sources}
                  isExternal={aiTriageResult.isExternalRetrievalUsed}
                  statusMessage={aiTriageResult.retrievalStatusMessage}
                  allowedCitations={aiTriageResult.allowedCitations}
                />

                {/* 建議行動與必備證據 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> 建議進行之法律行動
                    </span>
                    <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                      {aiTriageResult.suggestedActions?.map((act: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-sky-400 font-bold">{idx + 1}.</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> 關鍵證據保全清單
                    </span>
                    <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                      {aiTriageResult.evidenceChecklist?.map((evi: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{evi}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Anti-Ghost Verification Badge Bar */}
                {aiTriageResult.antiGhostVerification && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> 法律引用檢查報告
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium">
                        比對 {aiTriageResult.antiGhostVerification.totalCitationsChecked} 處引述 · 0 處明顯幽靈虛構
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiTriageResult.antiGhostVerification.verifiedCitations.map((c: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700"
                          title={c.officialSnippet}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {c.officialTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* 自動生成的專屬訴狀草稿預覽 */}
                {aiTriageResult.pleadingDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> AI 即時生成合規起訴/告訴狀草稿
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiTriageResult.pleadingDraft);
                          setCopiedDraft(true);
                          setTimeout(() => setCopiedDraft(false), 2000);
                        }}
                        className="text-xs text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/60 transition-colors"
                      >
                        {copiedDraft ? '✓ 已複製到剪貼簿' : '複製完整書狀'}
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                      {aiTriageResult.pleadingDraft}
                    </pre>
                  </div>
                )}

          {/* 底部導引與按鈕 */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            {/* 左側：快捷導引 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onSelectTool('unified');
                }}
                className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                查看類似判決
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onSelectTool('legalToolbox', undefined, {
                    preselectedToolId: 'UNIVERSAL_AI_PLEADING',
                    prefilledData: { incidentDetails: '' }
                  });
                }}
                className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
              >
                <FileSignature className="w-3.5 h-3.5" />
                一鍵產書狀
              </button>
            </div>
            {/* 右側：主操作 */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedCategory('ALL');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                關閉
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedCategory('ALL');
                  onSelectTool('litigation');
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                進入法律工具箱
              </button>
            </div>
          </div>
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                  {/* 左側：快捷導引按鈕 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setShowAiTriageModal(false);
                        onSelectTool("unified");
                      }}
                      className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      查看類似判決
                    </button>
                    <button
                      onClick={() => {
                        setShowAiTriageModal(false);
                        onSelectTool("legalToolbox", undefined, {
                          preselectedToolId: "UNIVERSAL_AI_PLEADING",
                          prefilledData: {
                            incidentDetails: searchQuery
                          }
                        });
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      一鍵產書狀
                    </button>
                  </div>
                  {/* 右側：主操作 */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setShowAiTriageModal(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
                    >
                      關閉
                    </button>
                    <button
                      onClick={() => {
                        const recTool = aiTriageResult.recommendedToolId || "UNIVERSAL_AI_PLEADING";
                        setShowAiTriageModal(false);
                        onSelectTool("legalToolbox", undefined, { 
                          preselectedToolId: recTool,
                          prefilledData: {
                            incidentDetails: searchQuery,
                            pleadingText: aiTriageResult.pleadingDraft
                          }
                        });
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>進入法律工具箱編輯並產製此書狀</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          {/* 跨功能快捷導航列 */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-800/50 to-indigo-900/30 border border-slate-600/30">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-slate-300">快速導航</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate?.('unified')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium transition-all border border-indigo-500/30"
              >
                <Scale className="w-3 h-3 inline mr-1" />
                判決分析
              </button>
              <button
                onClick={() => onNavigate?.('legalToolbox')}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-medium transition-all border border-purple-500/30"
              >
                <FileText className="w-3 h-3 inline mr-1" />
                法律工具箱
              </button>
            </div>
          </div>

          </div>
        </div>
      )}
    </div>
  );
};