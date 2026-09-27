/**
 * 追訴時效的適用性判斷。
 *
 * 告訴乃論與公訴罪是刑事制度的概念。把它掛在民事案件上，
 * 會讓使用者誤以為自己的租賃或契約糾紛面臨刑事追訴時限。
 * 這裡把「這個案件該顯示哪一種時效」集中成一個具名判斷，
 * 讓元件與測試共用同一份規則。
 */

/** 會適用刑事追訴時效的案件類別。 */
const CRIMINAL_CATEGORIES: ReadonlyArray<string> = [
  'SEXUAL_ASSAULT',
  'DOMESTIC_VIOLENCE',
  'DIGITAL_SEX_CRIME',
  'PROPERTY_CRIME',
  'TRAFFIC_ACCIDENT',
  'LABOR_DISPUTE',
  'GENERAL_CRIMINAL'
];

export interface ProsecutionLimitation {
  /** 徽章文字。 */
  label: string;
  tone: 'criminal-public' | 'criminal-private' | 'civil';
}

/**
 * 判斷案件該套用哪一種時效說明。
 * @param primaryCategory 案件的主要類別
 * @param isPublicProsecution 是否為非告訴乃論（公訴罪）
 */
export function describeProsecutionLimitation(
  primaryCategory: string,
  isPublicProsecution: boolean
): ProsecutionLimitation {
  if (!CRIMINAL_CATEGORIES.includes(primaryCategory)) {
    return { label: '民事請求權時效：一般15年，侵權行為2年', tone: 'civil' };
  }
  return isPublicProsecution
    ? { label: '非告訴乃論（公訴罪）', tone: 'criminal-public' }
    : { label: '告訴乃論（注意6個月時效）', tone: 'criminal-private' };
}
