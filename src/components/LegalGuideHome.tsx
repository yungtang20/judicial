import React, { useState, useMemo, useEffect } from 'react';
import { HeroSection } from './guide/HeroSection';
import { DynamicBanner } from './guide/DynamicBanner';
import { EmergencyBanner } from './guide/EmergencyBanner';
import { QuickEntrySection } from './guide/QuickEntrySection';
import { ScenarioList } from './guide/ScenarioList';
import { GoldenRules } from './guide/GoldenRules';
import { GuideModals } from './guide/GuideModals';
import { QUICK_TAGS, SCENARIOS, SCENARIO_CATEGORIES } from './guide/guideData';
import type { ScenarioItem } from './guide/ScenarioDetailModal';
import { filterScenarios, matchesSafetyQuery } from './guide/scenarioSearch';
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

  // 智慧關鍵字與自然語意比對
  const filteredScenarios = useMemo(
    () => filterScenarios(SCENARIOS, selectedCategory, searchQuery),
    [SCENARIOS, selectedCategory, searchQuery]
  );

  // 判斷是否呈現人身安全/性侵緊急求助指引卡片
  const isSafetyQuery = useMemo(
    () => matchesSafetyQuery(searchQuery, selectedCategory),
    [searchQuery, selectedCategory]
  );

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
    sourceTab, setSourceTab, isSafetyQuery, filteredScenarios, SCENARIO_CATEGORIES,
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
