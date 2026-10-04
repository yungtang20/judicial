import { describe, expect, it } from 'vitest';
import { CHILD_CUSTODY_ASSESSMENT_CONFIG } from './childCustody';
import { VERIFIED_REAL_STATUTES } from '../citationVerifier';

/**
 * 親權評估量表不得把改寫文字當成官方條文，也不得宣稱量表即法定審酌標準。
 *
 * 實測缺陷（2026-10-02，官方來源：taiwan-legal-db query_regulation 民法第1055-1）：
 * 1. 引文第7項寫成「各期照顧之意願及照顧之持續性」，官方實為
 *    「七、各族群之傳統習俗、文化及價值觀」——以改寫冒充官方條文等同幽靈引用。
 * 2. 說明宣稱「依據民法第1055條之1法定7大審酌標準設計」，但量表實際衡量的是
 *    主要照顧者現況、子女情感依附、善意父母、後援網絡與經濟風險，
 *    與法定7項要件並非逐一對應；使用者會誤認分數即法院酌定結果。
 */
const 官方1055之1 = '法院為前條裁判時，應依子女之最佳利益，審酌一切情狀，尤應注意下列事項：一、子女之年齡、性別、人數及健康情形。二、子女之意願及人格發展之需要。三、父母之年齡、職業、品行、健康情形、經濟能力及生活狀況。四、父母保護教養子女之意願及態度。五、父母子女間或未成年子女與其他共同生活之人間之感情狀況。六、父母之一方是否有妨礙他方對未成年子女權利義務行使負擔之行為。七、各族群之傳統習俗、文化及價值觀。';

describe('親權評估量表的法源忠實度', () => {
  it('引用的第1055條之1條文必須與已查證法源逐字一致', () => {
    expect(VERIFIED_REAL_STATUTES['民法第1055條之1'].officialSummary).toBe(官方1055之1);
  });

  it('指引中的條文不得出現官方沒有的第7項', () => {
    const guideStatute = CHILD_CUSTODY_ASSESSMENT_CONFIG.guide
      .flatMap(entry => entry.statutes || [])
      .find(statute => statute.article === '§1055-1');
    expect(guideStatute).toBeDefined();
    expect(guideStatute?.text).toBe(官方1055之1);
    expect(guideStatute?.text).not.toContain('各期照顧之意願及照顧之持續性');
  });

  it('說明不得宣稱量表即法定7大審酌標準', () => {
    const output = CHILD_CUSTODY_ASSESSMENT_CONFIG.calculate({ primaryCaregiver: 'me' }) as { notice?: string };
    const notice = output.notice || '';
    expect(notice).not.toContain('法定 7 大審酌標準');
    expect(notice).toContain('並非');
    // 法定7項要件仍須如實揭露，讓使用者知道法院實際審酌什麼。
    expect(notice).toContain('各族群之傳統習俗、文化及價值觀');
  });
});
