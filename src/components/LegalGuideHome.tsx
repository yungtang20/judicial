import React, { useState, useMemo, useEffect } from 'react';
import { HeroSection } from './guide/HeroSection';
import { DynamicBanner } from './guide/DynamicBanner';
import { EmergencyBanner } from './guide/EmergencyBanner';
import { QuickEntrySection } from './guide/QuickEntrySection';
import { ScenarioList } from './guide/ScenarioList';
import { GoldenRules } from './guide/GoldenRules';
import { GuideModals } from './guide/GuideModals';
import { LegalSourcesDisplay } from './LegalSourcesDisplay';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';
import { useCaseStore } from '../store/useCaseStore';
import { useToolContext } from '../contexts/ToolContext';
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
  ShieldCheck
} from 'lucide-react';

interface LegalGuideHomeProps {
  onSelectTool: (toolId: string, subTab?: string, initialData?: any) => void;
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

// 治理合規：導診外部來源分組檢索參照與定義（TLR 檢索頁籤：法規／裁判／函釋檢索）
export const TRIAGE_SOURCE_TABS = [
  ['statutes', '法規'],
  ['judgments', '裁判'],
  ['references', '函釋'],
  ['literature', '論著']
] as const;

export const LegalGuideHome: React.FC = () => {
  const { handleSelectTool } = useToolContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
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

  // 熱門關鍵字快捷搜尋
  const QUICK_TAGS = [
    { label: "車禍", tool: "litigation" as const, tag: "traffic" },
    { label: "離婚", tool: "litigation" as const, tag: "divorce" },
    { label: "欠錢", tool: "legalToolbox" as const, tag: "debt" },
    { label: "租屋糾紛", tool: "litigation" as const, tag: "rent" },
    { label: "職場霸凌", tool: "legalToolbox" as const, tag: "labor" },
    { label: "詐騙", tool: "litigation" as const, tag: "fraud" },
    { label: "遺產繼承", tool: "litigation" as const, tag: "inheritance" },
    { label: "過失傷害", tool: "litigation" as const, tag: "negligence" },
  ];

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
      handleSelectTool('legalToolbox', undefined, { preselectedToolId: scenario.targetSubTool });
    } else {
      handleSelectTool(scenario.targetToolId, scenario.targetSubTab);
    }
  };

  const sharedProps = {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    selectedScenario, setSelectedScenario, showAiTriageModal, setShowAiTriageModal,
    aiTriageLoading, setAiTriageLoading, aiTriageResult, setAiTriageResult,
    copiedDraft, setCopiedDraft, syllogismAnswers, setSyllogismAnswers,
    sourceTab, setSourceTab, isSafetyQuery, filteredScenarios, categories,
    QUICK_TAGS, handleRunAiTriage, handleLaunchScenario, handleSelectTool
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900 pb-24">
      <HeroSection {...sharedProps} />
      <DynamicBanner {...sharedProps} />
      <EmergencyBanner {...sharedProps} />
      <QuickEntrySection {...sharedProps} />
      <ScenarioList {...sharedProps} />
      <GoldenRules {...sharedProps} />
      <GuideModals {...sharedProps} />
    </div>
  );
};
export default LegalGuideHome;
