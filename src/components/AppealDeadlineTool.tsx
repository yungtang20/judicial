import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Calendar,
  Clock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Copy,
  Check,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  Calculator,
  HelpCircle,
  Building2,
  FileText
} from 'lucide-react';

// 訴訟類型定義
type LitigationType = 'criminal' | 'civil' | 'administrative';

// 救濟程序類型
type RemedyType = 'appeal12' | 'appeal23' | 'interlocutory' | 'retrial';

// 常用在途期間參考資料（依司法院「法院訴訟當事人在途期間標準」）
const TRAVEL_DAYS_OPTIONS = [
  { label: '同一行政區 / 所在地法院 (0天)', days: 0 },
  { label: '同縣市不同區 / 鄰近縣市 (2天)', days: 2 },
  { label: '跨中長程縣市 (如基隆-台中) (3天)', days: 3 },
  { label: '跨長程縣市 (如台北-高雄) (4天)', days: 4 },
  { label: '花蓮、台東、澎湖等地區 (5天)', days: 5 },
  { label: '金門、馬祖等離島地區 (8天)', days: 8 },
];

// 法定救濟期間數據總表（對照司法院標準）
const STATUTORY_RULES = {
  criminal: {
    title: '刑事訴訟救濟法定期間',
    codeRef: '刑事訴訟法',
    color: 'border-indigo-600 bg-indigo-50/50 text-indigo-900',
    badgeBg: 'bg-indigo-600 text-white',
    rules: [
      {
        proc: '第一審判決上訴二審',
        periodDays: 20,
        article: '刑事訴訟法第 349 條',
        desc: '自收到判決正本送達之翌日起算 20 日內提出上訴狀。',
        reasonPeriod: '上訴期間屆滿後 20 日內補提（刑事訴訟法§361條第2項）',
      },
      {
        proc: '第二審判決上訴第三審',
        periodDays: 20,
        article: '刑事訴訟法第 349 條、第 382 條',
        desc: '自收到判決正本送達之翌日起算 20 日內提出上訴狀。',
        reasonPeriod: '提起上訴後 20 日內補提上訴理由書（刑事訴訟法§382條第1項）',
      },
      {
        proc: '裁定提出抗告',
        periodDays: 10,
        article: '刑事訴訟法第 406 條',
        desc: '自裁定送達之翌日起算 10 日內提出抗告狀。',
        reasonPeriod: '原則上抗告狀應一併附具理由',
      },
      {
        proc: '聲請再審（救濟確定判決）',
        periodDays: 0, // 無期間限制
        article: '刑事訴訟法第 420 條以下',
        desc: '為受判決人之利益聲請再審者，無時間限制，隨時得為之。',
        reasonPeriod: '隨時得備具理由具狀聲請',
      },
    ]
  },
  civil: {
    title: '民事訴訟救濟法定期間',
    codeRef: '民事訴訟法',
    color: 'border-amber-600 bg-amber-50/50 text-amber-900',
    badgeBg: 'bg-amber-600 text-white',
    rules: [
      {
        proc: '第一審判決上訴二審',
        periodDays: 20,
        article: '民事訴訟法第 440 條',
        desc: '自判決送達之翌日起算 20 日之不變期間內提出上訴狀。',
        reasonPeriod: '上訴狀未表明理由者，得於上訴後補提或依法院命補正期限',
      },
      {
        proc: '第二審判決上訴第三審',
        periodDays: 20,
        article: '民事訴訟法第 481 條準用第 440 條、第 471 條',
        desc: '自判決送達之翌日起算 20 日之不變期間內提出上訴狀。',
        reasonPeriod: '提起上訴後 20 日內未補提理由，第三審法院得逕以裁定駁回（民訴§471）',
      },
      {
        proc: '裁定提出抗告',
        periodDays: 10,
        article: '民事訴訟法第 486 條第 1 項',
        desc: '自裁定送達之翌日起算 10 日之不變期間內提出抗告狀。',
        reasonPeriod: '抗告狀應表明抗告理由',
      },
      {
        proc: '提起再審之訴',
        periodDays: 30,
        article: '民事訴訟法第 500 條',
        desc: '應於 30 日之不變期間內提起（自判決確定時或知悉再審理由起算）。',
        reasonPeriod: '再審訴狀應表明再審理由',
      },
    ]
  },
  administrative: {
    title: '行政訴訟救濟法定期間',
    codeRef: '行政訴訟法',
    color: 'border-emerald-600 bg-emerald-50/50 text-emerald-900',
    badgeBg: 'bg-emerald-600 text-white',
    rules: [
      {
        proc: '地方行政庭 / 高等行政法院判決上訴',
        periodDays: 20,
        article: '行政訴訟法第 241 條',
        desc: '自判決送達之翌日起算 20 日之不變期間內提出上訴狀。',
        reasonPeriod: '提起上訴後 20 日內提出上訴理由書（行政訴訟法§245條第1項）',
      },
      {
        proc: '高等行政法院上訴最高行政法院',
        periodDays: 20,
        article: '行政訴訟法第 241 條、第 245 條',
        desc: '自判決送達之翌日起算 20 日之不變期間內提出上訴狀。',
        reasonPeriod: '提起上訴後 20 日內補提上訴理由書（未補提者逕裁定駁回）',
      },
      {
        proc: '裁定提出抗告',
        periodDays: 10,
        article: '行政訴訟法第 268 條',
        desc: '自裁定送達之翌日起算 10 日之不變期間內提出抗告狀。',
        reasonPeriod: '抗告狀應一併附具理由',
      },
      {
        proc: '提起再審之訴',
        periodDays: 30,
        article: '行政訴訟法第 276 條',
        desc: '應於 30 日之不變期間內提起（自判決確定或知悉再審理由時起算）。',
        reasonPeriod: '再審訴狀應一併表明再審理由',
      },
    ]
  }
};

import { isWeekendOrHoliday, getNextWorkingDay, calculateDeadline } from '../lib/deadlineCalculator';

export default function AppealDeadlineTool() {
  const [litigationType, setLitigationType] = useState<LitigationType>('criminal');
  const [remedyType, setRemedyType] = useState<RemedyType>('appeal12');

  // 日期設定（預設為今天）
  const today = new Date();
  const [recvYear, setRecvYear] = useState<number>(today.getFullYear() - 1911);
  const [recvMonth, setRecvMonth] = useState<number>(today.getMonth() + 1);
  const [recvDay, setRecvDay] = useState<number>(today.getDate());

  // 在途期間設定
  const [travelDays, setTravelDays] = useState<number>(0);

  // 聲明上訴日期（用於補提理由書計算，選填）
  const [appealNoticeYear, setAppealNoticeYear] = useState<number | ''>('');
  const [appealNoticeMonth, setAppealNoticeMonth] = useState<number | ''>('');
  const [appealNoticeDay, setAppealNoticeDay] = useState<number | ''>('');

  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 輔助陣列
  const years = Array.from({ length: 15 }, (_, i) => 110 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // 計算邏輯
  const getJSDate = (y: number | '', m: number | '', d: number | '') => {
    if (y === '' || m === '' || d === '') return null;
    const date = new Date(Number(y) + 1911, Number(m) - 1, Number(d));
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const formatROCDate = (date: Date | null) => {
    if (!date) return '無效日期';
    const rocYear = date.getFullYear() - 1911;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeekStr = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getDay()];
    return `民國 ${rocYear} 年 ${month} 月 ${day} 日 (${dayOfWeekStr})`;
  };

  const formatSimpleROC = (date: Date | null) => {
    if (!date) return '';
    return `${date.getFullYear() - 1911}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 取得救濟期間天數
  const getStatutoryDays = () => {
    if (remedyType === 'interlocutory') return 10;
    if (remedyType === 'retrial') return 30;
    return 20; // appeal12, appeal23
  };

  // 計算核心
  const recvDate = getJSDate(recvYear, recvMonth, recvDay);
  const statutoryDays = getStatutoryDays();

  // 初日不算 (民法第120條第2項)，第一天從送達翌日開始
  const startDate = recvDate ? new Date(recvDate.getTime() + 1 * 24 * 60 * 60 * 1000) : null;

  // 法定天數 + 在途期間
  const totalDays = statutoryDays + Number(travelDays);

  // 試算未順延末日
  const rawEndDate = recvDate ? new Date(recvDate.getTime() + totalDays * 24 * 60 * 60 * 1000) : null;

  // 遇假日順延後最終末日
  const deferredResult = rawEndDate ? getNextWorkingDay(rawEndDate) : { date: null, deferredDays: 0 };
  const finalEndDate = deferredResult.date;

  // 倒數天數計算
  const getDaysLeft = () => {
    if (!finalEndDate) return null;
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const finalZero = new Date(finalEndDate.getFullYear(), finalEndDate.getMonth(), finalEndDate.getDate());
    const diffTime = finalZero.getTime() - todayZero.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysLeft = getDaysLeft();

  // 補提上訴理由書推算（刑事一升二、刑事二升三、民事二升三、行政上訴）
  const appealNoticeDate = getJSDate(appealNoticeYear, appealNoticeMonth, appealNoticeDay);

  const getReasonDeadline = () => {
    if (!recvDate) return null;

    if (litigationType === 'criminal' && remedyType === 'appeal12') {
      // 刑事一審上訴二審：上訴期間(20日+在途)屆滿後 20 日內補提 -> 即送達後 40日 + 在途
      const rawReasonEnd = new Date(recvDate.getTime() + (40 + Number(travelDays)) * 24 * 60 * 60 * 1000);
      return getNextWorkingDay(rawReasonEnd).date;
    }

    if (appealNoticeDate) {
      // 聲明上訴日後 20 日 + 在途
      const rawReasonEnd = new Date(appealNoticeDate.getTime() + (20 + Number(travelDays)) * 24 * 60 * 60 * 1000);
      return getNextWorkingDay(rawReasonEnd).date;
    }

    return null;
  };

  const reasonDeadlineDate = getReasonDeadline();

  // 下載圖卡
  const handleDownload = () => {
    if (!containerRef.current || !finalEndDate) return;
    const filenameDate = `${finalEndDate.getFullYear() - 1911}${(finalEndDate.getMonth() + 1).toString().padStart(2, '0')}${finalEndDate.getDate().toString().padStart(2, '0')}`;

    html2canvas(containerRef.current, {
      backgroundColor: '#F8FAFC',
      scale: 2,
    }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `${filenameDate}_法定上訴救濟期間試算表.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  };

  // 複製文字結果
  const handleCopyText = () => {
    if (!recvDate || !finalEndDate) return;

    const litName = litigationType === 'criminal' ? '刑事訴訟' : litigationType === 'civil' ? '民事訴訟' : '行政訴訟';
    const remName = remedyType === 'appeal12' ? '第一審判決上訴第二審' : remedyType === 'appeal23' ? '第二審判決上訴第三審' : remedyType === 'interlocutory' ? '裁定提出抗告' : '再審之訴';

    const text = `【${litName} - ${remName} 法定救濟期間試算結果】
判決/裁定送達日期：${formatROCDate(recvDate)}
法定期間：${statutoryDays} 日（初日不算，自送達翌日起算）
扣除在途期間：${travelDays} 日
未順延末日：${formatROCDate(rawEndDate)}
順延後最終救濟期限：${formatROCDate(finalEndDate)} ${deferredResult.deferredDays > 0 ? `(原末日遇假日，自動順延 ${deferredResult.deferredDays} 天至次一工作日)` : ''}
${reasonDeadlineDate ? `補提上訴理由書最晚期限：${formatROCDate(reasonDeadlineDate)}` : ''}

法律依據：司法院規範與民法第120條、第122條；相關各訴訟法救濟期間規定。
（本試算結果僅供遞狀時程參考，請務必提早遞狀避免爭議）`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentRules = STATUTORY_RULES[litigationType];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* 標題與簡介 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              ⚖️ 上訴與救濟法定期間對照表暨智慧計算系統
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              依據司法院「訴訟須知」標準與民刑事及行政訴訟法，精準計算判決上訴、裁定抗告與理由書補提期限
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>💡 法定算日三大黃金法則：</strong>
            <span className="text-slate-300 ml-1">
              ① <strong>初日不算（始日不計）</strong>：收到裁判當日為第 0 天，隔日開始起算；② <strong>扣除在途期間</strong>：不在法院所在地者得扣除在途天數；③ <strong>末日遇假日順延</strong>：期間最後一日若為星期六、日或國定假日，自動順延至次一工作日。
            </span>
          </div>
        </div>
      </div>

      {/* 訴訟類別頁籤導航 (刑事 / 民事 / 行政) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setLitigationType('criminal')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              litigationType === 'criminal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            刑事訴訟
          </button>

          <button
            type="button"
            onClick={() => setLitigationType('civil')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              litigationType === 'civil'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            民事訴訟
          </button>

          <button
            type="button"
            onClick={() => setLitigationType('administrative')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              litigationType === 'administrative'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            行政訴訟
          </button>
        </div>

        <div className="text-2xs font-bold text-slate-500 font-mono px-3 py-1 bg-slate-100 rounded-lg">
          參照標準：司法院訴訟須知 & {currentRules.codeRef}
        </div>
      </div>

      {/* 第一部分：司法院對照表 (Statutory Period Matrix) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            【{currentRules.title}】法定救濟期間檢視總表
          </h2>
          <a
            href="https://www.judicial.gov.tw/tw/lp-165-1.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
          >
            司法院官方訴訟須知 🔗
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentRules.rules.map((rule, idx) => (
            <div key={idx} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">{rule.proc}</span>
                  <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${currentRules.badgeBg}`}>
                    {rule.periodDays > 0 ? `${rule.periodDays} 日` : '無限制'}
                  </span>
                </div>
                <div className="text-2xs font-mono text-indigo-700 font-bold mb-2">
                  {rule.article}
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  {rule.desc}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-3xs text-slate-700 font-medium space-y-1">
                <span className="font-bold text-slate-900 block">📝 補提理由書說明：</span>
                <span>{rule.reasonPeriod}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 第二部分：動態計算器主體 */}
      <div ref={containerRef} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                智慧法定期間精密試算器
              </h3>
              <p className="text-2xs text-slate-500">輸入判決/裁定送達日期，系統將自動套用始日不計、在途期間與例假日順延規則</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已複製試算結果' : '複製結果'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              下載圖卡
            </button>
          </div>
        </div>

        {/* 表單參數選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. 救濟程序類型 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              1. 選擇擬進行之救濟程序
            </label>
            <select
              value={remedyType}
              onChange={(e) => setRemedyType(e.target.value as RemedyType)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="appeal12">第一審判決上訴第二審 (法定 20 日)</option>
              <option value="appeal23">第二審判決上訴第三審 (法定 20 日)</option>
              <option value="interlocutory">對裁定提出抗告 (法定 10 日)</option>
              <option value="retrial">提起再審之訴 (法定 30 日不變期間)</option>
            </select>
          </div>

          {/* 2. 收到裁判日期 (送達日) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              2. 收到裁判正本日期 (送達日)
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={recvYear}
                onChange={(e) => setRecvYear(Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-2 text-xs font-bold bg-slate-50"
              >
                {years.map((y) => (
                  <option key={y} value={y}>民國 {y} 年</option>
                ))}
              </select>
              <select
                value={recvMonth}
                onChange={(e) => setRecvMonth(Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-2 text-xs font-bold bg-slate-50"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m} 月</option>
                ))}
              </select>
              <select
                value={recvDay}
                onChange={(e) => setRecvDay(Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-2 text-xs font-bold bg-slate-50"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d} 日</option>
                ))}
              </select>
            </div>
            <div className="text-3xs text-slate-500">
              例如：法院掛號信件蓋印簽收當日、或寄達郵局寄存之日期
            </div>
          </div>

          {/* 3. 在途期間扣除 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              3. 在途期間天數 (依司法院標準)
            </label>
            <select
              value={travelDays}
              onChange={(e) => setTravelDays(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {TRAVEL_DAYS_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-3xs text-slate-500">
              若住居所非在受理上訴之法院同一行政區，可加計在途天數
            </div>
          </div>
        </div>

        {/* 選填：聲明上訴日期（用於二審上訴三審/刑事一審上訴二審推算理由書） */}
        {(remedyType === 'appeal23' || (litigationType === 'criminal' && remedyType === 'appeal12')) && (
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
            <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              選填：已提出「聲明上訴狀」日期（用於精準推算補提上訴理由書期限）
            </div>
            <div className="flex items-center gap-2">
              <select
                value={appealNoticeYear}
                onChange={(e) => setAppealNoticeYear(e.target.value === '' ? '' : Number(e.target.value))}
                className="border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white"
              >
                <option value="">-- 未聲明 / 尚未遞狀 --</option>
                {years.map((y) => (
                  <option key={y} value={y}>民國 {y} 年</option>
                ))}
              </select>
              {appealNoticeYear !== '' && (
                <>
                  <select
                    value={appealNoticeMonth}
                    onChange={(e) => setAppealNoticeMonth(e.target.value === '' ? 1 : Number(e.target.value))}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white"
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>{m} 月</option>
                    ))}
                  </select>
                  <select
                    value={appealNoticeDay}
                    onChange={(e) => setAppealNoticeDay(e.target.value === '' ? 1 : Number(e.target.value))}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d} 日</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        )}

        {/* 第三部分：試算結果大卡片 */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-md">
                試算結論卡片
              </span>
              <h4 className="text-lg font-bold text-white mt-1">
                【{STATUTORY_RULES[litigationType].title}】最終法定救濟期限
              </h4>
            </div>

            {/* 倒數天數提示 */}
            {daysLeft !== null && (
              <div
                className={`px-4 py-2 rounded-xl border font-bold text-xs flex items-center gap-2 ${
                  daysLeft < 0
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    : daysLeft <= 3
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                {daysLeft < 0
                  ? `已逾期 ${Math.abs(daysLeft)} 天（請盡快尋求法律救濟）`
                  : daysLeft === 0
                  ? '⚠️ 今日即為最後截止日！請於今日法院下班前遞狀'
                  : `距離最後期限尚有 ${daysLeft} 天`}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 送達日 */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
              <div className="text-3xs text-slate-400 font-bold">裁判送達日期</div>
              <div className="text-sm font-bold text-white font-mono">{formatROCDate(recvDate)}</div>
              <div className="text-3xs text-slate-400">初日不算（始日不計規則）</div>
            </div>

            {/* 計算依據天數 */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
              <div className="text-3xs text-slate-400 font-bold">合計可用期間</div>
              <div className="text-sm font-bold text-amber-400 font-mono">
                {statutoryDays} 日 (法定) + {travelDays} 日 (在途) = {totalDays} 天
              </div>
              <div className="text-3xs text-slate-400">基本救濟天數加計扣除在途</div>
            </div>

            {/* 順延後最終期限 */}
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-4 rounded-xl border border-indigo-500/50 space-y-1 md:col-span-2 lg:col-span-1">
              <div className="text-3xs text-amber-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 最終應遞狀截止期限
              </div>
              <div className="text-base md:text-lg font-bold text-amber-300 font-mono">
                {formatROCDate(finalEndDate)}
              </div>
              {deferredResult.deferredDays > 0 ? (
                <div className="text-3xs text-emerald-300 font-medium">
                  原末日 ({formatSimpleROC(rawEndDate)}) 為例假日，自動順延 {deferredResult.deferredDays} 日至次一工作日
                </div>
              ) : (
                <div className="text-3xs text-slate-300 font-medium">未逢例假日，正常於該日截止</div>
              )}
            </div>
          </div>

          {/* 補提上訴理由書延伸提示 */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              📄 上訴理由書補提期限指引：
            </h5>
            <div className="text-xs text-slate-300 leading-relaxed space-y-1">
              {litigationType === 'criminal' && remedyType === 'appeal12' && (
                <p>
                  • <strong>刑事一審上訴二審</strong>：依刑事訴訟法第361條，未於上訴狀敘述理由者，應於上訴期間屆滿後 <strong>20日內</strong> 補提上訴理由書。
                  {reasonDeadlineDate && (
                    <span className="block mt-1 text-amber-300 font-bold font-mono">
                      👉 補提上訴理由書最晚期限：{formatROCDate(reasonDeadlineDate)}
                    </span>
                  )}
                </p>
              )}

              {remedyType === 'appeal23' && (
                <p>
                  • <strong>上訴第三審（法律審）</strong>：提起上訴後未於上訴狀表明理由者，應於提起上訴後 <strong>20日內</strong> 補提上訴理由書（逾期將遭直接裁定駁回）。
                  {reasonDeadlineDate ? (
                    <span className="block mt-1 text-amber-300 font-bold font-mono">
                      👉 依您輸入之聲明上訴日推算，補提上訴理由書最晚期限：{formatROCDate(reasonDeadlineDate)}
                    </span>
                  ) : (
                    <span className="block mt-1 text-slate-400 italic">
                      （請於上方選擇「已聲明上訴日期」，即可精準計算理由書最晚補提期限）
                    </span>
                  )}
                </p>
              )}

              {remedyType === 'interlocutory' && (
                <p>
                  • <strong>抗告程序</strong>：對裁定不服提出抗告，抗告期間為 <strong>10日</strong>，原則上應於抗告狀中一併述明理由以利抗告法院審查。
                </p>
              )}

              {remedyType === 'retrial' && (
                <p>
                  • <strong>再審程序</strong>：再審之訴應於 <strong>30日之不變期間</strong> 內提起，再審訴狀必須敘明再審理由及法律依據（民訴§500、行政訴訟法§276）。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 免責與遞狀溫馨提醒 */}
        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong>⚠️ 遞狀實務溫馨提醒與聲明：</strong>
            <p className="text-2xs text-amber-900">
              1. 遞交上訴狀或抗告狀，以<strong>「訴狀實際送達法院」</strong>之時間為準（郵寄者以法院簽收日為準，非以郵戳為準，請務必預留 2~3 天郵遞時間）。<br />
              2. 本系統計算邏輯依據民法第 120 條、第 122 條及各訴訟法，僅供訴訟時程規劃參考。如逢特定國定連續假期（如農曆春節、中秋連假等），請以法院實際上班日為準，強烈建議提早 2~3 天完成遞狀！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
