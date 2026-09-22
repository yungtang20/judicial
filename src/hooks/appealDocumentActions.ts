export interface AppealDeadlineParams {
  deliveryDate: string;
  travelDays?: number;
  caseType?: string;
  currentDate?: Date;
}

export interface AppealDeadlineResult {
  declarationDeadline: string;
  reasoningDeadline: string;
  daysLeft: number;
}

export function calculateAppealDeadline(params: AppealDeadlineParams): AppealDeadlineResult {
  const { deliveryDate, travelDays = 0, currentDate = new Date() } = params;

  if (!deliveryDate || deliveryDate.trim() === '') {
    return {
      declarationDeadline: '未知',
      reasoningDeadline: '未知',
      daysLeft: 0,
    };
  }

  const parsed = new Date(deliveryDate);
  if (isNaN(parsed.getTime())) {
    return {
      declarationDeadline: '無效日期',
      reasoningDeadline: '無效日期',
      daysLeft: 0,
    };
  }

  const basePeriod = 20; // 20 days appeal period
  const totalDays = basePeriod + (Number(travelDays) || 0);

  const deadline = new Date(parsed.getTime());
  deadline.setDate(deadline.getDate() + totalDays);

  const formattedDeadline = deadline.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const curTime = currentDate.getTime();
  const diffTime = deadline.getTime() - curTime;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    declarationDeadline: formattedDeadline,
    reasoningDeadline: formattedDeadline,
    daysLeft,
  };
}

export interface FetchJudicialUrlParams {
  targetField: 'first' | 'second';
  firstUrl: string;
  secondUrl: string;
  setTargetJudicialField: (f: 'first' | 'second') => void;
  setIsFetchingUrl: (loading: boolean) => void;
  setUrlFetchSuccessMsg: (msg: string) => void;
  setRawText: (text: string) => void;
  setSecondText: (text: string) => void;
}

export async function fetchJudicialUrl(params: FetchJudicialUrlParams): Promise<void> {
  const {
    targetField,
    firstUrl,
    secondUrl,
    setTargetJudicialField,
    setIsFetchingUrl,
    setUrlFetchSuccessMsg,
    setRawText,
    setSecondText,
  } = params;

  setTargetJudicialField(targetField);
  const targetUrl = targetField === 'second' ? secondUrl : firstUrl;
  if (!targetUrl) return;

  setIsFetchingUrl(true);
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data.text || '';
    const title = data.title || '判決書';

    if (targetField === 'second') {
      setSecondText(text);
    } else {
      setRawText(text);
    }
    setUrlFetchSuccessMsg(`✅ 已自動透過判決書資料庫帶入【${title}】！`);
  } catch (err: any) {
    console.error('Fetch judicial url failed:', err);
  } finally {
    setIsFetchingUrl(false);
  }
}
